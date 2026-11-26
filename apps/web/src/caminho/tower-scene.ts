import * as THREE from "three";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { type GLTF, GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { type CatPose, makeCat } from "@/landing/stage/cat";
import { tokenColor, tokenValue } from "@/landing/stage/palette";
import { type SpotState, chapterKey, lessonKey, seeded, specialKey, towerPlan } from "./tower-plan";

// One download of the kit (blender/tower/export.py) and of Arandu for every tower on the page.
let models: Promise<[GLTF, GLTF]> | null = null;
const load = () => {
  const loader = new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath("/draco/"));
  return (models ??= Promise.all([loader.loadAsync("/models/tower.glb"), loader.loadAsync("/models/arandu.glb")]));
};

// The kit's measures, in metres, as in blender/tower/build.py. The GLB is Y-up: a bay's front faces +Z.
const BAY = 1.5;
const HOUSES = ["HouseBox", "HouseWide", "HouseBarrel"];
const SIDES = ["SidePlatform", "SideLadder", "SideBasket", "SideBed"];
const FRONTS = ["FrontBowl", "FrontStep", "FrontTunnel"];
/** A sign's face, wide and tall. */
const FACE = { SignTag: [0.2, 0.15], SignBoard: [0.5, 0.15] } as const;
type SignName = keyof typeof FACE;
/** Where the pompom hangs at the book's end, and where Arandu sits by it, in the last bay. */
const BOLINHA = [-0.2, 0.49, 0.64] as const;
const END_SEAT = [0.1, 0, 0.25] as const;

/** What a sign shows in place of words. */
export const CHECK = "check";
export const STAR = "star";
/** A sign's face and ink, by what the person can do there. */
const LOOK: Record<SpotState, [face: string, ink: string]> = {
  open: ["cream-50", "ink-950"],
  done: ["amber-400", "ink-950"],
  locked: ["violet-800", "violet-300"],
};
const TEXTURE = 1280; // pixels a metre of sign

/** Metres of tower the screen shows across, at least, and from top to bottom, at least. */
const ACROSS = 2.5;
const DOWN = 3;
const FOV = 30;
/** How far above its floor a bay is looked at, and how far above that the camera rides (a share of its distance). */
const EYE = 0.62;
const LIFT = 0.2;
/** The crown's top over the first floor, and the air the camera leaves above it when the page is at its top. */
const CROWN = 1.93;
const AIR = 0.45;

