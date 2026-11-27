import * as THREE from "three";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { type GLTF, GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { tokenColor } from "@/landing/stage/palette";
import { type BookLook, type BookName, type PropName, makeKit } from "@/landing/stage/props";

// One download for every shelf on the page: the landing's props (blender/props/build.py), books and shelves.
let model: Promise<GLTF> | null = null;
const load = () =>
  (model ??= new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath("/draco/")).loadAsync("/models/props.glb"));

/** The books' shapes, in turn: the landing's widest spines (6-11 cm), so their titles can be read on a phone. */
const SHAPES: BookName[] = ["BookThick", "Book", "BookTall", "BookShort"];
/** The books' covers, in turn, as on the O11 board and the landing's shelves. */
const LOOKS: BookLook[] = [
  { cover: "amber-400", band: "amber-800" },
  { cover: "amber-600", band: "cream-100" },
  { cover: "violet-600", band: "cream-300" },
  { cover: "amber-400", band: "amber-800" },
  { cover: "violet-400", band: "violet-800" },
];
const SHELVES: PropName[] = ["ShelfSmall", "ShelfMedium", "ShelfLarge"];
const GAP = 0.006;
/** Plank left free past the last book, where the page lays Arandu. */
const CAT_ROOM = 0.26;
/** Air above the tallest book, for the ball on the first one, and plank shown below its top. */
const ABOVE = 0.12;
const BELOW = 0.06;

/**
 * Subjects as the landing's 3D books, standing on its shelf: each title down its spine, the first one glowing with
 * the cat's toy ball on it (where the person starts; the paw is the game's currency, so it marks nothing). Still:
 * drawn once, and again when the canvas changes size.
 */
export async function runShelf(host: HTMLElement, titles: string[], onReady: () => void, onPick?: (index: number) => void) {
  // The spines print in the page's display font: wait for it, or they print in a fallback.
  const [gltf] = await Promise.all([load(), document.fonts.ready]);
  const kit = makeKit(gltf);
  const canvas = host.appendChild(document.createElement("canvas"));
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(tokenColor("cream-100"), tokenColor("ink-900"), 1.1));
  const key = new THREE.DirectionalLight(tokenColor("cream-50"), 1.6);
  key.position.set(-0.6, 1.4, 2);
  scene.add(key);

  // The books, left to right from the plank's left end.
  const row = new THREE.Group();
  let x = 0;
  const books = titles.map((title, i) => {
    const name = SHAPES[i % SHAPES.length]!;
    const s = kit.size(name);
    const book = kit.book(name, LOOKS[i % LOOKS.length]!, title);
    book.position.set(x + s.x / 2, 0, 0);
    book.userData.index = i;
    row.add(book);
    x += s.x + GAP;
    return { book, s };
  });

  // The smallest shelf that holds them and Arandu; the books start near its left end.
  const need = x + CAT_ROOM + 0.08;
  const shelf = SHELVES.find((name) => kit.size(name).x >= need) ?? "ShelfLarge";
  const length = kit.size(shelf).x;
  scene.add(kit.make(shelf));
  row.position.x = -length / 2 + 0.05;
  scene.add(row);

  // The first book glows a little, and the ball rests on it.
  const first = books[0];
  if (first) {
    first.book.traverse((o) => {
      if (o instanceof THREE.Mesh && o.material.userData.print) {
        o.material.emissive = tokenColor("amber-300");
        o.material.emissiveIntensity = 0.22;
      }
    });
    const ball = kit.make("Ball");
    ball.position.set(row.position.x + first.book.position.x, first.s.y, 0);
    scene.add(ball);
  }

  // Framed on the books and the cat's stretch of plank, not the whole shelf: the books as big as the canvas allows, the
  // plank running off its sides. A little from above, so the plank's top shows.
  const tallest = Math.max(0, ...books.map(({ s }) => s.y));
  const left = row.position.x - 0.03;
  const size = new THREE.Vector2(x + CAT_ROOM + 0.06, tallest + ABOVE + BELOW);
  const center = new THREE.Vector3(left + size.x / 2, (tallest + ABOVE - BELOW) / 2, 0);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
  camera.position.set(center.x, center.y + 0.2, 3);
  camera.lookAt(center);

  const draw = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    const half = Math.max(size.x / 2, ((size.y / 2) * width) / height);
    camera.left = -half;
    camera.right = half;
    camera.top = (half * height) / width;
    camera.bottom = -camera.top;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  };
  draw();
  onReady();
  const observer = new ResizeObserver(draw);
  observer.observe(canvas);

  // With onPick, a book is a button: the one under the pointer rises a little, and a tap picks it.
  const ray = new THREE.Raycaster();
  const at = new THREE.Vector2();
  const under = (e: PointerEvent | MouseEvent) => {
    const r = canvas.getBoundingClientRect();
    at.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(at, camera);
    for (let o: THREE.Object3D | null = ray.intersectObject(row, true)[0]?.object ?? null; o; o = o.parent)
      if (typeof o.userData.index === "number") return o.userData.index as number;
    return null;
  };
  let hot: number | null = null;
  const onMove = (e: PointerEvent) => {
    const now = under(e);
    if (now === hot) return;
    hot = now;
    books.forEach(({ book }, i) => (book.position.y = i === hot ? 0.012 : 0));
    canvas.toggleAttribute("data-hot", hot !== null);
    draw();
  };
  const onClick = (e: MouseEvent) => {
    const index = under(e);
    if (index !== null) onPick?.(index);
  };
  if (onPick) {
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("click", onClick);
  }

  return {
    stop() {
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("click", onClick);
      observer.disconnect();
      kit.dispose();
      renderer.dispose();
      // dispose() keeps the canvas's WebGL context; the browser holds only a few at once.
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
