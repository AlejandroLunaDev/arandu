import * as THREE from "three";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { type GLTF, GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { type CatPose, makeCat } from "@/landing/stage/cat";
import { catUrl, leagueOf } from "@/landing/stage/cat-url";
import { tokenColor, tokenValue } from "@/landing/stage/palette";
import { makeKit } from "@/landing/stage/props";
import { OPEN_HEIGHT, SHUT, openTo } from "@/landing/stage/cat-life";
import { openHeight } from "@/landing/book/book-data";
import { LEAVE_EVENT, type Leave } from "@/app-shell/walk-off";
import { type SpotState, chapterKey, lessonKey, seeded, specialKey, towerPlan } from "./tower-plan";

// One download of the kit (blender/tower/export.py), of Arandu and of the landing's props (the lessons' books) for
// every tower on the page.
let models: Promise<[GLTF, GLTF, GLTF]> | null = null;
const load = (catAt: string) => {
  const loader = new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath("/draco/"));
  // shortcut: the first tower's cat model serves the page; a page has one league.
  return (models ??= Promise.all([
    loader.loadAsync("/models/tower.glb"),
    loader.loadAsync(catAt),
    loader.loadAsync("/models/props.glb"),
  ]));
};

/** Starts the tower's downloads ahead, for a page with `league`: on the way here they load while Arandu walks off. */
export const preloadTower = (league: string | null) => load(catUrl(league));

// The kit's measures, in metres, as in blender/tower/build.py. The GLB is Y-up: a bay's front faces +Z.
const BAY = 1.5;
/** A chalkboard's storey is lower: its posts are the kit's, cut to this (m). */
const TITLE_BAY = 0.8;
const HOUSES = ["HouseBox", "HouseWide", "HouseBarrel"];
const SIDES = ["SidePlatform", "SideLadder", "SideBasket", "SideBed"];
const FRONTS = ["FrontBowl", "FrontStep"];
/** A house's chalkboard: its face, wide and tall (blender/tower/build.py's SIGNS). */
const FACE = [0.6, 0.36] as const;
/** Where the pompom hangs at the book's end: under the last floor. */
const BOLINHA = [-0.2, -0.06, 0.5] as const;

/** A lesson is a book standing on its spot, this tall (m), its cover to the storey's front, the chapter's theme on it. */
const BOOK = 0.36;
/**
 * What a chapter is about, short enough to read on a cover: its text without the syllabus's number, up to its first
 * full stop, bracket or colon ("1. Tipos de variáveis aleatórias. Noções de…" is "Tipos de variáveis aleatórias").
 */