export type TowerBook = {
  /** The same book always grows the same tower. */
  seed: number;
  chapters: { state: SpotState; lessons: SpotState[] }[];
  /** The key of the lesson Arandu sits on; null at the book's end. */
  at: string | null;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * A book's path as a cat tower, stacked from the kit: a house per chapter, a spot per lesson, and a sign on each. The
 * page's scroll moves the camera down the tower and round it, a quarter turn a bay (`track` holds one element per bay,
 * and its scroll offset says which one is looked at). A tap on a spot or its sign reports its key to onPick, and a tap
 * on nothing reports null. `box` gets the stage's height and a bay's, in pixels, as --stage and --bay. Returns select
 * (the sign that stands out: Arandu's, to begin with) and stop.
 */
export async function runTower(
  { box, stage, track }: { box: HTMLElement; stage: HTMLElement; track: HTMLElement },
  book: TowerBook,
  onPick: (key: string | null) => void,
) {
  // The signs print in the page's display font: wait for it, or they print in a fallback.
  const [[kit, catModel]] = await Promise.all([load(), document.fonts.ready]);
  const scroller = scrollParent(box);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = stage.appendChild(document.createElement("canvas"));
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(tokenColor("cream-100"), tokenColor("ink-700"), 1.5));
  // The key and fill lights go round with the camera: the side the person sees is always the lit one.
  const key = new THREE.DirectionalLight(tokenColor("cream-50"), 1.9);
  const fill = new THREE.DirectionalLight(tokenColor("cream-100"), 0.6);
  scene.add(key, key.target, fill, fill.target);

  const piece = (name: string) => {
    const o = kit.scene.getObjectByName(name);
    if (!o) throw new Error(`tower.glb has no ${name}`);
    return o;
  };
  const place = (name: string, parent: THREE.Object3D) => {
    const o = piece(name).clone();
    parent.add(o);
    return o;
  };

  // A sign's printed face, shared by every sign that reads the same.
  const owned: { dispose(): void }[] = [];
  const faces = new Map<string, THREE.Material>();
  const face = (kind: SignName, text: string, state: SpotState) => {
    const id = `${kind}|${text}|${state}`;
    const known = faces.get(id);
    if (known) return known;
    const [faceToken, inkToken] = LOOK[state];
    const g = document.createElement("canvas").getContext("2d");
    if (!g) throw new Error("No 2D canvas for the tower's signs");
    const w = (g.canvas.width = Math.round(FACE[kind][0] * TEXTURE));
    const h = (g.canvas.height = Math.round(FACE[kind][1] * TEXTURE));
    g.fillStyle = tokenValue(faceToken);
    g.fillRect(0, 0, w, h);
    g.fillStyle = g.strokeStyle = tokenValue(text === STAR ? "amber-400" : inkToken);
    g.translate(w / 2, h / 2);
    if (text === CHECK) {
      g.lineWidth = h * 0.13;
      g.lineCap = g.lineJoin = "round";
      g.beginPath();
      g.moveTo(-h * 0.26, 0);
      g.lineTo(-h * 0.07, h * 0.19);
      g.lineTo(h * 0.28, -h * 0.2);
      g.stroke();
    } else if (text === STAR) {
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = h * (i % 2 ? 0.16 : 0.38);
        g.lineTo(Math.sin((i * Math.PI) / 5) * r, -Math.cos((i * Math.PI) / 5) * r);
      }
      g.fill();
    } else {
      const size = h * (kind === "SignBoard" ? 0.56 : 0.74);
      const font = tokenValue("font-display");
      g.font = `700 ${size}px ${font}`;
      g.font = `700 ${size * Math.min(1, (w * 0.88) / g.measureText(text).width)}px ${font}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(text, 0, h * 0.04);
    }
    const map = new THREE.CanvasTexture(g.canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.flipY = false; // glTF UVs put v = 0 at the top of the image
    map.anisotropy = 4;
    const material = new THREE.MeshStandardMaterial({ map, roughness: 0.7 });
    owned.push(map, material);
    faces.set(id, material);
    return material;
  };

  // The tower. Bay 0's floor is at y = 0 and each bay under it turns a quarter, so the path goes down in a spiral.
  const bays = towerPlan(book.chapters.length);
  const random = seeded(book.seed);
  const last: Record<string, string> = {};
  const pick = (kind: string, options: string[]) => {
    const rest = options.filter((name) => name !== last[kind]); // never the variant this kind used last
    return (last[kind] = rest[Math.floor(random() * rest.length)]!);
  };
  const tower = new THREE.Group();
  scene.add(tower);
  const seats = new Map<string, { at: THREE.Vector3; bay: number }>();
  const signs = new Map<string, THREE.Object3D>();
  const targets: THREE.Object3D[] = [];
  const spots: { key: string; module: THREE.Object3D; name: string; index: number; text: string; state: SpotState }[] = [];

  let bay = tower;
  bays.forEach(({ hung, floor }, i) => {
    bay = new THREE.Group();
    bay.position.y = -i * BAY;
    bay.rotation.y = (Math.PI / 2) * i;
    if (random() < 0.5) bay.scale.x = -1;
    tower.add(bay);
    const spot = (key: string, name: string, parent: THREE.Object3D, text: string, state: SpotState) =>
      spots.push({ key, module: place(name, parent), name, index: i, text, state });

    place("Board", bay);
    place(hung === "crown" ? "Crown" : "Posts", bay);
    if (hung === "special" && typeof floor === "object") spot(specialKey(floor.house), "Hammock", bay, STAR, "locked");
    else if (typeof hung === "object") {
      const c = hung.lessons;
      const right = new THREE.Group(); // a side module is built for the left post: mirrored, it hangs on the right
      right.scale.x = -1;
      bay.add(right);
      [pick("side", SIDES), pick("side", SIDES), pick("front", FRONTS)].forEach((name, n) => {
        const state = book.chapters[c]?.lessons[n] ?? "locked";
        spot(lessonKey(c, n + 1), name, n === 1 ? right : bay, state === "done" ? CHECK : String(n + 1), state);
      });
    }
    if (floor === "tunnel") place("Tunnel", bay);
    else if (floor === "end") place("Bolinha", bay).position.set(...BOLINHA);
    else spot(chapterKey(floor.house), pick("house", HOUSES), bay, `Capítulo ${floor.house + 1}`, book.chapters[floor.house]?.state ?? "locked");
  });
  // Two bays of bare posts run on under the last floor: the tower shows no foot.
  for (const k of [1, 2]) place("Posts", bay).position.y = -k * BAY;
  tower.updateMatrixWorld(true);

  // Each spot's seat, and its sign: a board on a house's roof, a tag under any other spot. Signs are never mirrored.
  for (const { key, module, name, index, text, state } of spots) {
    const seat = module.getObjectByName(`${name}Seat`);
    const anchor = module.getObjectByName(`${name}Sign`);
    if (!seat || !anchor) throw new Error(`tower.glb's ${name} has no seat or sign`);
    seats.set(key, { at: seat.getWorldPosition(new THREE.Vector3()), bay: index });
    const kind: SignName = HOUSES.includes(name) ? "SignBoard" : "SignTag";
    const sign = place(kind, tower);
    anchor.getWorldPosition(sign.position);
    sign.traverse((o) => {
      if (o instanceof THREE.Mesh && (o.material as THREE.Material).name === "TowerSign") o.material = face(kind, text, state);
    });
    signs.set(key, sign);
    module.userData.spot = sign.userData.spot = key;
    targets.push(module, sign);
  }
  const turning = [...signs.values()];

  // Arandu sits on his lesson, turned three quarters to whoever looks at that bay; at the book's end, by the pompom.
  const cat = makeCat({ ...catModel, scene: clone(catModel.scene) as THREE.Group }, "ink-400");
  const home = (book.at && seats.get(book.at)) || { at: bay.localToWorld(new THREE.Vector3(...END_SEAT)), bay: bays.length - 1 };
  cat.root.position.copy(home.at);
  cat.yaw.rotation.y = (Math.PI / 2) * home.bay - Math.PI / 2 + 0.45;
  scene.add(cat.root);
  const pose: CatPose = { sit: 1, leap: 0, air: 0, stride: 0, tap: 0, lids: 0, ears: 0, hold: 0, lie: 0, look: null };

  // The scroll's gear: a bay of the track is a bay of the tower, as tall on the page as it is drawn.
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 80);
  let top = 0;
  let step = 1;
  let distance = 1;
  let first = 0; // the bay the camera starts on: above the first floor when the screen is too short to show the crown
  const measure = () => {
    const width = stage.clientWidth;
    const height = scroller.clientHeight;
    if (!width || !height) return;
    const down = Math.max(ACROSS / (width / height), DOWN);
    step = (BAY * height) / down;
    distance = down / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    first = Math.min(0, (EYE + down / 2 - CROWN - AIR) / BAY);
    box.style.setProperty("--stage", String(height));
    box.style.setProperty("--bay", String(step));
    top = track.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  let hot = (book.at && signs.get(book.at)) || null;
  const start = performance.now();
  let before = start;
  let frame = 0;
  const draw = () => {
    const now = performance.now();
    const dt = Math.min((now - before) / 1000, 0.05);
    before = now;
    const u = clamp((scroller.scrollTop - top) / step, first, bays.length - 1);
    const yaw = (Math.PI / 2) * u;
    const y = EYE - u * BAY;
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    camera.position.set(sin * distance, y + LIFT * distance, cos * distance);
    camera.lookAt(0, y, 0);
    key.target.position.set(0, y, 0);
    key.position.set(sin * 2 - cos * 0.8, y + 1.6, cos * 2 + sin * 0.8);
    fill.target.position.set(0, y, 0);
    fill.position.set(sin * 1.2 + cos * 1.6, y + 0.3, cos * 1.2 - sin * 1.6);
    // Every sign faces whoever looks, wherever round the tower they are.
    for (let i = 0; i < turning.length; i++) {
      const sign = turning[i]!;
      sign.rotation.y = yaw;
      sign.scale.setScalar(sign === hot ? 1.3 : 1);
    }
    cat.update(pose, dt, (now - start) / 1000);
    renderer.render(scene, camera);
  };
  const loop = () => {
    draw();
    frame = requestAnimationFrame(loop);
  };

  measure();
  // The page opens on Arandu's bay.
  scroller.scrollTop = top + home.bay * step;
  const observer = new ResizeObserver(() => {
    measure();
    if (reduce) draw();
  });
  observer.observe(scroller);
  observer.observe(track);
  // With reduced motion Arandu holds his pose, and the tower is drawn again only when the page moves.
  if (reduce) {
    draw();
    scroller.addEventListener("scroll", draw, { passive: true });
  } else loop();

  const ray = new THREE.Raycaster();
  const point = new THREE.Vector2();
  const under = (e: MouseEvent): string | null => {
    const r = canvas.getBoundingClientRect();
    point.set(((e.clientX - r.left) / r.width) * 2 - 1, 1 - ((e.clientY - r.top) / r.height) * 2);
    ray.setFromCamera(point, camera);
    for (let o = ray.intersectObjects(targets, true)[0]?.object ?? null; o; o = o.parent) {
      if (typeof o.userData.spot === "string") return o.userData.spot;
    }
    return null;
  };
  const onClick = (e: MouseEvent) => onPick(under(e));
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === "mouse") canvas.toggleAttribute("data-hot", under(e) !== null);
  };
  canvas.addEventListener("click", onClick);
  canvas.addEventListener("pointermove", onMove);

  return {
    /** The spot whose sign stands out: the one the person picked. */
    select(spot: string | null) {
      hot = (spot && signs.get(spot)) || null;
      if (reduce) draw();
    },
    stop() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      scroller.removeEventListener("scroll", draw);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("pointermove", onMove);
      owned.forEach((o) => o.dispose());
      cat.dispose();
      renderer.dispose();
      // dispose() keeps the canvas's WebGL context; the browser holds only a few at once.
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}

/** The element whose scroll moves `el`: the app's tabs scroll inside their own box, not the window. */
function scrollParent(el: HTMLElement): HTMLElement {
  for (let p = el.parentElement; p; p = p.parentElement) {
    if (/auto|scroll/.test(getComputedStyle(p).overflowY)) return p;
  }
  return document.documentElement;
}
