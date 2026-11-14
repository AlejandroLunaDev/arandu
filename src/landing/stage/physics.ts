import type * as RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three";
import { WALL, type Shape } from "./props";
import { TILT, type Room } from "./rooms";

// Real gravity for the rooms, with Rapier (see docs/adr/0002). Each room is a world of its own, in
// the metres of its content: the shelves and the wall hold, the props fall, tip, roll and get pushed,
// the hanging lamp swings from its cord, the motto's letters give and spring back, and the cat is a
// body that shoves whatever he walks into. A prop that leaves the shelves comes back to its place.

type Rapier = typeof RAPIER;

/** Loads Rapier and its WebAssembly, about 1.6 MB: the stage asks for it once it is up. */
export async function loadRapier(): Promise<Rapier> {
  const R = await import("@dimforge/rapier3d-compat");
  await R.init();
  return R;
}

export type RoomPhysics = {
  /** Re-reads the layout: the lamp's cord, the letters' places, how far a prop may fall. */
  layout(): void;
  /** Puts the cat's body at his feet, `at` in the content's frame, turned by yaw; null takes it away. */
  cat(at: THREE.Vector3 | null, yaw: number): void;
  /** The prop or lamp a mesh belongs to, or null. */
  owner(mesh: THREE.Object3D): THREE.Object3D | null;
  /** Gives a prop a push: a change of speed, in m/s, at a point, both in the content's frame. */
  poke(prop: THREE.Object3D, at: THREE.Vector3, speed: THREE.Vector3): void;
  /**
   * The pointer went from `from` to `to` since the last frame, at velocity `v` (content frame, m/s):
   * if it passed by the hanging lamp's shade, it drags the lamp along.
   */
  sweep(from: THREE.Vector3, to: THREE.Vector3, v: THREE.Vector3): void;
  /** Flicks a letter of the motto up. */
  flick(letter: HTMLElement): void;
  step(dt: number): void;
  dispose(): void;
};

const STEP = 1 / 60;
const MAX_STEPS = 4;
/** Seconds a prop takes to grow back in its place. */
const POP = 0.45;
/** Seconds a prop may lie off the shelves, on the letters or anywhere else, before it goes back. */
const STRAY = 2.5;
/** The letters' spring: about 1.6 swings a second, and a damping that lets them wobble. */
const SPRING = (2 * Math.PI * 1.6) ** 2;
/**
 * How close (m) the pointer must pass to the lamp's shade to drag it, how much of its speed it gives,
 * and the most it gives (m/s): a flick swings the lamp, it never spins it round its cord.
 */
const REACH = 0.3;
const DRAG = 0.25;
const SWING = 1;

const backOut = (t: number) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2;

type Prop = {
  object: THREE.Object3D;
  body: RAPIER.RigidBody;
  home: { p: THREE.Vector3; q: THREE.Quaternion };
  /** 0..1 while it grows back; 1 once it is in place. */
  pop: number;
  /** Seconds it has lain off the shelves. */
  stray: number;
};

type Letter = { el: HTMLElement; body: RAPIER.RigidBody; rest: THREE.Vector3; css: string };

