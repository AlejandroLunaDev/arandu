import * as THREE from "three";
import { PRODUCT, RESEARCH } from "../book/book-data";
import { tokenColor } from "./palette";
import { DESK_TOP, SIDE_TABLE_TOP, SOFA_SEAT, WALL, type BookLook, type BookName, type Kit, type PropName, type Shape } from "./props";

// Each scene's room is composed here in metres and drawn over the page. A room follows one element
// of its scene, its anchor ([data-room]): the room's origin sits on the anchor's bottom-left corner,
// and the anchor's --room-k says how many pixels a metre is. The page's CSS keeps the layout; the
// room only dresses it.

/** The rooms and the cat lean back a little, so the shelves show their tops. */
export const TILT = 0.22;

/** Where the cat looks while he sits: a three-quarter turn toward the scene's text. */
const FACE = { left: -2.25, right: -0.9 };

/** A prop the physics moves or leans on: a direct child of the room's content, with its colliders. */
export type Solid = { object: THREE.Object3D; shapes: Shape[] };

/**
 * The hanging lamp. Its cord runs up from it to `top`, where it hangs from; the entrance lifts that
 * point by `lift`. `on` is false where the layout leaves the lamp out.
 */
export type Pendant = Solid & { top: number; lift: number; on: boolean };

/** The free stretch of plank around the seat: the cat's feet may go from `from` to `to`, at height `y`. */
export type Walk = { y: number; from: number; to: number };

/** A book the cat may take down to read: its prop, where it stands, its size and its copy that opens. */
export type Read = {
  object: THREE.Object3D;
  home: { p: THREE.Vector3; q: THREE.Quaternion };
  size: THREE.Vector3;
  open: THREE.Object3D;
};

export type Room = {
  anchor: HTMLElement;
  /** The scene the room belongs to: the cat moves to it while that scene scrolls in. */
  scene: HTMLElement;
  group: THREE.Group;
  /** The room's own frame, in metres, under the group's placement: the props and the seat live in it. */
  content: THREE.Group;
  /** The props that fall, tip, roll and get pushed. */
  props: Solid[];
  /** What holds them: the shelves' planks. */
  fixtures: Solid[];
  pendant: Pendant | null;
  /** Where he goes to sleep, in the content (m), and the seat it is on, from one end to the other; null where he sleeps on his plank. */
  /** His bed and the stretch of it he walks; edge is the z of its front edge, where he jumps on and off. */
  bed: { at: THREE.Vector3; from: number; to: number; edge: number } | null;
  /** How far out (m) he walks on the room's own floor: in front of the furniture; null without one. */
  front: number | null;
  /** The height (m) of the room's own floor, where what falls lands; null where the page's bottom is its floor. */
  ground: number | null;
  /** The letters of the scene's motto: they give under a push and spring back, and carry the cat. */
  letters: HTMLElement[];
  /** Where the cat sits, a point on a plank. */
  seat: THREE.Object3D;
  /** Where he may walk around the seat. */
  walk: Walk;
  /** The books next to that stretch, which he may take down to read. */
  reads: Read[];
  /** The cat's turn about Y while he sits here. */
  face: number;
  /** Pixels per metre. */
  k: number;
  /** Re-reads the anchor's scale and size: call it when the layout changes. */
  layout(): void;
  /** Follows the anchor: call it every frame, with the viewport size. */
  place(width: number, height: number): void;
  /**
   * The entrance of the page's first room, once the models are in: rise and drop go from 0 to 1.
   * The other rooms come in with their anchors, which the page animates.
   */
  reveal(rise: number, drop: number): void;
};

/** A book on a shelf: its shape, its look, the degree course it is about, and whether it leans. */
type Shelved = [BookName, BookLook, string] | [BookName, BookLook, string, "lean"];

const LOOK = {
  v8: { cover: "violet-800", band: "violet-400" },
  v6: { cover: "violet-600", band: "cream-300" },
  v4: { cover: "violet-400", band: "violet-800" },
  a8: { cover: "amber-800", band: "amber-400" },
  a6: { cover: "amber-600", band: "cream-100" },
  a4: { cover: "amber-400", band: "amber-800" },
  c3: { cover: "cream-300", band: "violet-600" },
  i7: { cover: "ink-700", band: "amber-400" },
} satisfies Record<string, BookLook>;

