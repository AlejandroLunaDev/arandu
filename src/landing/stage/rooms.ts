import * as THREE from "three";
import type { BookLook, BookName, Kit, PropName, Shape } from "./props";

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

/** A book the cat may take down to read: its prop, where it stands, its size and the token of its cover. */
export type Read = {
  object: THREE.Object3D;
  home: { p: THREE.Vector3; q: THREE.Quaternion };
  size: THREE.Vector3;
  cover: string;
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
  /** The letters of the scene's motto: they give under a push and spring back, and carry the cat. */
  letters: HTMLElement[];
  /** Where the cat sits, a point on a plank. */
  seat: THREE.Object3D;
  /** Where he may walk around the seat. */
  walk: Walk;
  /** The books next to that stretch, which he may take down to read. */
  reads: Read[];
  /** The bulb of the room's main lamp: the stage hangs a warm light there. */
  light: THREE.Object3D;
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
  const row: Read[] = [];
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
    row.push({ object: b, home: { p: b.position.clone(), q: b.quaternion.clone() }, size: s, cover: look.cover });
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
    letters: [],
    seat: new THREE.Object3D(),
    walk: { y: 0, from: 0, to: 0 },
    reads: [],
    light: group,
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

/** Hands the props laid in a room's content to the physics: the shelves hold, the rest moves. */
function collect(room: Room, kit: Kit) {
  for (const object of room.content.children) {
    const name = object.userData.prop as PropName | undefined;
    if (!name || name === "LampPendant") continue;
    (name.startsWith("Shelf") ? room.fixtures : room.props).push({ object, shapes: kit.shapes(name) });
  }
}

/** The pendant lamp's shade hangs this far below the top of the pinned scene, and never lower. */
const SHADE_DROP = 0.9;
const SHADE_LOWEST = 1.75;

/** The hero: a long shelf of books where the cat waits, a shorter one above it, a hanging lamp. */
export function heroRoom(anchor: HTMLElement, kit: Kit): Room {
  const room = base(anchor, FACE.left);
  const { content } = room;

  // Lower shelf: books, the cat, and a ball of yarn that lost a strand toward him.
  put(content, kit.make("ShelfLarge"), 0.8, 0);
  const left = standBooks(kit, content, 0.1, 0, [
    ["Book", LOOK.v6, "Psicologia"],
    ["BookTall", LOOK.a6, "Medicina"],
    ["BookSlim", LOOK.c3, "Letras"],
    ["BookThick", LOOK.v8, "Engenharia"],
    ["BookShort", LOOK.a4, "Filosofia", "lean"],
  ]);
  const seat = seatAt(content, left.end + 0.25, 0);
  const right = standBooks(kit, content, left.end + 0.52, 0, [
    ["BookPaperback", LOOK.a8, "Música"],
    ["Book", LOOK.v4, "Economia"],
  ]);
  // Its strand runs back along the plank, to the shelf's end.
  const yarn = put(content, kit.make("YarnBall"), 1.33, 0, 0.05);
  yarn.rotation.y = 0.6;

  // Upper shelf, its middle at (1.25, 1.0): the plant hangs over its edge, books lie in a pile, a
  // little lamp glows. Every prop is a child of the content, so the physics moves it in one frame.
  const UX = 1.25;
  const UY = 1.0;
  put(content, kit.make("ShelfMedium"), UX, UY);
  // The plant stands POT_EDGE (0.12 m) behind the shelf's front edge (0.17 m from its middle).
  put(content, kit.make("PlantPot"), UX - 0.36, UY, 0.05);
  // The pile reaches 0.37 m right of where it starts; the lamp's dome is 0.14 m wide each side.
  pileBooks(kit, content, UX - 0.21, UY, [
    ["BookThick", LOOK.v6, "Biologia"],
    ["BookShort", LOOK.c3, "Design"],
    ["BookPaperback", LOOK.i7, "História"],
  ]);
  const mushroom = put(content, kit.make("LampMushroom"), UX + 0.33, UY);

  // The pendant lamp hangs on a short cord from above the top of the screen. Where the copy sits
  // above the room (one column), its cord would cross the copy: there the anchor's --room-pendant is
  // 0 and the room goes without it.
  const lamp = kit.make("LampPendant");
  const cord = lamp.getObjectByName("LampPendantCord");
  put(content, lamp, 0.35, SHADE_LOWEST);
  const pendant: Pendant = { object: lamp, shapes: kit.shapes("LampPendant"), top: SHADE_LOWEST, lift: 0, on: true };
  let lampY = SHADE_LOWEST;

  room.seat = seat;
  room.walk = walkway(content, seat);
  // The books on either side of his stretch.
  room.reads = [left.books[left.books.length - 1], right.books[0]];
  room.pendant = pendant;
  room.letters = [...room.scene.querySelectorAll<HTMLElement>("[data-letter]")];
  room.layout = () => {
    room.k = readK(anchor);
    pendant.on = lamp.visible = getComputedStyle(anchor).getPropertyValue("--room-pendant").trim() !== "0";
    const glow = pendant.on ? lamp : mushroom;
    room.light = glow.getObjectByName(pendant.on ? "LampPendantLight" : "LampMushroomLight") ?? glow;
    // How far the top of the pinned scene is above the shelf; the cord reaches a little past it.
    const pin = anchor.closest<HTMLElement>("[data-pin]") ?? anchor;
    const above = (anchor.getBoundingClientRect().bottom - pin.getBoundingClientRect().top) / room.k;
    lampY = Math.max(SHADE_LOWEST, above - SHADE_DROP);
    const length = Math.max(0.2, above - lampY + 0.4);
    lamp.position.set(0.35, lampY + pendant.lift, 0);
    lamp.quaternion.identity();
    if (cord) cord.scale.y = length;
    pendant.top = lampY + length;
  };
  room.reveal = (rise, drop) => {
    content.position.y = -0.5 * (1 - rise);
    pendant.lift = 1.6 * (1 - drop);
    lamp.position.y = lampY + pendant.lift;
  };
  room.layout();
  collect(room, kit);
  return room;
}

/** "O Arandu te conhece": two shelves on the wall beside the phone; the cat waits on the lower one. */
export function knowYouRoom(anchor: HTMLElement, kit: Kit): Room {
  const room = base(anchor, FACE.right);
  const { content } = room;

  // The middle shelf, its middle at (0.66, 0.9), and the top one at (0.66, 1.9).
  const X = 0.66;
  put(content, kit.make("ShelfMedium"), X, 0.9);
  const row = standBooks(kit, content, X - 0.49, 0.9, [
    ["BookThick", LOOK.a8, "Arquitetura"],
    ["BookSlim", LOOK.c3, "Nutrição"],
  ]);
  const seat = seatAt(content, row.end + 0.27, 0.9);
  const lamp = put(content, kit.make("LampClassic"), X + 0.34, 0.9);

  put(content, kit.make("ShelfSmall"), X, 1.9);
  put(content, kit.make("LampDesk"), X - 0.18, 1.9);
  put(content, kit.book("BookTall", LOOK.v4, "Direito"), X + 0.07, 1.9);
  put(content, kit.make("Ball"), X + 0.19, 1.9, 0.04);

  room.seat = seat;
  room.walk = walkway(content, seat);
  room.reads = [row.books[row.books.length - 1]];
  room.light = lamp.getObjectByName("LampClassicLight") ?? lamp;
  collect(room, kit);
  return room;
}
