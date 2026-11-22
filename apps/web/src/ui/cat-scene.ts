import * as THREE from "three";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { type GLTF, GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { makeCat } from "@/landing/stage/cat";
import { tokenColor } from "@/landing/stage/palette";
import { TILT } from "@/landing/stage/rooms";

/**
 * What Arandu is feeling or doing: each one clips of arandu.glb (blender/arandu) and a face, eased into from the
 * last. "surprised" jerks upright once and then sits wide-eyed; "angry" is a playful cross, never at the person.
 */
export type CatMood = "sit" | "lie" | "read" | "hop" | "stand" | "surprised" | "angry" | "sad";

// One download for every cat on the page; each gets its own copy of the skinned model.
let model: Promise<GLTF> | null = null;
const load = () =>
  (model ??= new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath("/draco/")).loadAsync("/models/arandu.glb"));

/** Seconds between hops while he celebrates, and how long one lasts. */
const HOP_EVERY = 1.4;
const HOP = 0.7;

/** The body and the face of each mood: clip weights, how shut his eyes are, how flat his ears lie. */
type Target = { sit: number; lie: number; hold: number; lids: number; ears: number; arch: number };
const TARGET: Record<CatMood, Target> = {
  sit: { sit: 1, lie: 0, hold: 0, lids: 0, ears: 0, arch: 0 },
  lie: { sit: 1, lie: 1, hold: 0, lids: 0.35, ears: 0, arch: 0 },
  read: { sit: 1, lie: 0, hold: 1, lids: 0.25, ears: 0, arch: 0 },
  hop: { sit: 0, lie: 0, hold: 0, lids: 0, ears: 0, arch: 0 },
  stand: { sit: 0, lie: 0, hold: 0, lids: 0, ears: 0, arch: 0 },
  surprised: { sit: 1, lie: 0, hold: 0, lids: 0, ears: 0, arch: 0 },
  angry: { sit: 1, lie: 0, hold: 0, lids: 0.45, ears: 1, arch: 1 },
  sad: { sit: 1, lie: 0, hold: 0, lids: 0.4, ears: 0.6, arch: 0 },
};

/** What he does once, from sitting and back to it: a clip of the GLB (seconds at its 30 fps), or a turn in place. */
type Once = "tap" | "startle" | "stretch" | "turn";
const LENGTH: Record<Once, number> = { tap: 33 / 30, startle: 37 / 30, stretch: 79 / 30, turn: 2.4 };
/** Left alone sitting, every so often he does one of these, the stretch and the turn more rarely. */
const IDLE: Once[] = ["tap", "tap", "stretch", "turn"];
const idleWait = () => 7 + Math.random() * 9;
/** Pokes close together that make him cross, within this many seconds; and how long he stays cross. */
const POKES = 4;
const POKE_SPAN = 4;
const CROSS = 3;