const GAP = 0.006;
/** How far past its balance a leaning book tips, so that it rests on its neighbour and stays. */
const LEAN = 0.08;

function put(parent: THREE.Object3D, o: THREE.Object3D, x: number, y: number, z = 0) {
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}

/** Stands books side by side from x, left to right; returns them and the x where the row ends. */
function standBooks(kit: Kit, parent: THREE.Object3D, x: number, y: number, books: Shelved[]) {
  let cx = x;
  const row: Omit<Read, "open">[] = [];
  for (const [name, look, career, lean] of books) {
    const s = kit.size(name);
    const b = kit.book(name, look, career);
    if (lean) {
      // Tipped onto its left neighbour: it stands on its bottom-left edge, its top-left corner
      // against the neighbour's side. Less than atan(thickness / height) and it would stand back up.
      const angle = Math.atan2(s.x, s.y) + LEAN;
      const start = cx - GAP;
      const shift = s.y * Math.sin(angle);
      b.rotation.z = angle;
      put(parent, b, start + shift + (s.x / 2) * Math.cos(angle), y + (s.x / 2) * Math.sin(angle));
      cx = start + shift + s.x * Math.cos(angle) + GAP;
    } else {
      put(parent, b, cx + s.x / 2, y);
      cx += s.x + GAP;
    }
    // Where it stands, kept apart from the prop that the physics will move.
    row.push({ object: b, home: { p: b.position.clone(), q: b.quaternion.clone() }, size: s });
  }
  return { end: cx, books: row };
}

/** How far the cat's body reaches ahead of his feet, or behind them, with a little room to spare. */
const BODY = 0.19;

/**
 * The free stretch of plank around the seat: from the prop on its left to the one on its right, or
 * to the plank's ends, less the cat's length. The room is not placed yet, so world boxes are its own.
 */
function walkway(content: THREE.Object3D, seat: THREE.Object3D): Walk {
  const { x, y } = seat.position;
  let from = -Infinity;
  let to = Infinity;
  const box = new THREE.Box3();
  for (const o of content.children) {
    const name = o.userData.prop as PropName | undefined;
    if (!name) continue;
    box.setFromObject(o);
    const plank = name.startsWith("Shelf");
    // Only what stands on this plank, or the plank itself.
    if (plank ? Math.abs(box.max.y - y) > 0.01 || box.min.x > x || box.max.x < x : box.min.y > y + 0.05 || box.max.y < y + 0.02) continue;
    if (plank) {
      from = Math.max(from, box.min.x);
      to = Math.min(to, box.max.x);
    } else if (box.max.x <= x) from = Math.max(from, box.max.x);
    else if (box.min.x >= x) to = Math.min(to, box.min.x);
  }
  return {
    y,
    from: Number.isFinite(from) ? Math.min(from + BODY, x) : x,
    to: Number.isFinite(to) ? Math.max(to - BODY, x) : x,
  };
}

/**
 * Lays books flat in a pile from x, spines to the front; returns the height of its top. Each book
 * lies with its top to the left, so its title reads left to right.
 */
function pileBooks(kit: Kit, parent: THREE.Object3D, x: number, y: number, books: Array<[BookName, BookLook, string]>) {
  let cy = y;
  books.forEach(([name, look, career], i) => {
    const s = kit.size(name);
    const b = kit.book(name, look, career);
    b.rotation.set(0, (i % 2 ? -1 : 1) * 0.04, Math.PI / 2);
    put(parent, b, x + s.y + (i % 2) * 0.012, cy + s.x / 2);
    cy += s.x;
  });
  return cy;
}

function seatAt(parent: THREE.Object3D, x: number, y: number) {
  const seat = new THREE.Object3D();
  return put(parent, seat, x, y);
}