export function roomPhysics(R: Rapier, room: Room): RoomPhysics {
  const world = new R.World({ x: 0, y: -9.81, z: 0 });
  const ground = world.createRigidBody(R.RigidBodyDesc.fixed());

  const collider = (s: Shape, dx = 0, dy = 0, dz = 0) => {
    const desc =
      s.kind === "box"
        ? R.ColliderDesc.cuboid(...s.half)
        : s.kind === "ball"
          ? R.ColliderDesc.ball(s.r)
          : R.ColliderDesc.cylinder(s.half, s.r);
    return desc
      .setTranslation(s.at[0] + dx, s.at[1] + dy, s.at[2] + dz)
      .setDensity(s.density)
      .setFriction(0.7)
      .setRestitution(0.05);
  };

  // The wall every shelf hangs on, and the planks.
  world.createCollider(R.ColliderDesc.cuboid(30, 30, 0.05).setTranslation(0, 0, -WALL - 0.05), ground);
  for (const { object, shapes } of room.fixtures) {
    const p = object.position;
    for (const s of shapes) world.createCollider(collider(s, p.x, p.y, p.z), ground);
  }
  // A prop is off the shelves once it is lower than the lowest plank.
  const lowest = Math.min(...room.fixtures.map((f) => f.object.position.y)) - 0.05;

  const dynamic = (object: THREE.Object3D, shapes: Shape[]) => {
    const { position: p, quaternion: q } = object;
    const body = world.createRigidBody(
      R.RigidBodyDesc.dynamic()
        .setTranslation(p.x, p.y, p.z)
        .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
        .setLinearDamping(0.1)
        .setAngularDamping(0.3)
        .setCcdEnabled(true),
    );
    for (const s of shapes) world.createCollider(collider(s), body);
    return body;
  };

  // The props start asleep, exactly where the room put them, until something touches them.
  const props = new Map<THREE.Object3D, Prop>();
  for (const { object, shapes } of room.props) {
    const body = dynamic(object, shapes);
    body.sleep();
    props.set(object, { object, body, home: { p: object.position.clone(), q: object.quaternion.clone() }, pop: 1, stray: 0 });
  }

  const home = (prop: Prop) => {
    const { body, home: h } = prop;
    body.setTranslation(h.p, false);
    body.setRotation(h.q, false);
    body.setLinvel({ x: 0, y: 0, z: 0 }, false);
    body.setAngvel({ x: 0, y: 0, z: 0 }, false);
    body.sleep();
    prop.pop = 0;
    prop.stray = 0;
  };

  // The hanging lamp: a body on a ball joint under a point that follows the top of its cord.
  const pendant = room.pendant;
  const lamp = pendant && dynamic(pendant.object, pendant.shapes);
  const pivot = pendant && world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased());
  lamp?.setAngularDamping(0.5);
  let joint: RAPIER.ImpulseJoint | null = null;
  let lampX = 0;
  const hang = () => {
    if (!pendant || !lamp || !pivot) return;
    if (joint) world.removeImpulseJoint(joint, false);
    joint = null;
    lamp.setEnabled(pendant.on);
    pivot.setEnabled(pendant.on);
    if (!pendant.on) return;
    const o = pendant.object.position;
    lampX = o.x;
    const length = pendant.top - (o.y - pendant.lift);
    pivot.setTranslation({ x: lampX, y: pendant.top + pendant.lift, z: 0 }, false);
    lamp.setTranslation(o, false);
    lamp.setRotation({ x: 0, y: 0, z: 0, w: 1 }, false);
    lamp.setLinvel({ x: 0, y: 0, z: 0 }, false);
    lamp.setAngvel({ x: 0, y: 0, z: 0 }, false);
    joint = world.createImpulseJoint(R.JointData.spherical({ x: 0, y: 0, z: 0 }, { x: 0, y: length, z: 0 }), pivot, lamp, true);
  };

  // The cat: a box round his body, moved by the stage, never by the world.
  const cat = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setEnabled(false));
  world.createCollider(R.ColliderDesc.cuboid(0.14, 0.16, 0.09).setTranslation(0.04, 0.16, 0).setFriction(0.9), cat);
  let catOn = false;
  const turn = new THREE.Quaternion();
  const UP = new THREE.Vector3(0, 1, 0);

  // The motto's letters: boxes round their ink that float where the page set them, on springs.
  let letters: Letter[] = [];
  const placeLetters = () => {
    for (const l of letters) world.removeRigidBody(l.body);
    letters = [];
    if (room.letters.length === 0) return;
    const a = room.anchor.getBoundingClientRect();
    const kx = room.k;
    const ky = room.k * Math.cos(TILT);
    // Measured where the page set them: clear every letter's motion before reading any.
    for (const el of room.letters) el.style.transform = "";
    // The page may still be bringing the motto in when the physics starts: read its places without
    // that motion, where it comes to rest.
    const line = room.letters[0].closest<HTMLElement>("[data-reveal]");
    const moving = new DOMMatrixReadOnly(line ? getComputedStyle(line).transform : "none");
    for (const el of room.letters) {
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      const left = r.left - moving.m41;
      // The ink of a letter: its box less the leading above and below.
      const top = r.top - moving.m42 + r.height * 0.24;
      const bottom = r.bottom - moving.m42 - r.height * 0.2;
      const rest = new THREE.Vector3((left + r.width / 2 - a.left) / kx, (a.bottom - (top + bottom) / 2) / ky, 0);
      const body = world.createRigidBody(
        R.RigidBodyDesc.dynamic()
          .setTranslation(rest.x, rest.y, 0)
          .setGravityScale(0)
          .enabledTranslations(true, true, false)
          .enabledRotations(false, false, true)
          .setLinearDamping(3)
          .setAngularDamping(3),
      );
      world.createCollider(
        R.ColliderDesc.cuboid((r.width / 2 / kx) * 0.9, (bottom - top) / 2 / ky, 0.06).setDensity(300).setRestitution(0.2),
        body,
      );
      body.sleep();
      letters.push({ el, body, rest, css: "" });
    }
  };

  // The springs pull each letter back to its place and upright, unless it already rests there.
  const springLetters = () => {
    for (const { body, rest } of letters) {
      const p = body.translation();
      const q = body.rotation();
      const dx = p.x - rest.x;
      const dy = p.y - rest.y;
      const angle = 2 * Math.atan2(q.z, q.w);
      if (body.isSleeping() && Math.abs(dx) + Math.abs(dy) < 1e-4 && Math.abs(angle) < 1e-3) continue;
      const v = body.linvel();
      body.setLinvel({ x: v.x - SPRING * dx * STEP, y: v.y - SPRING * dy * STEP, z: 0 }, true);
      body.setAngvel({ x: 0, y: 0, z: body.angvel().z - SPRING * angle * STEP }, true);
    }
  };

  const drawLetters = () => {
    const kx = room.k;
    const ky = room.k * Math.cos(TILT);
    for (const l of letters) {
      const p = l.body.translation();
      const q = l.body.rotation();
      const css = `translate(${((p.x - l.rest.x) * kx).toFixed(2)}px, ${(-(p.y - l.rest.y) * ky).toFixed(2)}px) rotate(${(-2 * Math.atan2(q.z, q.w)).toFixed(4)}rad)`;
      if (css === l.css) continue;
      l.css = css;
      l.el.style.transform = css;
    }
  };

  // Below this a prop has left the screen: the bottom of the pinned scene, and a little more.
  let fall = -3;
  const layout = () => {
    const pin = room.anchor.closest<HTMLElement>("[data-pin]") ?? room.anchor;
    const below = pin.getBoundingClientRect().bottom - room.anchor.getBoundingClientRect().bottom;
    fall = -below / (room.k * Math.cos(TILT)) - 0.6;
    hang();
    placeLetters();
  };
  layout();

  let acc = 0;
  const sync = (dt: number) => {
    for (const prop of props.values()) {
      const { object, body } = prop;
      if (prop.pop < 1) {
        prop.pop = Math.min(1, prop.pop + dt / POP);
        object.scale.setScalar(Math.max(0.001, backOut(prop.pop)));
      }
      const p = body.translation();
      const q = body.rotation();
      object.position.set(p.x, p.y, p.z);
      object.quaternion.set(q.x, q.y, q.z, q.w);
      if (p.y < fall) home(prop);
      else if (p.y < lowest && body.isSleeping()) {
        prop.stray += dt;
        if (prop.stray > STRAY) home(prop);
      } else prop.stray = 0;
    }
    if (lamp && pendant?.on) {
      const p = lamp.translation();
      const q = lamp.rotation();
      pendant.object.position.set(p.x, p.y, p.z);
      pendant.object.quaternion.set(q.x, q.y, q.z, q.w);
    }
    drawLetters();
  };

  const v = new THREE.Vector3();
  const shade = new THREE.Vector3();
  const near = new THREE.Vector3();
  const path = new THREE.Line3();
  return {
    layout,
    cat(at, yaw) {
      if (!at) {
        if (catOn) cat.setEnabled(false);
        catOn = false;
        return;
      }
      turn.setFromAxisAngle(UP, yaw);
      const q = { x: turn.x, y: turn.y, z: turn.z, w: turn.w };
      if (catOn) {
        cat.setNextKinematicTranslation(at);
        cat.setNextKinematicRotation(q);
        return;
      }
      // He comes in from elsewhere: put him there, not sweep him across the room.
      cat.setEnabled(true);
      cat.setTranslation(at, true);
      cat.setRotation(q, true);
      catOn = true;
    },
    owner(mesh) {
      for (let o: THREE.Object3D | null = mesh; o && o !== room.content; o = o.parent) {
        if (props.has(o) || (pendant?.on && o === pendant.object)) return o;
      }
      return null;
    },
    poke(prop, at, speed) {
      const body = prop === pendant?.object ? lamp : props.get(prop)?.body;
      if (!body) return;
      const m = body.mass();
      body.applyImpulseAtPoint({ x: speed.x * m, y: speed.y * m, z: speed.z * m }, at, true);
    },
    sweep(from, to, velocity) {
      if (!lamp || !pendant?.on) return;
      // The shade's middle, under the lamp's origin, and the point of the pointer's path nearest it:
      // a fast pointer jumps past the shade between two frames.
      const p = lamp.translation();
      shade.set(p.x, p.y - 0.09, 0);
      path.start.set(from.x, from.y, 0);
      path.end.set(to.x, to.y, 0);
      if (path.closestPointToPoint(shade, true, near).distanceTo(shade) > REACH) return;
      const l = lamp.linvel();
      const m = lamp.mass() * DRAG;
      v.set(velocity.x, velocity.y, 0).clampLength(0, SWING);
      v.set((v.x - l.x) * m, (v.y - l.y) * m, 0);
      lamp.applyImpulse(v, true);
    },
    flick(el) {
      const letter = letters.find((l) => l.el === el);
      if (!letter) return;
      letter.body.setLinvel({ x: 0, y: 1.4, z: 0 }, true);
      letter.body.setAngvel({ x: 0, y: 0, z: (Math.random() - 0.5) * 12 }, true);
    },
    step(dt) {
      acc = Math.min(acc + dt, STEP * MAX_STEPS);
      while (acc >= STEP) {
        if (pivot && pendant?.on) pivot.setNextKinematicTranslation({ x: lampX, y: pendant.top + pendant.lift, z: 0 });
        springLetters();
        world.step();
        acc -= STEP;
      }
      sync(dt);
    },
    dispose() {
      for (const l of letters) l.el.style.transform = "";
      world.free();
    },
  };
}