const envelope = (f: number) => {
  const s = (a: number, b: number, v: number) => {
    const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  return s(0, 0.15, f) * (1 - s(0.85, 1, f));
};

/**
 * Arandu in his own small canvas: the landing's rig (blink, ears, a look around, the eyes on the pointer), framed to
 * fit `host`, in a canvas of his own. Left alone he taps, stretches or turns round now and then; a poke startles him,
 * and many make him cross for a moment. With reduced motion he holds the pose. Returns setMood and a stop that frees
 * the GPU and takes the canvas away.
 */
export async function runCat(host: HTMLElement, mood: CatMood, onReady: () => void) {
  const gltf = await load();
  const canvas = host.appendChild(document.createElement("canvas"));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  // Neutral light: his fur stays black, not violet; the rim from cat.ts keeps his outline on the dark page.
  scene.add(new THREE.HemisphereLight(tokenColor("cream-100"), tokenColor("ink-900"), 0.8));
  const key = new THREE.DirectionalLight(tokenColor("cream-50"), 1.1);
  key.position.set(1.2, 1.6, 1.4);
  const back = new THREE.DirectionalLight(tokenColor("cream-100"), 0.4);
  back.position.set(-1.5, 0.8, -1);
  scene.add(key, back);

  const cat = makeCat({ ...gltf, scene: clone(gltf.scene) as THREE.Group }, "ink-400");
  // He faces +X: turned three quarters toward you, tipped as on the landing.
  const FACING = -Math.PI / 2 + 0.45;
  cat.yaw.rotation.y = FACING;
  cat.root.rotation.x = TILT;
  scene.add(cat.root);

  // Framed on him sitting, skinned (the bind pose stands taller): feet near the bottom, a little air above for a hop.
  cat.update({ sit: 1, lie: 0, hold: 0, lids: 0, leap: 0, air: 0, stride: 0, tap: 0, ears: 0, look: null }, 0, 0);
  cat.root.updateMatrixWorld(true);
  cat.root.traverse((o) => {
    if (o instanceof THREE.SkinnedMesh) o.computeBoundingBox();
  });
  const box = new THREE.Box3().setFromObject(cat.root);
  const size = box.getSize(new THREE.Vector3());
  const half = Math.max(size.x, size.y * 1.1) * 0.54;
  const camera = new THREE.OrthographicCamera(-half, half, half, -half, -10, 10);
  camera.position.set((box.min.x + box.max.x) / 2, box.min.y + half * 0.94, 5);

  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    renderer.setSize(width, height, false);
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  // His eyes follow the pointer anywhere on the page, a little in front of him.
  const look = new THREE.Vector3();
  let pointer: { x: number; y: number } | null = null;
  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    pointer = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: 1 - ((e.clientY - r.top) / r.height) * 2 };
  };
  addEventListener("pointermove", onMove, { passive: true });

  const start = performance.now();
  let last = start;
  const elapsed = () => (performance.now() - start) / 1000;
  const now = { ...TARGET[mood] };
  let goal = mood;
  let hopAt = 0;
  let once: { name: Once; at: number } | null = mood === "surprised" ? { name: "startle", at: 0 } : null;
  let idleAt = idleWait();
  let crossUntil = 0;
  let pokes: number[] = [];
  let stride = 0;
  let frame = 0;
  let ready = false;

  const play = (name: Once) => {
    once = { name, at: elapsed() };
  };
  // A poke on his body (not the empty box around him) startles him; many in a row make him cross for a moment.
  const ray = new THREE.Raycaster();
  let calm = 0;
  const onPoke = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, 1 - ((e.clientY - r.top) / r.height) * 2), camera);
    if (ray.intersectObject(cat.root, true).length === 0) return;
    const t = elapsed();
    pokes = [...pokes.filter((at) => t - at < POKE_SPAN), t];
    if (pokes.length >= POKES) {
      crossUntil = t + CROSS;
      pokes = [];
      once = null;
      // Holding still (reduced motion), nothing redraws him: draw him calm again once it passes.
      if (reduce) {
        clearTimeout(calm);
        calm = window.setTimeout(draw, CROSS * 1000 + 50);
      }
    } else if (!once && t > crossUntil) play("startle");
    if (reduce) draw();
  };
  host.addEventListener("pointerdown", onPoke);

  const draw = () => {
    const at = performance.now();
    const dt = Math.min((at - last) / 1000, 0.05);
    last = at;
    const t = elapsed();
    const mood: CatMood = t < crossUntil ? "angry" : goal;
    const target = TARGET[mood];
    const k = reduce ? 1 : Math.min(1, dt * 6);
    for (const key of ["sit", "lie", "hold", "lids", "ears", "arch"] as const) now[key] += (target[key] - now[key]) * k;

    // Sitting with nothing to do, now and then he does something on his own.
    if (!reduce && !once && mood === "sit" && t >= idleAt) play(IDLE[Math.floor(Math.random() * IDLE.length)]!);
    let phase = 0;
    if (once) {
      phase = (t - once.at) / LENGTH[once.name];
      if (phase >= 1) {
        once = null;
        phase = 0;
        idleAt = t + idleWait();
      }
    }
    const doing = once?.name;

    let leap = 0;
    let air = 0;
    if (mood === "hop" && !reduce) {
      const f = (t - hopAt) % HOP_EVERY;
      if (f < HOP) {
        leap = f / HOP;
        air = Math.sin(Math.PI * leap);
      }
    }
    // The turn: up from sitting, a walk round in place, and down again facing you.
    const turning = doing === "turn" ? envelope(phase) : 0;
    if (turning) stride += dt * 1.6;
    // The stretch is a side view: from the front the play bow reads as a crouch.
    const side = doing === "stretch" ? envelope(phase) * 1.1 : 0;
    cat.yaw.rotation.y = FACING + side + (doing === "turn" ? Math.PI * 2 * phase * phase * (3 - 2 * phase) : 0);
    // Busy turning or stretching, he stops following the pointer, or his head twists against his body.
    const busy = doing === "turn" || doing === "stretch";

    if (mood === "sad") look.set(camera.position.x, camera.position.y - half * 2, 2);
    else if (pointer) look.set(pointer.x * half * 3, camera.position.y + pointer.y * half * 3, 3);
    cat.root.position.y = air * size.y * 0.25;
    cat.update(
      {
        sit: now.sit * (1 - turning),
        leap,
        air,
        stride,
        tap: doing === "tap" ? phase : 0,
        startle: doing === "startle" ? phase : 0,
        stretch: doing === "stretch" ? phase : 0,
        arch: now.arch,
        // Startled, his eyes go wide and his ears prick up.
        lids: doing === "startle" ? 0 : now.lids,
        ears: doing === "startle" ? 0 : now.ears,
        hold: now.hold,
        lie: now.lie,
        look: !busy && (mood === "sad" || pointer) ? look : null,
      },
      dt,
      t,
    );
    renderer.render(scene, camera);
    if (!ready) {
      ready = true;
      onReady();
    }
    if (!reduce) frame = requestAnimationFrame(draw);
  };
  draw();

  return {
    setMood(next: CatMood) {
      if (next === goal) return;
      goal = next;
      hopAt = elapsed();
      if (next === "surprised") play("startle");
      if (reduce) draw();
    },
    stop() {
      cancelAnimationFrame(frame);
      clearTimeout(calm);
      observer.disconnect();
      removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerdown", onPoke);
      cat.dispose();
      renderer.dispose();
      // dispose() keeps the canvas's WebGL context; the browser holds only a few at once.
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