function readK(anchor: HTMLElement) {
  // A room that fills its anchor's width says how many metres wide it is: a metre is that share of it.
  const metres = parseFloat(anchor.dataset.metres ?? "");
  if (metres > 0) return anchor.getBoundingClientRect().width / metres;
  const k = parseFloat(getComputedStyle(anchor).getPropertyValue("--room-k"));
  if (!Number.isFinite(k) || k <= 0) throw new Error("A [data-room] anchor needs --room-k");
  return k;
}

function base(anchor: HTMLElement, face: number) {
  const group = new THREE.Group();
  const content = new THREE.Group();
  group.add(content);
  const scene = anchor.closest<HTMLElement>("[data-scene]");
  if (!scene) throw new Error("A [data-room] anchor must sit inside a [data-scene]");
  // One object for the room's whole life: the stage keeps it and reads k from it every frame.
  const room: Room = {
    anchor,
    scene,
    group,
    content,
    props: [],
    fixtures: [],
    pendant: null,
    ground: null,
    bed: null,
    front: null,
    letters: [],
    seat: new THREE.Object3D(),
    walk: { y: 0, from: 0, to: 0 },
    reads: [],
    face,
    k: readK(anchor),
    layout() {
      room.k = readK(anchor);
    },
    reveal() {},
    place(width, height) {
      const r = anchor.getBoundingClientRect();
      group.position.set(r.left - width / 2, height / 2 - r.bottom, 0);
      group.scale.setScalar(room.k);
      group.rotation.x = TILT;
      group.updateMatrixWorld(true);
    },
  };
  return room;
}

/** The furniture: it holds what falls on it, like the shelves, and never moves. */
const FURNITURE = new Set<PropName>(["Desk", "ChairGamer", "Sofa", "SideTable", "PaperBin", "Mug", "Notebook"]);
/** What only dresses the room: on the wall, or on the desk, out of the physics. */
const DECOR = new Set<PropName>(["NeonSign", "NeonApp", "StringLights", "Tv", "FrameTall", "FrameSquare", "GithubPlaque", "MottoSign"]);
/** The frames hang larger than they were modelled, to read from across the room. */
const FRAME_SCALE = 1.3;

/** Hands the props laid in a room's content to the physics: the shelves and the furniture hold, the rest moves. */
function collect(room: Room, kit: Kit) {
  for (const object of room.content.children) {
    const name = object.userData.prop as PropName | undefined;
    if (!name || name === "BookOpen" || DECOR.has(name)) continue;
    (name.startsWith("Shelf") || FURNITURE.has(name) ? room.fixtures : room.props).push({ object, shapes: kit.shapes(name) });
  }
}

/** It is always night in Arandu's room, whatever the page's theme: these are its wall and its floor. */
const WALL_COLOR = "ink-850";
const FLOOR_COLOR = "ink-900";
/** How far (m) the floor runs out from the wall. */
const FLOOR_DEPTH = 6;
/** How far forward of the shelves' middle the wall-hung props stand: on the wall itself. */
const ON_WALL = -WALL;

/** The wall behind the room and the floor under it, far wider than the room so their edges never show. */
function wallAndFloor(parent: THREE.Object3D, width: number, height: number, floor: boolean) {
  const paint = (color: string) => new THREE.MeshStandardMaterial({ color: tokenColor(color), roughness: 0.95 });
  put(parent, new THREE.Mesh(new THREE.PlaneGeometry(width * 4, height * 3), paint(WALL_COLOR)), width / 2, height * 1.5, ON_WALL - 0.001);
  if (!floor) return;
  // Deep enough that, leaning back with the room, it runs past the screen's bottom edge.
  const ground = put(
    parent,
    new THREE.Mesh(new THREE.PlaneGeometry(width * 4, FLOOR_DEPTH), paint(FLOOR_COLOR)),
    width / 2,
    0,
    ON_WALL + FLOOR_DEPTH / 2,
  );
  ground.rotation.x = -Math.PI / 2;
}

/** A prop at x, y (m), z out from the shelves' middle, turned `turn` degrees about the vertical. */
function place(content: THREE.Object3D, kit: Kit, name: PropName, x: number, y: number, z = 0, turn = 0) {
  const o = put(content, kit.make(name), x, y, z);
  o.rotation.y = (turn * Math.PI) / 180;
  return o;
}

