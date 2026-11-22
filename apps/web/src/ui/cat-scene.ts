import * as THREE from "three";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { type GLTF, GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { type CatPose, makeCat } from "@/landing/stage/cat";
import { tokenColor } from "@/landing/stage/palette";
import { TILT } from "@/landing/stage/rooms";

/** What Arandu is doing: each one a clip of arandu.glb (blender/arandu), eased into from the last. */
export type CatMood = "sit" | "lie" | "read" | "hop" | "stand";

// One download for every cat on the page; each gets its own copy of the skinned model.
let model: Promise<GLTF> | null = null;
const load = () =>
  (model ??= new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath("/draco/")).loadAsync("/models/arandu.glb"));

/** Seconds between hops while he celebrates, and how long one lasts. */
const HOP_EVERY = 1.4;
const HOP = 0.7;

const TARGET: Record<CatMood, Pick<CatPose, "sit" | "lie" | "hold" | "lids">> = {
  sit: { sit: 1, lie: 0, hold: 0, lids: 0 },
  lie: { sit: 1, lie: 1, hold: 0, lids: 0.35 },
  read: { sit: 1, lie: 0, hold: 1, lids: 0.25 },
  hop: { sit: 0, lie: 0, hold: 0, lids: 0 },
  stand: { sit: 0, lie: 0, hold: 0, lids: 0 },
};

/**
 * Arandu in his own small canvas: the landing's rig (blink, ears, a look around, the eyes on the pointer), framed to
 * fit `host`, in a canvas of his own. With reduced motion he holds the pose. Returns setMood and a stop that frees
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
  cat.yaw.rotation.y = -Math.PI / 2 + 0.45;
  cat.root.rotation.x = TILT;
  scene.add(cat.root);

  // Framed on him sitting, skinned (the bind pose stands taller): feet near the bottom, a little air above for a hop.
  cat.update({ ...TARGET.sit, leap: 0, air: 0, stride: 0, tap: 0, ears: 0, look: null }, 0, 0);
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

  const now = { ...TARGET[mood] };
  let goal = mood;
  let hopAt = 0;
  const start = performance.now();
  let last = start;
  const elapsed = () => (performance.now() - start) / 1000;
  let frame = 0;
  let ready = false;

  const draw = () => {
    const at = performance.now();
    const dt = Math.min((at - last) / 1000, 0.05);
    last = at;
    const t = elapsed();
    const k = reduce ? 1 : Math.min(1, dt * 6);
    for (const key of ["sit", "lie", "hold", "lids"] as const) now[key] += (TARGET[goal][key] - now[key]) * k;
    let leap = 0;
    let air = 0;
    if (goal === "hop" && !reduce) {
      const f = (t - hopAt) % HOP_EVERY;
      if (f < HOP) {
        leap = f / HOP;
        air = Math.sin(Math.PI * leap);
      }
    }
    if (pointer) look.set(pointer.x * half * 3, camera.position.y + pointer.y * half * 3, 3);
    cat.root.position.y = air * size.y * 0.25;
    cat.update(
      { sit: now.sit, leap, air, stride: 0, tap: 0, lids: now.lids, ears: 0, hold: now.hold, lie: now.lie, look: pointer ? look : null },
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
      if (reduce) draw();
    },
    stop() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      removeEventListener("pointermove", onMove);
      cat.dispose();
      renderer.dispose();
      // dispose() keeps the canvas's WebGL context; the browser holds only a few at once.
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
