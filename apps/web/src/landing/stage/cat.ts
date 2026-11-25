import * as THREE from "three";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { tokenColor } from "./palette";

// Arandu, from public/models/arandu.glb (built by blender/arandu): feet at the origin, facing +X,
// metres. The clips (sit, walk, jump, tap, read, lie, startle, arch, stretch) key the body bones only; this file drives the face bones:
// the head and eyes follow the pointer, the lids blink, the ears twitch now and then.

export type CatPose = {
  /** 1 while he sits, 0 while he walks or leaps. */
  sit: number;
  /** 0..1, how far through a leap he is: drives the jump clip. */
  leap: number;
  /** Weight of the jump clip: 0 on the ground, 1 in the air. */
  air: number;
  /** Walk cycles done so far: drives the walk clip. */
  stride: number;
  /** 0..1 through the tap clip, which starts and ends sitting; 0 while he does not tap. */
  tap: number;
  /** How far he closes his eyes of his own will, 0..1: a slow blink, a drowsy read. He also blinks on his own. */
  lids: number;
  /** How flat his ears lie, 0..1. */
  ears: number;
  /** How far he has a book up in his paws, 0..1: the read clip takes over from the sit clip. */
  hold: number;
  /** How far he lies down, 0..1: the lie clip takes over from the sit clip, and his head rests. */
  lie: number;
  /** A world point to look at, or null to look around on his own. */
  look: THREE.Vector3 | null;
  /** 0..1 through the startle clip (he jerks upright, tail up), which starts and ends sitting. */
  startle?: number;
  /** 0..1 through the stretch clip (the play bow), which starts and ends sitting. */
  stretch?: number;
  /** Weight of the arch clip, 0..1: cross, crouched with his back humped and his tail lashing. */
  arch?: number;
};

/** Where, through the tap clip, the paw meets the floor: frames 10 and 16 of 32 (blender/arandu/animate.py). */
export const TAP_HITS = [10 / 32, 16 / 32] as const;

export type Cat = {
  /** Place, scale and tilt the cat through this group. */
  root: THREE.Group;
  /** Turn the cat about Y through this group. */
  yaw: THREE.Group;
  /** A point at his mouth, on his head: what he carries goes there. */
  mouth: THREE.Object3D;
  /** Between his paws in the read clip, turned so an open book there faces him. */
  paws: THREE.Object3D;
  update(pose: CatPose, dt: number, time: number): void;
  dispose(): void;
};

type Rig = {
  bone: THREE.Bone;
  rest: THREE.Quaternion;
  inv: THREE.Quaternion;
  dir: THREE.Vector3;
  pos: THREE.Vector3;
  clip?: THREE.Quaternion;
};

/** Between his paws in the read clip, at the foot of the book's spine (m, model frame): ahead and up. */
export const PAWS: [number, number] = [0.26, 0.15];
/** Where his mouth is from his head bone, at rest, in the model's frame (m): ahead and down. */
const MOUTH = new THREE.Vector3(0.09, -0.04, 0);
const AX = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// The lids rest open with their edges 50° above and 52° below the eye's forward axis
// (blender/arandu/build.py); shut, they meet 8° under it.
const LID_UP = THREE.MathUtils.degToRad(58);
const LID_LOW = THREE.MathUtils.degToRad(44);
/** Seconds a blink takes, shut and open again. */
const BLINK = 0.18;

// A black cat on a dark page: a violet rim keeps his outline. The camera is orthographic, so every
// fragment looks straight down -Z.
const RIM = /* glsl */ `
#include <emissivemap_fragment>
float rimFresnel = pow(1.0 - clamp(dot(normal, vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 3.0);
totalEmissiveRadiance += uRimColor * (0.35 * rimFresnel);
`;

function addRim(m: THREE.MeshStandardMaterial, rim: string) {
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = { value: tokenColor(rim) };
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uRimColor;")
      .replace("#include <emissivemap_fragment>", RIM);
  };
  m.customProgramCacheKey = () => `arandu-rim-${rim}`;
}