/** How far out from a shelf's middle (m) the toys lie: on every plank's depth (WALL each side), and in the bin's. */
const TOY_DEPTH = 0.05;
/** How thick a shelf's plank is (build.py, shelf): what hangs under one hangs from this far below its top. */
const SHELF_PLANK = 0.05;
/** Where the motto's sign hangs from the middle shelf: x from its left end, z out from its middle; smaller on a phone. */
const MOTTO_SIGN = { x: 1.15, z: 0.1, phone: 0.75 };

/** The two books that are about Arandu itself, and not a course: what it is, and why it exists. */
const ownBooks = (name: BookName): Array<[BookName, BookLook, string]> => [
  [name, LOOK.v6, PRODUCT],
  [name, LOOK.i7, RESEARCH],
];

/** Marks Arandu's own books: they open their own pages and keep their titles (run-stage). */
function markOwn(content: THREE.Object3D) {
  for (const o of content.children) {
    if (o.userData.career === RESEARCH) o.userData.research = true;
    if (o.userData.career === PRODUCT) o.userData.product = true;
  }
}

/** Where the side table stands, and how far apart (m) its two books stand face out on it, against its back board. */
const TABLE = { x: 6.65, z: 0.45, gap: 0.03, back: -0.06 + 0.009 };
/** On a phone's top shelf, the own books' backs stand this close to the wall (WALL behind the plank's middle). */
const OWN_ON_SHELF = -WALL + 0.009;

/** Arandu's own two books standing side by side around x, their covers to you, their backs at depth back. */
function ownCovers(kit: Kit, content: THREE.Object3D, name: BookName, x: number, y: number, back: number) {
  ownBooks(name).forEach(([name, look, title], i) => {
    const s = kit.size(name);
    const b = kit.book(name, look, title);
    // Turned a quarter, the front cover faces you and the spine is on its left.
    b.rotation.y = -Math.PI / 2;
    put(content, b, x + (i - 0.5) * (s.z + TABLE.gap), y, back + s.x / 2);
  });
}

/** The round side table right of the sofa, Arandu's own two books standing on it with their covers to you. */
function sideTable(kit: Kit, content: THREE.Object3D) {
  place(content, kit, "SideTable", TABLE.x, 0, TABLE.z);
  ownCovers(kit, content, "BookGrand", TABLE.x, SIDE_TABLE_TOP, TABLE.z + TABLE.back);
}

/**
 * The three shelves, each given by its plank's middle: the lowest, where the cat waits among books
 * and his yarn; the middle one, with books, the Farol Santander, a pile of books and a little lamp;
 * the top one, short, with the plant over its edge and a few books. On a phone, with no side table,
 * Arandu's own two books stand on the top one instead, their covers to you, where they are seen first.
 */