const theme = (text: string) => text.replace(/^\s*\d+[.)]\s*/, "").split(/[.(:;]/)[0]!.trim();
/** How far a book turns from its storey's front (rad), its spine to the camera's side. */
const TURN = -0.45;
/** The covers of each chapter's books, in turn: a storey's lessons read as one chapter. */
const COVERS = ["chart-2", "chart-3", "chart-4", "chart-5", "chart-1"];
/** What a special lesson's book says, on an amber cover: it is not built yet, so it reads as locked. */
const SPECIAL = "Especial";
const SPECIAL_COVER = "amber-500";
/** A chapter not reached yet is grey, its storeys and its books, and only its chalkboard reads. */
const LOCKED_COVER = "ink-400";
/** The kit's violets a house takes its chapter's colour in, by how bright: its walls, and its darker plush trim. */
const TINTED: Record<string, number> = { TowerHouse: 0.85, TowerPlush: 0.5 };
/** A house's chalkboard: the chalk of its chapter's number and of its theme, by what the person can do there. */
const CHALK: Record<SpotState, [caption: string, title: string]> = {
  open: ["amber-300", "cream-50"],
  done: ["amber-400", "amber-200"],
  locked: ["ink-500", "ink-400"],
};
const TEXTURE = 1280; // pixels a metre of sign

/** Metres of tower the screen shows across, at least, and from top to bottom, at least. */
const ACROSS = 2.5;
const DOWN = 3;
const FOV = 30;
/**
 * How far above its floor a storey is looked at, and how far above that the camera rides (a share of its distance).
 * Low on the storey: the card of what the person picked covers the bottom of the stage, so the storey stands over it.
 */
const EYE = 0.25;
const LIFT = 0.2;
/** How far over a floor Arandu is, about, on his way from house to house: what the page follows on his way down. */
const PERCH = 0.1;
/** How far in front of a house's door he lands, on its floor, before he goes in. */
const DOORSTEP = 0.38;
/** His settling in (s): walking in from the doorstep, turning round on the cushion, and lying down. */
const WALK_IN = 0.85;
const ROUND = 1.5;
const LIE_DOWN = 0.7;
const SETTLED = WALK_IN + ROUND + LIE_DOWN;
const smooth = (e: number) => e * e * (3 - 2 * e);
/** His way in takes this long at most (seconds), however far down he sits, and a hop no longer or shorter than these. */
const WAY_IN = 4.5;
const HOP = [0.16, 0.42] as const;
/** An opened lesson's book: how far before the camera it opens (m), how long it flies and opens (s), how far (rad) each
 *  half stands off lying flat open, and where its origin, the spine's foot, sits shut, a share of its height left. */
const OPEN_AT = 1.6;
const FLY = 0.7;
const SPREAD = 0.6;
const LEAN = 0.06;
const SHUT_LEFT = 0.35;

export type TowerBook = {
  /** The same book always grows the same tower. */
  seed: number;
  chapters: { text: string; state: SpotState; lessons: SpotState[] }[];
  /** The key of the lesson Arandu sits on; null at the book's end. */
  at: string | null;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * A book's path as a cat tower, stacked from the kit. A storey is a chapter: its house on the floor, under a low storey
 * with its chalkboard, and its three lessons on the spots round it, each a book in the chapter's colour with the chapter's theme on
 * its cover, all facing the same way. A special lesson takes a storey of its own. The page's scroll moves the camera
 * straight down the tower, which stands still, so no post ever comes between a storey and the eye (`track` holds one element per storey, and its scroll offset
 * says which one is looked at). Arandu comes in from the left of the screen onto the roof and hops down from house to
 * house to the one of the chapter the person is on, where he lies in the door looking out, and the page follows him
 * unless the person takes it. A tap on a spot, its book or its sign reports its key to onPick, and on nothing null. `box`
 * gets the stage's height and a storey's, in pixels, as --stage and --bay, and the open book's height as --open.
 * Returns select (the spot that stands out, with a line round it: Arandu's, to begin with), open (a lesson's book flies
 * to the camera and opens, and onOpened reports it once open, for the page to lay its pages over it; null shuts it and
 * sends it home, reported as null) and stop.
 */
export async function runTower(
  { box, stage, track }: { box: HTMLElement; stage: HTMLElement; track: HTMLElement },
  book: TowerBook,
  onPick: (key: string | null) => void,
  onOpened: (key: string | null) => void,
) {
  // The signs and the books print in the page's display font: wait for it, or they print in a fallback.
  const league = leagueOf(box);
  const [[kit, catModel, propsModel]] = await Promise.all([load(catUrl(league)), document.fonts.ready]);
  const props = makeKit(propsModel);
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

  // A house's chalkboard, written in chalk: its chapter's number over the chapter's theme, the theme on up to three
  // lines and shrunk to fit them. `text` is the two, a line apart. Shared by every board that reads the same.
  const owned: { dispose(): void }[] = [];
  const faces = new Map<string, THREE.Material>();
  const face = (text: string, state: SpotState) => {
    const id = `${text}|${state}`;
    const known = faces.get(id);
    if (known) return known;
    const [caption = "", title = ""] = text.split("\n");
    const [captionInk, titleInk] = CHALK[state];
    const g = document.createElement("canvas").getContext("2d");
    if (!g) throw new Error("No 2D canvas for the tower's chalkboards");
    const w = (g.canvas.width = Math.round(FACE[0] * TEXTURE));
    const h = (g.canvas.height = Math.round(FACE[1] * TEXTURE));
    g.fillStyle = tokenValue("ink-850");
    g.fillRect(0, 0, w, h);
    // Old chalk rubbed off: faint smudges over the board.
    const dust = seeded(text.length * 31 + h);
    g.fillStyle = tokenValue("cream-50");
    for (let k = 0; k < 26; k++) {
      g.globalAlpha = 0.025 + dust() * 0.035;
      g.beginPath();
      g.ellipse(dust() * w, dust() * h, w * (0.05 + dust() * 0.12), h * (0.02 + dust() * 0.05), dust() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 0.92; // chalk never covers the board quite
    const font = tokenValue("font-display");
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = tokenValue(captionInk);
    g.font = `700 ${h * 0.12}px ${font}`;
    g.fillText(caption.toUpperCase(), w / 2, h * 0.2);
    // The theme: the biggest size its words wrap at in three lines or fewer.
    g.fillStyle = tokenValue(titleInk);
    const words = title.split(" ");
    let size = h * 0.2;
    let lines: string[] = [];
    for (; size > h * 0.08; size *= 0.92) {
      g.font = `600 ${size}px ${font}`;
      lines = [];
      for (const word of words) {
        const last = lines[lines.length - 1];
        if (last !== undefined && g.measureText(`${last} ${word}`).width <= w * 0.86) lines[lines.length - 1] = `${last} ${word}`;
        else lines.push(word);
      }
      if (lines.length <= 3 && lines.every((line) => g.measureText(line).width <= w * 0.86)) break;
    }
    lines.forEach((line, k) => g.fillText(line, w / 2, h * 0.6 + (k - (lines.length - 1) / 2) * size * 1.18));
    const map = new THREE.CanvasTexture(g.canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.flipY = false; // glTF UVs put v = 0 at the top of the image
    map.anisotropy = 4;
    const material = new THREE.MeshStandardMaterial({ map, roughness: 0.7 });
    owned.push(map, material);
    faces.set(id, material);
    return material;
  };

  // A chapter's storey wears its colour where the kit is violet, its plush texture kept; the black and the cream stay.
  const tints = new Map<string, THREE.Material>();
  const tint = (part: THREE.Object3D, token: string) =>
    part.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const base = o.material as THREE.MeshStandardMaterial;
      const shade = TINTED[base.name];
      if (shade === undefined) return;
      const id = `${token}|${base.name}`;
      let m = tints.get(id);
      if (!m) {
        const own = base.clone();
        own.color.copy(tokenColor(token)).multiplyScalar(shade);
        owned.push(own);
        tints.set(id, (m = own));
      }
      o.material = m;
    });

  // The tower. The first storey's floor is at y = 0; every storey faces the camera, some mirrored.
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
  const modules = new Map<string, THREE.Object3D>();
  const targets: THREE.Object3D[] = [];
  /** A spot: a house with a sign, or a lesson with a book standing on it. `cover` is its chapter's colour. */
  const spots: { key: string; module: THREE.Object3D; name: string; index: number; text: string; state: SpotState; cover?: string; shut?: boolean }[] = [];
  const shut = (c: number) => book.chapters[c]?.state === "locked";
  const coverOf = (c: number) => (shut(c) ? LOCKED_COVER : COVERS[c % COVERS.length]!);

  // Each storey's height, and its floor's, from the top: a storey's posts rise from its floor to the one over it.
  const heights = bays.map((storey) => ("title" in storey ? TITLE_BAY : BAY));
  const floors = heights.map((_, i) => -heights.slice(1, i + 1).reduce((a, b) => a + b, 0));
  const n = floors.length;
  /** The floor's height at a storey's place in the scroll (u, fractional): between two floors, part way. */
  const floorAt = (u: number) => {
    if (n === 0) return 0;
    if (u <= 0) return floors[0]! - u * heights[0]!;
    if (u >= n - 1) return floors[n - 1]! - (u - (n - 1)) * BAY;
    const i = Math.floor(u);
    return floors[i]! + (floors[i + 1]! - floors[i]!) * (u - i);
  };
  /** The other way round: where in the scroll a height is. */
  const storeyAt = (y: number) => {
    if (n === 0 || y >= floors[0]!) return n ? (floors[0]! - y) / heights[0]! : 0;
    for (let i = 0; i < n - 1; i++) if (y >= floors[i + 1]!) return i + (floors[i]! - y) / (floors[i]! - floors[i + 1]!);
    return n - 1 + (floors[n - 1]! - y) / BAY;
  };
  /** The roof's height, over the first storey: where Arandu lands. */
  const roofY = heights[0] ?? BAY;
  /** Where each chapter's chalkboard stands: the middle of its storey's floor. */
  const titles = new Map<string, number>();

  let bay = tower;
  bays.forEach((storey, i) => {
    bay = new THREE.Group();
    bay.position.y = floors[i]!;
    if (random() < 0.5) bay.scale.x = -1;
    tower.add(bay);
    const spot = (key: string, name: string, parent: THREE.Object3D, text: string, state: SpotState, cover?: string, closed?: boolean) =>
      spots.push({ key, module: place(name, parent), name, index: i, text, state, cover, shut: closed });

    place("Board", bay);
    place("Posts", bay).scale.y = heights[i]! / BAY;
    if ("title" in storey) {
      titles.set(chapterKey(storey.title), i);
      tint(bay, coverOf(storey.title));
      return;
    }
    if ("special" in storey) {
      spot(specialKey(storey.special), "Hammock", bay, SPECIAL, "locked", SPECIAL_COVER);
      return;
    }
    const c = storey.chapter;
    const chapter = book.chapters[c];
    const right = new THREE.Group(); // a side module is built for the left post: mirrored, it hangs on the right
    right.scale.x = -1;
    bay.add(right);
    [pick("side", SIDES), pick("side", SIDES), pick("front", FRONTS)].forEach((name, n) => {
      // A locked chapter's books are blank and cannot be taken: what it holds shows once it opens.
      const text = shut(c) ? "" : theme(chapter?.text ?? "");
      spot(lessonKey(c, n + 1), name, n === 1 ? right : bay, text, chapter?.lessons[n] ?? "locked", coverOf(c), shut(c));
    });
    spot(chapterKey(c), pick("house", HOUSES), bay, `Capítulo ${c + 1}\n${theme(chapter?.text ?? "")}`, chapter?.state ?? "locked", coverOf(c));
    tint(bay, coverOf(c));
  });
  // A board roofs the first storey; the pompom of the book's end hangs under the last floor, and two storeys of bare
  // posts run on under it: the tower shows no foot.
  const roof = tower.children[0];
  if (roof) {
    const top = place("Board", roof);
    top.position.y = roofY;
    tint(top, coverOf(0));
  }
  place("Bolinha", bay).position.set(...BOLINHA);
  for (const k of [1, 2]) place("Posts", bay).position.y = -k * BAY;
  tower.updateMatrixWorld(true);

  // A lesson's book: the landing's grand book in its chapter's cover, scaled to BOOK. Locked, it is dark; done, an amber
  // bookmark rises out of its top.
  const grand = props.size("BookGrand");
  const scale = BOOK / grand.y;
  const ribbon = new THREE.BoxGeometry(0.006 / scale, 0.16 / scale, 0.035 / scale);
  const ribbonInk = new THREE.MeshStandardMaterial({ color: tokenColor("amber-400"), roughness: 0.6 });
  owned.push(ribbon, ribbonInk);
  const volume = (title: string, cover: string, state: SpotState) => {
    const v = props.book("BookGrand", { cover, band: "cream-50" }, title);
    v.scale.setScalar(scale);
    v.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || !o.material.userData.print) return;
      const m = o.material as THREE.MeshStandardMaterial;
      if (state === "locked") m.color.setScalar(0.45);
    });
    if (state === "done") {
      const mark = new THREE.Mesh(ribbon, ribbonInk);
      mark.position.set(0, grand.y, 0);
      v.add(mark);
    }
    return v;
  };

  const volumes = new Map<string, THREE.Object3D>();
  // Each spot's seat, and what stands for it: a book on a lesson, and for a house its chapter's chalkboard, on the low
  // storey over it. Neither is ever mirrored: a book turns its cover to the front, and a chalkboard faces the camera.
  for (const { key, module, name, index, text, state, cover, shut: closed } of spots) {
    const seat = module.getObjectByName(`${name}Seat`);
    if (!seat) throw new Error(`tower.glb's ${name} has no seat`);
    const at = seat.getWorldPosition(new THREE.Vector3());
    seats.set(key, { at, bay: index });
    if (!HOUSES.includes(name)) {
      if (!cover) continue;
      const v = volume(text, cover, state);
      v.position.copy(at);
      v.rotation.y = -Math.PI / 2 + TURN; // a little turned: its spine shows, so it reads as a book
      tower.add(v);
      if (closed) continue;
      module.userData.spot = key;
      targets.push(module);
      v.userData.spot = key;
      targets.push(v);
      modules.set(key, v);
      volumes.set(key, v);
      continue;
    }
    const over = titles.get(key);
    if (over === undefined) continue;
    const sign = place("Chalkboard", tower);
    sign.position.set(0, floors[over]!, 0);
    sign.traverse((o) => {
      if (o instanceof THREE.Mesh && (o.material as THREE.Material).name === "TowerSign") o.material = face(text, state);
    });
    signs.set(key, sign);
    modules.set(key, module);
    module.userData.spot = key;
    sign.userData.spot = key;
    targets.push(module, sign);
  }
  const turning = [...signs.values()];


  // The picked spot stands out: its sign grows, and a line goes round its model (the model again, a little fatter,
  // seen from inside: only its rim shows past the model itself).
  const line = new THREE.MeshBasicMaterial({ color: tokenColor("amber-400"), side: THREE.BackSide });
  line.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n  transformed += normalize(normal) * 0.014;");
  };
  owned.push(line);
  const rims: THREE.Mesh[] = [];
  let hot: THREE.Object3D | null = null;
  const mark = (spot: string | null) => {
    hot = (spot && signs.get(spot)) || null;
    for (const rim of rims) rim.removeFromParent();
    rims.length = 0;
    const meshes: THREE.Mesh[] = [];
    (spot ? modules.get(spot) : undefined)?.traverse((o) => {
      if (o instanceof THREE.Mesh) meshes.push(o);
    });
    for (const mesh of meshes) {
      const rim = new THREE.Mesh(mesh.geometry, line);
      mesh.add(rim);
      rims.push(rim);
    }
  };
  mark(book.at);

  // Arandu lies awake in the door of the house of the chapter the person is on, looking out at whoever looks at that
  // storey; with the book done, in its last chapter's.
  const cat = makeCat({ ...catModel, scene: clone(catModel.scene) as THREE.Group }, "ink-400");
  cat.wear(league);
  const open = book.chapters.findIndex((chapter) => chapter.state === "open");
  const mine = open < 0 ? book.chapters.length - 1 : open;
  const home = seats.get(chapterKey(mine)) ?? { at: new THREE.Vector3(), bay: 0 };
  const facing = -Math.PI / 2;
  scene.add(cat.root);
  const pose: CatPose = { sit: 1, leap: 0, air: 0, stride: 0, tap: 0, lids: 0, ears: 0, hold: 0, lie: 0, rest: reduce ? 1 : 0, look: null };

  /** Each chapter's doorstep, from the top down: the floor in front of its house's door, where he lands to go in. */
  const doorsteps = book.chapters.flatMap((_, c) => {
    const house = seats.get(chapterKey(c));
    if (!house) return [];
    return [house.at.clone().add(new THREE.Vector3(0, 0, DOORSTEP))];
  });

  // His way in: from off the screen, on the left, onto the roof, then down from doorstep to doorstep to his own. `leg` is
  // the hop he is on, from way[leg] to way[leg + 1], and `along` how far through it; with reduced motion he is home.
  const way = [new THREE.Vector3(-2.6, roofY + 1.3, 0.4), new THREE.Vector3(0, roofY + 0.06, 0.1), ...doorsteps.slice(0, mine + 1)];
  const hop = clamp(WAY_IN / (way.length - 1), HOP[0], HOP[1]);
  let leg = reduce ? way.length - 1 : 0;
  let along = 0;
  // Then he settles in, as a cat does: walks in through the door, turns round once and a half on the cushion, and lies
  // down looking out. `settle` is how far into that he is (s).
  const door = doorsteps[mine] ?? home.at;
  const inward = Math.atan2(door.z - home.at.z, home.at.x - door.x);
  let settle = reduce ? SETTLED : 0;
  /** Set while he leaves: called once he is off the screen. */
  let gone: (() => void) | null = null;
  /** His bubble while he leaves, over his head and kept on the screen. */
  const bubble = stage.querySelector<HTMLElement>("[data-say]");
  // The app keeps a page it left as it was: the line from his last way out may still be up.
  if (bubble) delete bubble.dataset.on;
  const head = new THREE.Vector3();
  /** The page follows him down until the person moves it themselves. */
  let following = !reduce;
  const letGo = () => {
    following = false;
  };
  cat.root.position.copy(reduce ? home.at : way[0]!);
  cat.yaw.rotation.y = facing;

  // The scroll's gear: a storey of the track is a storey of the tower, as tall on the page as it is drawn.
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 80);
  const lowest = Math.max(0, bays.length - 1);
  let top = 0;
  let step = 1;
  let distance = 1;
  let first = 0; // where the camera starts: above the first storey when the screen is too short to show the roof
  const measure = () => {
    const width = stage.clientWidth;
    const height = scroller.clientHeight;
    if (!width || !height) return;
    const down = Math.max(ACROSS / (width / height), DOWN);
    step = (BAY * height) / down;
    distance = down / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    first = Math.min(0, (EYE + down / 2 - roofY - 0.5) / roofY);
    box.style.setProperty("--stage", String(height));
    box.style.setProperty("--bay", String(step));
    box.style.setProperty("--open", String(openHeight(width, height)));
    top = track.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  // A lesson's book, opened: an open copy (the landing's BookOpen) flies from its spot to before the camera, turning
  // its cover to you, and opens; shut, it flies back and the book on the spot shows again. `t` runs 0 to FLY + SPREAD.
  type Opened = { key: string; volume: THREE.Object3D; copy: THREE.Object3D; from: THREE.Vector3; fromQ: THREE.Quaternion; t: number; going: 1 | -1 };
  let opened: Opened | null = null;
  const facingYou = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  const flat = new THREE.Quaternion();
  const toward = new THREE.Quaternion();
  const there = new THREE.Vector3();
  const shelve = (o: Opened) => {
    o.copy.removeFromParent();
    o.volume.visible = true;
  };
  const openBook = (key: string | null) => {
    if (opened && opened.key !== key) {
      // Another book, or none: this one goes home, at once if another takes its place.
      if (key) {
        shelve(opened);
        opened = null;
      } else opened.going = -1;
    }
    const volume = key ? volumes.get(key) : undefined;
    if (!key || !volume || opened) {
      if (opened && opened.key === key) opened.going = 1; // the same book again: it stays open
      return;
    }
    const copy = props.open(volume);
    const fromQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), volume.rotation.y + Math.PI);
    // Its origin is the spine's foot, the shelved book's is its middle: it starts where the shelved one stands.
    const from = volume.position.clone().add(new THREE.Vector3(-SHUT_LEFT * BOOK, 0, 0).applyQuaternion(facingYou.clone().invert()).applyQuaternion(fromQ));
    volume.visible = false;
    scene.add(copy);
    opened = { key, volume, copy, from, fromQ, t: 0, going: 1 };
  };
  const showOpened = (dt: number) => {
    const o = opened;
    if (!o) return;
    const end = FLY + SPREAD;
    const was = o.t;
    o.t = reduce ? (o.going > 0 ? end : 0) : clamp(o.t + dt * o.going, 0, end);
    if (o.t === 0 && o.going < 0) {
      shelve(o);
      opened = null;
      onOpened(null);
      return;
    }
    if (o.t === end && was < end) onOpened(o.key);
    if (o.going < 0 && was === end) onOpened(null);
    const fly = smooth(clamp(o.t / FLY, 0, 1));
    const spread = smooth(clamp((o.t - FLY) / SPREAD, 0, 1));
    // As tall on the screen as the page's pages over it (book-data's openHeight).
    const tall = (openHeight(stage.clientWidth, stage.clientHeight) / stage.clientHeight) * 2 * OPEN_AT * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const s1 = tall / OPEN_HEIGHT;
    camera.localToWorld(there.set(-SHUT_LEFT * tall * (1 - spread), -tall / 2, -OPEN_AT));
    o.copy.position.lerpVectors(o.from, there, fly);
    o.copy.position.y += 0.15 * tall * Math.sin(Math.PI * fly);
    toward.slerpQuaternions(facingYou, flat, spread).premultiply(camera.quaternion);
    o.copy.quaternion.slerpQuaternions(o.fromQ, toward, fly);
    o.copy.scale.setScalar(BOOK / OPEN_HEIGHT + (s1 - BOOK / OPEN_HEIGHT) * fly);
    openTo(o.copy, SHUT + (LEAN - SHUT) * spread);
  };

  const start = performance.now();
  let before = start;
  let frame = 0;
  const draw = () => {
    const now = performance.now();
    const dt = Math.min((now - before) / 1000, 0.05);
    before = now;

    if (leg < way.length - 1) {
      along += dt / hop;
      if (along >= 1) {
        along = 0;
        leg++;
      }
      const a = way[leg]!;
      const b = way[leg + 1];
      if (b) {
        // A straight line from one spot to the next, and an arc over it; in the air he faces the way he goes.
        const e = along * along * (3 - 2 * along);
        cat.root.position.set(a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e + Math.sin(Math.PI * along) * 0.32, a.z + (b.z - a.z) * e);
        cat.yaw.rotation.y = Math.atan2(a.z - b.z, b.x - a.x);
        pose.leap = along;
        pose.air = Math.sin(Math.PI * along);
        pose.sit = pose.rest = 0;
      } else if (gone) {
        // Off the screen: the app goes on.
        gone();
        gone = null;
      } else {
        cat.root.position.copy(a);
        pose.leap = pose.air = 0;
      }
      if (following) scroller.scrollTop = top + clamp(storeyAt(cat.root.position.y - PERCH), 0, lowest) * step;
    } else if (settle < SETTLED) {
      settle = Math.min(SETTLED, settle + dt);
      if (settle < WALK_IN) {
        const e = smooth(settle / WALK_IN);
        cat.root.position.lerpVectors(door, home.at, e);
        cat.yaw.rotation.y = inward;
        pose.stride += dt * 1.6;
      } else if (settle < WALK_IN + ROUND) {
        // Round on the spot, in small steps, until he faces the door.
        cat.root.position.copy(home.at);
        cat.yaw.rotation.y = inward + 3 * Math.PI * smooth((settle - WALK_IN) / ROUND);
        pose.stride += dt * 1.3;
      } else {
        // He sits, then lies down.
        const e = (settle - WALK_IN - ROUND) / LIE_DOWN;
        cat.yaw.rotation.y = facing;
        pose.sit = Math.min(1, e * 2.5);
        pose.rest = smooth(e);
      }
    }

    const u = clamp((scroller.scrollTop - top) / step, first, lowest);
    const y = EYE + floorAt(u);
    camera.position.set(0, y + LIFT * distance, distance);
    camera.lookAt(0, y, 0);
    camera.updateMatrixWorld();
    showOpened(dt);
    key.target.position.set(0, y, 0);
    key.position.set(-0.8, y + 1.6, 2);
    fill.target.position.set(0, y, 0);
    fill.position.set(1.6, y + 0.3, 1.2);
    for (let i = 0; i < turning.length; i++) {
      const sign = turning[i]!;
      sign.scale.setScalar(sign === hot ? 1.3 : 1);
    }
    cat.update(pose, dt, (now - start) / 1000);
    if (bubble?.dataset.on !== undefined) {
      head.copy(cat.root.position).setY(cat.root.position.y + 0.45).project(camera);
      const half = bubble.offsetWidth / 2 + 8;
      const x = clamp(((head.x + 1) / 2) * stage.clientWidth, half, stage.clientWidth - half);
      const y = clamp(((1 - head.y) / 2) * stage.clientHeight, bubble.offsetHeight + 16, stage.clientHeight);
      bubble.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
    }
    renderer.render(scene, camera);
  };
  const loop = () => {
    draw();
    frame = requestAnimationFrame(loop);
  };

  measure();
  // The page opens at the top, where he comes in; with reduced motion, on his storey.
  scroller.scrollTop = reduce ? top + home.bay * step : 0;
  const observer = new ResizeObserver(() => {
    measure();
    if (reduce) draw();
  });
  observer.observe(scroller);
  observer.observe(track);
  for (const type of ["wheel", "touchstart", "pointerdown", "keydown"]) scroller.addEventListener(type, letGo, { passive: true });
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
  // While a book is open, a tap off its pages only shuts it (the page does that, tower.tsx): it picks nothing.
  const onClick = (e: MouseEvent) => {
    if (!opened) onPick(under(e));
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === "mouse") canvas.toggleAttribute("data-hot", under(e) !== null);
  };
  canvas.addEventListener("click", onClick);
  canvas.addEventListener("pointermove", onMove);

  // The app goes back to the Quarto: from wherever he is, he hops out of the door and up the doorsteps above him to the
  // roof, and leaps off it to the left, the page following him up.
  const onLeave = (e: Event) => {
    e.preventDefault();
    const { go, say } = (e as CustomEvent<Leave>).detail;
    if (bubble) {
      bubble.textContent = say;
      bubble.dataset.on = "";
    }
    if (reduce || gone) {
      go();
      return;
    }
    const here = cat.root.position.clone();
    // His own doorstep first when he is in or by his house, then every one above him, the nearest first.
    const up = doorsteps.filter((d, c) => d.y > here.y + 0.05 || (c === mine && here.distanceTo(d) > 0.05));
    up.sort((a, b) => a.y - b.y);
    way.splice(0, way.length, here, ...up, new THREE.Vector3(0, roofY + 0.06, 0.1), new THREE.Vector3(-2.6, roofY + 1.3, 0.4));
    leg = 0;
    along = 0;
    settle = SETTLED; // done, or cut short: he is on his way out
    following = true;
    gone = go;
  };
  addEventListener(LEAVE_EVENT, onLeave);

  return {
    /** The spot that stands out: the one the person picked. */
    select(spot: string | null) {
      mark(spot);
      if (reduce) draw();
    },
    /** A lesson's book opens before the camera; null, or a spot with no book, shuts the open one. */
    open(spot: string | null) {
      openBook(spot);
      if (reduce) draw();
    },
    stop() {
      removeEventListener(LEAVE_EVENT, onLeave);
      cancelAnimationFrame(frame);
      observer.disconnect();
      scroller.removeEventListener("scroll", draw);
      for (const type of ["wheel", "touchstart", "pointerdown", "keydown"]) scroller.removeEventListener(type, letGo);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("pointermove", onMove);
      owned.forEach((o) => o.dispose());
      props.dispose();
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