/** rim: the token his outline glows in; the landing's night room keeps the violet one. */
export function makeCat(gltf: GLTF, rim = "violet-400"): Cat {
  const model = gltf.scene;
  const furs: THREE.SkinnedMesh[] = [];
  model.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    o.frustumCulled = false;
    const m = o.material as THREE.MeshStandardMaterial;
    if (m.name === "AranduFur" && o instanceof THREE.SkinnedMesh) {
      furs.push(o);
      addRim(m, rim);
    }
    if (m.name === "AranduEye") {
      m.emissive = tokenColor("amber-300");
      m.emissiveIntensity = 0.35;
    }
    if (m.name === "AranduGlint") {
      m.emissive = tokenColor("cream-100");
      m.emissiveIntensity = 1;
    }
  });
  const furMesh = furs[0];
  if (!furMesh) throw new Error("arandu.glb has no AranduFur skinned mesh");

  // Rest orientation of every bone, in model space: the model is not placed yet.
  model.updateMatrixWorld(true);
  const rig: Record<string, Rig> = {};
  for (const bone of furMesh.skeleton.bones) {
    const wq = bone.getWorldQuaternion(new THREE.Quaternion());
    rig[bone.name] = {
      bone,
      rest: bone.quaternion.clone(),
      inv: wq.clone().invert(),
      dir: new THREE.Vector3(0, 1, 0).applyQuaternion(wq),
      pos: bone.getWorldPosition(new THREE.Vector3()),
    };
  }

  const head = rig.head;
  if (!head) throw new Error("arandu.glb has no head bone");

  // His mouth: ahead of the head bone and below it, at rest, in metres of the model.
  const mouth = new THREE.Object3D();
  mouth.position.copy(head.bone.worldToLocal(head.pos.clone().add(MOUTH)));
  head.bone.add(mouth);

  // The book's pages face +Z in its own frame: turned to -X, toward him.
  const paws = new THREE.Object3D();
  paws.position.set(PAWS[0], PAWS[1], 0);
  paws.rotation.y = -Math.PI / 2;
  model.add(paws);

  const root = new THREE.Group();
  const yaw = new THREE.Group();
  root.add(yaw);
  yaw.add(model);

  const mixer = new THREE.AnimationMixer(model);
  const act: Record<string, THREE.AnimationAction> = {};
  for (const clip of gltf.animations) {
    const a = mixer.clipAction(clip);
    a.play();
    a.setEffectiveWeight(0);
    act[clip.name] = a;
  }
  for (const name of ["walk", "jump", "tap", "startle", "stretch"]) if (act[name]) act[name].paused = true;

  // Turns about model axes, taken from the bone's rest orientation.
  const tq = new THREE.Quaternion();
  const axis = new THREE.Vector3();
  const turn = (q: THREE.Quaternion, r: Rig, rots: Array<[THREE.Vector3, number]>) => {
    for (const [a, angle] of rots) q.multiply(tq.setFromAxisAngle(axis.copy(a).applyQuaternion(r.inv).normalize(), angle));
  };
  // Face bones are never keyed: pose them from rest.
  const pose = (name: string, rots: Array<[THREE.Vector3, number]>) => {
    const r = rig[name];
    if (r) turn(r.bone.quaternion.copy(r.rest), r, rots);
  };
  // Keyed bones: add to what the clip set this frame. The mixer only writes a bone whose value
  // changed, so update() puts the clip value back first, or the nudges would pile up.
  const nudge = (name: string, rots: Array<[THREE.Vector3, number]>) => {
    const r = rig[name];
    if (!r) return;
    (r.clip ??= new THREE.Quaternion()).copy(r.bone.quaternion);
    turn(r.bone.quaternion, r, rots);
  };

  const look = { yaw: 0, pitch: 0, eyeYaw: 0, eyePitch: 0 };
  const twitch = { L: 0, R: 0, next: 2 };
  // t runs 0..1 through a blink, and rests at 1 between them.
  const blink = { t: 1, next: 2.5 };
  const local = new THREE.Vector3();
  const earAxis = new THREE.Vector3();
  const back = AX.x.clone().negate();

  return {
    root,
    yaw,
    mouth,
    paws,
    update(p, dt, time) {
      for (const r of Object.values(rig)) if (r.clip) r.bone.quaternion.copy(r.clip);
      // A clip played once (tap, startle, stretch) takes over from the others while it runs, eased in and out at its
      // ends; the arch takes over from the rest by its weight.
      const once = (t = 0) => (t > 0 && t < 1 ? smooth(0, 0.1, t) * (1 - smooth(0.9, 1, t)) : 0);
      const tap = once(p.tap);
      const startle = once(p.startle);
      const stretch = once(p.stretch);
      const shot = Math.min(1, tap + startle + stretch);
      const arch = clamp(p.arch ?? 0, 0, 1) * (1 - shot);
      const rest = (1 - shot) * (1 - arch);
      act.sit?.setEffectiveWeight(p.sit * rest * (1 - p.hold) * (1 - p.lie));
      act.read?.setEffectiveWeight(p.sit * rest * p.hold);
      act.lie?.setEffectiveWeight(p.sit * rest * p.lie);
      act.walk?.setEffectiveWeight((1 - p.sit) * (1 - p.air) * rest);
      act.jump?.setEffectiveWeight(p.air * rest);
      act.tap?.setEffectiveWeight(tap);
      act.startle?.setEffectiveWeight(startle);
      act.stretch?.setEffectiveWeight(stretch);
      act.arch?.setEffectiveWeight(arch);
      if (act.walk) act.walk.time = (((p.stride % 1) + 1) % 1) * act.walk.getClip().duration;
      if (act.jump) act.jump.time = clamp(p.leap, 0, 1) * act.jump.getClip().duration;
      if (act.tap) act.tap.time = clamp(p.tap, 0, 0.999) * act.tap.getClip().duration;
      if (act.startle) act.startle.time = clamp(p.startle ?? 0, 0, 0.999) * act.startle.getClip().duration;
      if (act.stretch) act.stretch.time = clamp(p.stretch ?? 0, 0, 0.999) * act.stretch.getClip().duration;
      mixer.update(dt);

      // Head and eyes follow the target; with none he looks around slowly.
      let yawTo = 0.35 * Math.sin(time * 0.4) * Math.sin(time * 0.13);
      let pitchTo = 0.08 * Math.sin(time * 0.31);
      if (p.look) {
        root.updateMatrixWorld(true);
        model.worldToLocal(local.copy(p.look)).sub(head.pos);
        yawTo = clamp(Math.atan2(-local.z, local.x), -1, 1);
        pitchTo = clamp(Math.atan2(local.y, Math.hypot(local.x, local.z)), -0.4, 0.5);
      }
      // He looks around sitting; something he watches, he follows standing too, but not mid-jump.
      // Lying down, his head rests on his paws.
      const follow = (p.look ? 1 - p.air : p.sit) * (1 - p.lie);
      yawTo *= follow;
      pitchTo *= follow;
      const k = Math.min(1, dt * 5);
      look.yaw += (yawTo - look.yaw) * k;
      look.pitch += (pitchTo - look.pitch) * k;
      const ke = Math.min(1, dt * 14);
      look.eyeYaw += (clamp(yawTo - look.yaw * 0.9, -0.35, 0.35) - look.eyeYaw) * ke;
      look.eyePitch += (clamp(pitchTo - look.pitch * 0.9, -0.25, 0.25) - look.eyePitch) * ke;
      const tilt = 0.08 * Math.sin(time * 0.7) * p.sit;
      nudge("neck", [
        [AX.y, look.yaw * 0.35],
        [AX.z, look.pitch * 0.3],
      ]);
      pose("head", [
        [AX.y, look.yaw * 0.55],
        [AX.z, look.pitch * 0.6],
        [AX.x, tilt],
      ]);
      for (const side of ["L", "R"]) {
        pose(`eye${side}`, [
          [AX.y, look.eyeYaw],
          [AX.z, look.eyePitch],
        ]);
      }

      twitch.next -= dt;
      if (twitch.next <= 0) {
        twitch[Math.random() < 0.5 ? "L" : "R"] = 1;
        twitch.next = 2 + Math.random() * 3;
      }
      for (const side of ["L", "R"] as const) {
        twitch[side] = Math.max(0, twitch[side] - dt * 4);
        const r = rig[`ear${side}`];
        const angle = 0.35 * Math.sin(Math.PI * twitch[side]) + 0.95 * clamp(p.ears, 0, 1);
        if (r) pose(`ear${side}`, [[earAxis.copy(r.dir).cross(back).normalize(), angle]]);
      }

      // A blink every few seconds, now and then two in a row.
      blink.next -= dt;
      if (blink.next <= 0) {
        blink.t = 0;
        blink.next = Math.random() < 0.2 ? 0.3 : 2.5 + Math.random() * 4;
      }
      blink.t = Math.min(1, blink.t + dt / BLINK);
      const shut = Math.max(clamp(p.lids, 0, 1), Math.sin(Math.PI * blink.t));
      for (const side of ["L", "R"]) {
        pose(`lidUp${side}`, [[AX.z, -LID_UP * shut]]);
        pose(`lidLow${side}`, [[AX.z, LID_LOW * shut]]);
      }
    },
    dispose() {
      mixer.stopAllAction();
      model.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      });
    },
  };
}