function shelves(kit: Kit, content: THREE.Object3D, low: [number, number], mid: [number, number], top: [number, number], phone: boolean) {
  const x0 = low[0] - 0.8;
  put(content, kit.make("ShelfLarge"), low[0], low[1]);
  const left = standBooks(kit, content, x0 + 0.1, low[1], [
    ["Book", LOOK.v6, "Psicologia"],
    ["BookTall", LOOK.a6, "Medicina"],
    ["BookSlim", LOOK.c3, "Letras"],
    ["BookThick", LOOK.v8, "Engenharia"],
    ["BookShort", LOOK.a4, "Filosofia", "lean"],
  ]);
  const seat = seatAt(content, left.end + 0.25, low[1]);
  const right = standBooks(kit, content, left.end + 0.52, low[1], [
    ["BookPaperback", LOOK.a8, "Música"],
    ["Book", LOOK.v4, "Economia"],
  ]);
  // Its strand runs back along the plank, to the shelf's end.
  const yarn = put(content, kit.make("YarnBall"), x0 + 1.33, low[1], TOY_DEPTH);
  yarn.rotation.y = 0.6;

  const x1 = mid[0] - 0.8;
  put(content, kit.make("ShelfLarge"), mid[0], mid[1]);
  standBooks(kit, content, x1 + 0.07, mid[1], [
    ["Book", LOOK.a8, "Direito"],
    ["BookTall", LOOK.v4, "Arquitetura"],
    ["BookSlim", LOOK.i7, "Química"],
    ["Book", LOOK.c3, "Nutrição"],
    ["BookThick", LOOK.v6, "Administração"],
    ["BookShort", LOOK.a4, "Jornalismo"],
  ]);
  put(content, kit.make("FarolSantander"), x1 + 0.63, mid[1]);
  // The pile reaches 0.37 m right of where it starts; the lamp's dome is 0.14 m wide each side.
  pileBooks(kit, content, x1 + 0.69, mid[1], [
    ["BookThick", LOOK.v6, "Biologia"],
    ["BookShort", LOOK.c3, "Design"],
  ]);
  put(content, kit.make("LampMushroom"), x1 + 1.4, mid[1]);
  // The motto hangs on two strings under the lamp's end of the plank, near its front edge.
  put(content, kit.make("MottoSign"), x1 + MOTTO_SIGN.x, mid[1] - SHELF_PLANK, MOTTO_SIGN.z).scale.setScalar(phone ? MOTTO_SIGN.phone : 1);

  // The plant stands POT_EDGE (0.12 m) behind the shelf's front edge (0.17 m from its middle).
  const x2 = top[0] - 0.5;
  put(content, kit.make("ShelfMedium"), top[0], top[1]);
  // On a phone the own books are the grand ones, as on the side table: they fill the plank, so the plant stays off.
  if (phone) ownCovers(kit, content, "BookGrand", top[0], top[1], OWN_ON_SHELF);
  else {
    put(content, kit.make("PlantPot"), x2 + 0.25, top[1], 0.05);
    standBooks(kit, content, x2 + 0.6, top[1], [
      ["BookSlim", LOOK.v8, "Física"],
      ["BookPaperback", LOOK.a6, "Odontologia"],
      ["BookShort", LOOK.v4, "Pedagogia"],
    ]);
  }

  return { seat, left, right };
}

/** The wide room: the desk under the TV on the left, the neon, then the shelves over the sofa. */
const WIDE = { width: 7.45, height: 3.35 };
/** The phone's room: the TV on top, the neon, then the shelves. */
const TALL = { width: 2, height: 4.36 };

/**
 * The pencils in the cup, one to each quarter of it (sx, sz), leaning out toward its rim: they never
 * touch each other or its walls until it tips.
 */
const PENCILS: Array<[PropName, number, number]> = [
  ["PencilAmber", -1, 1],
  ["PencilViolet", 1, 1],
  ["PencilViolet", -1, -1],
  ["PencilAmber", 1, -1],
];
const PENCIL_OFF = 0.016;
const PENCIL_LEAN = (6 * Math.PI) / 180;
/** The notebook lies on the desk's felt mat. */
const DESK_MAT = DESK_TOP + 0.006;

/**
 * The hero: Arandu's room at night. On a wide screen, a gamer chair at a desk with a notebook, the TV
 * on the wall above it, the neon sign and fairy lights, three shelves of books where the cat waits,
 * and a sofa under them. On a phone, the TV, the neon and the shelves, one above the other.
 */
export function heroRoom(anchor: HTMLElement, kit: Kit): Room {
  // The page's CSS says which room fits (--room-layout: tall on a phone).
  // shortcut: the layout is chosen once, at load; crossing the breakpoint keeps it until a reload.
  const phone = getComputedStyle(anchor).getPropertyValue("--room-layout").trim() === "tall";
  const size = phone ? TALL : WIDE;
  anchor.dataset.metres = String(size.width);
  anchor.style.setProperty("--room-aspect", String(size.width / size.height));
  const room = base(anchor, FACE.left);
  const { content } = room;
  wallAndFloor(content, size.width, size.height, !phone);
  if (!phone) room.ground = 0;

  let row: ReturnType<typeof shelves>;
  if (phone) {
    row = shelves(kit, content, [1, 0.35], [1, 1.1], [1, 1.85], true);
    // The way into the app high enough that its panel (0.21 m) clears the grand books' tops on the shelf under
    // it, and the neon over it.
    place(content, kit, "NeonApp", 1, 2.5, ON_WALL);
    place(content, kit, "NeonSign", 1, 2.94, ON_WALL);
    place(content, kit, "Tv", 1, 3.81, ON_WALL).scale.setScalar(1.75 / 2.2);
    // The link to Arandu's code hangs from a nail under the TV's right corner.
    place(content, kit, "GithubPlaque", 1.62, 3.12, ON_WALL);
  } else {
    place(content, kit, "ChairGamer", 0.85, 0, 0.72, 60);
    place(content, kit, "Desk", 2.15, 0, 0.32);
    place(content, kit, "Notebook", 2.15, DESK_MAT, 0.38);
    place(content, kit, "Trophy", 1.7, DESK_TOP, 0.24, -8);
    place(content, kit, "GradCap", 1.47, DESK_TOP, 0.36, -25);
    place(content, kit, "PencilCup", 2.7, DESK_TOP, 0.22);
    // Its pencils stand in it, each leaning its own way, the cup's floor under them.
    for (const [name, sx, sz] of PENCILS)
      place(content, kit, name, 2.7 + sx * PENCIL_OFF, DESK_TOP + 0.01, 0.22 + sz * PENCIL_OFF).rotation.set(sz * PENCIL_LEAN, 0, -sx * PENCIL_LEAN);
    place(content, kit, "Mug", 2.55, DESK_TOP, 0.45, 20);
    // A held toy keeps its depth (physics.ts, drag), so the bin and its sheets stand at TOY_DEPTH: a sheet
    // dropped over the bin falls in, and one dropped over a shelf lies on it.
    place(content, kit, "PaperBin", 3.3, 0, TOY_DEPTH);
    // Two sheets in the bin, one that missed it: toys, like his yarn.
    place(content, kit, "PaperBallLarge", 3.28, 0.006, TOY_DEPTH + 0.01);
    place(content, kit, "PaperBallSmall", 3.33, 0.14, TOY_DEPTH - 0.02, 40);
    place(content, kit, "PaperBall", 3.55, 0, TOY_DEPTH);
    place(content, kit, "Sofa", 4.9, 0, 0.5);
    // Its right seat cushion, in front of the knitted pillow: right under his shelf's end, a hop down.
    // The seat's cushions reach 1.02 m out (props.ts, Sofa).
    room.bed = { at: new THREE.Vector3(5.25, SOFA_SEAT, 0.62), from: 4.01, to: 5.81, edge: 1 };
    room.front = 1.2;
    place(content, kit, "Tv", 2.3, 2.25, ON_WALL);
    // Two universities' photos on the wall left of the TV, over the chair.
    place(content, kit, "FrameTall", 0.42, 2.5, ON_WALL).scale.setScalar(FRAME_SCALE);
    place(content, kit, "FrameSquare", 0.9, 2.15, ON_WALL).scale.setScalar(FRAME_SCALE);
    // The link to Arandu's code hangs from a nail under the TV's right corner, past the desk's end.
    place(content, kit, "GithubPlaque", 3.22, 1.4, ON_WALL);
    place(content, kit, "NeonSign", 4.05, 2.5, ON_WALL);
    // The way into the app, under the neon.
    place(content, kit, "NeonApp", 4.05, 2.05, ON_WALL);
    place(content, kit, "StringLights", 3.55, 3.22, ON_WALL);
    row = shelves(kit, content, [5.3, 1.45], [6.5, 2.2], [5.15, 2.85], false);
    sideTable(kit, content);
  }

  markOwn(content);
  room.seat = row.seat;
  room.walk = walkway(content, row.seat);
  // The books on either side of his stretch, each with a copy that opens, hidden until he reads it.
  room.reads = [row.left.books[row.left.books.length - 1]!, row.right.books[0]!].map((b) => {
    const open = kit.open(b.object);
    open.visible = false;
    content.add(open);
    return { ...b, open };
  });
  room.letters = [...room.scene.querySelectorAll<HTMLElement>("[data-letter]")];
  room.reveal = (rise) => {
    content.position.y = -0.5 * (1 - rise);
  };
  collect(room, kit);
  return room;
}
