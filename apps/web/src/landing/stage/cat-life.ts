import * as THREE from "three";
import { PAWS, TAP_HITS } from "./cat";
import { SINK, type Ledge, type RoomPhysics } from "./physics";
import { TILT, type Read, type Room } from "./rooms";

// Arandu's own life, while a scene stays put. After a few quiet seconds he does something: he turns
// round where he sits, walks his stretch of plank, jumps down to walk the motto's letters (they give
// under his paws), or takes a book down and reads it. Anything on the page stops him: a walk stops
// where it is, a jump or a tap ends first, a book goes back to its shelf. A tap on him startles him.
// Throw his ball of yarn and he drops whatever he does: he watches it land, goes after it, bats it
// about, picks it up in his mouth and carries it back to its place.
// Each doing is a generator that runs one step a frame. Everything here is in the room's content
// frame, in metres.

/** Seconds of quiet before he does something of his own; seconds between two of his doings. */
const IDLE = 8;
const REST: [number, number] = [10, 20];
/** Walking speed (m/s), the length of a walk cycle (m), how fast he turns (rad/s). */
const SPEED = 0.3;
const STRIDE = 0.35;
const TURN = 4;
/** Seconds of the jump clip (crouch, launch, tuck, reach, land) and of the tap clip. */
const JUMP = 1;
const TAP = 1.0667;
/** How far down to the letters he jumps, at most, and how far across. */
const DROP = 1;
const ACROSS = 0.8;
// The letters lie right under the plank: he walks them, and jumps between them and the plank, at
// FRONT toward the camera, his jump bowing OUT past the plank's edge so he goes round it.
const FRONT = 0.1;
const OUT = 0.25;
/** He reads this far out from the shelf's middle, toward the wall. */
const READ_Z = -0.05;
/** Seconds he reads, at most; seconds a line takes; lines down the page before he starts it again. */
const READ: [number, number] = [18, 28];
/** Seconds he sleeps. */
const SLEEP: [number, number] = [40, 80];
const LINE = 1.3;
const LINES = 5;

/** How small his toy shows while he carries it. */
export const CARRY = 0.5;

/** How far ahead (m) he looks for something in his way; the highest (m) he leaps up. */
const AHEAD = 0.12;
const LEAP_UP = 1.5;
/** How far (m) from the screen's sides he keeps his feet. */
const ROOM = 0.25;
/** How much faster than his stroll he trots off the screen, and how far (m) past its right side he goes. */
const HURRY = 5;
const PAST = 0.5;

const FACE_CAMERA = -Math.PI / 2;
const RIGHT = 0;
const LEFT = -Math.PI;

export type LifePose = {
  /** His feet. */
  pos: THREE.Vector3;
  yaw: number;
  sit: number;
  leap: number;
  air: number;
  /** How far above the line he jumps along he is, mid-jump. */
  lift: number;
  stride: number;
  tap: number;
  lids: number;
  ears: number;
  /** How far he has a book up in his paws, 0..1. */
  hold: number;
  /** How far he lies down, 0..1. */
  lie: number;
  /** What he looks at, or null to leave his eyes to the stage. */
  look: THREE.Vector3 | null;
};

export type Life = {
  readonly pose: LifePose;
  /** The room he lives in, or -1 while the scroll carries him. */
  readonly room: number;
  /** What he carries in his mouth: the stage keeps it there. */
  readonly carried: THREE.Object3D | null;
  /** The open book in his paws: the stage keeps it there. */
  readonly held: THREE.Object3D | null;
  /** In the middle of a jump or a tap: the scroll waits for him. */
  busy(): boolean;
  /** He has settled in room i, at `at`, turned by yaw. */
  enter(room: number, at: THREE.Vector3, yaw: number): void;
  /** The scroll takes him: what he does stops, and he leaves once he stands on his feet. */
  leave(): void;
  /** Something happened on the page. */
  stir(): void;
  /** A tap on him. */
  poke(): void;
  /** His toy was thrown, in room i: he goes to fetch it. */
  fetch(room: number, toy: THREE.Object3D): void;
  /** He gets down to the floor and trots off the screen's right side; then done. Nothing stops him. */
  exit(done: () => void): void;
  /** Just entered: he trots in from off the screen's right side, the way he left, to his seat. */
  comeIn(): void;
  /** One frame: idle is how long the page has been quiet, in seconds. */
  update(dt: number, idle: number): void;
  dispose(): void;
};

type Doing = Generator<void, void, unknown>;
/** A move that may find its goal out of his reach: false then. */
type Going = Generator<void, boolean, unknown>;

/** Where he jumps down to the letters: from `top` on the plank to `land`, and how far along they go. */
type Drop = { top: number; land: number; lo: number; hi: number; y: number };

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** How small the open book shows in his paws, and its height at full size (blender/props/build.py OPEN). */
export const HELD_SCALE = 0.7;
export const OPEN_HEIGHT = 0.4;
/** How far (rad) each half of the book stands off lying flat open: shut, and as he reads it. */
export const SHUT = Math.PI / 2;
const READING = 0.31;

/** Opens BookOpen: each half and the leaf on the right turn about the spine, `a` off lying flat. */
export const openTo = (book: THREE.Object3D, a: number) => {
  const right = book.getObjectByName("BookOpenRight");
  const leftHalf = book.getObjectByName("BookOpenLeft");
  const leaf = book.getObjectByName("BookOpenLeaf");
  if (right) right.rotation.y = -a;
  if (leftHalf) leftHalf.rotation.y = a;
  if (leaf) leaf.rotation.y = -a;
};

export function makeLife(rooms: Room[], world: (room: number) => RoomPhysics | null, still: boolean): Life {
  const pose: LifePose = {
    pos: new THREE.Vector3(),
    yaw: 0,
    sit: 1,
    leap: 0,
    air: 0,
    lift: 0,
    stride: 0,
    tap: 0,
    lids: 0,
    ears: 0,
    hold: 0,
    lie: 0,
    look: null,
  };
  let room = -1;
  let dt = 0;
  let job: Doing | null = null;
  /** A stir stops the doing: false for a startle, which runs its course. */
  let calm = true;
  let stop = false;
  let leaving = false;
  let busy = false;
  let exiting = false;
  let speed = SPEED;
  let rest = 0;
  let last = "";
  let sitTo = 1;
  let lidsTo = 0;
  let earsTo = 0;
  let holdTo = 0;
  let lieTo = 0;
  /** The room whose props wait while he fetches. */
  let fetching: RoomPhysics | null = null;
  let carried: THREE.Object3D | null = null;
  let held: THREE.Object3D | null = null;
  const tasks: Doing[] = [];
  const gaze = new THREE.Vector3();

  const run = (task: Doing) => {
    tasks.push(task);
    return task;
  };

  const end = () => {
    const doing = job;
    job = null;
    doing?.return();
    stop = false;
    calm = true;
    busy = false;
    sitTo = 1;
    lidsTo = 0;
    earsTo = 0;
    holdTo = 0;
    lieTo = 0;
    // A turn cut short leaves him anywhere round the circle: take the same heading near the front.
    const yaw = Math.atan2(Math.sin(pose.yaw), Math.cos(pose.yaw));
    Object.assign(pose, { yaw: yaw > Math.PI / 2 ? yaw - 2 * Math.PI : yaw, tap: 0, air: 0, lift: 0, leap: 0, look: null });
    rest = rand(...REST);
  };

  // ---------------------------------------------------------------- moves

  function* pause(seconds: number): Doing {
    for (let t = 0; t < seconds; t += dt) yield;
  }

  function* stand(): Doing {
    sitTo = 0;
    while (pose.sit > 0.1) yield;
  }

  function* face(yaw: number): Doing {
    if (Math.abs(yaw - pose.yaw) > 0.6) yield* stand();
    while (Math.abs(yaw - pose.yaw) > 0.005) {
      const step = clamp(yaw - pose.yaw, -TURN * dt, TURN * dt);
      pose.yaw += step;
      // Standing, he steps round.
      if (sitTo === 0) pose.stride += Math.abs(step) * 0.25;
      yield;
    }
    pose.yaw = yaw;
  }

  function* sitDown(yaw: number): Doing {
    yield* face(yaw);
    sitTo = 1;
    while (pose.sit < 0.9) yield;
  }

  /** A walk to x (and z), jumping whatever stands in the way: he never shoves things walking. */
  function* walkTo(x: number, z = pose.pos.z): Doing {
    const w = room >= 0 ? world(room) : null;
    // One way only: he never turns back halfway.
    const dir = x >= pose.pos.x ? 1 : -1;
    const plank = room >= 0 ? plankAt(rooms[room]!, pose.pos.y) : null;
    for (let hops = 0; w && hops < 4; hops++) {
      const b = w.blocker(pose.pos.x + dir * 0.05, x + dir * AHEAD, pose.pos.y);
      if (!b) break;
      const near = dir > 0 ? b.min : b.max;
      const far = dir > 0 ? b.max : b.min;
      const short = near - dir * (AHEAD + 0.08);
      const land = far + dir * 0.22;
      // Where he is going stands under it, or there is no plank past it: he stops short.
      if ((far - x) * dir > 0 || (plank && (land < plank.left + 0.1 || land > plank.right - 0.1))) {
        if ((short - pose.pos.x) * dir > 0) yield* plod(short, z);
        return;
      }
      if ((short - pose.pos.x) * dir > 0) yield* plod(short, pose.pos.z);
      yield* jump(new THREE.Vector3(land, pose.pos.y, z), b.top - pose.pos.y + 0.08);
      if ((x - pose.pos.x) * dir <= 0) return;
    }
    yield* plod(x, z);
  }

  /** A plain walk, straight there. */
  function* plod(x: number, z: number): Doing {
    const dx = x - pose.pos.x;
    const dz = z - pose.pos.z;
    const far = Math.hypot(dx, dz);
    if (far < 0.005) return;
    yield* stand();
    yield* face(dx >= 0 ? RIGHT : LEFT);
    for (let done = 0; done < far;) {
      const step = Math.min(speed * dt, far - done);
      done += step;
      pose.pos.x += (dx * step) / far;
      pose.pos.z += (dz * step) / far;
      pose.stride += step / STRIDE;
      yield;
    }
  }

  /** A jump to `to`, arcing `height` up, and bowing `out` toward the camera on the way. */
  function* jump(to: THREE.Vector3, height: number, out = 0): Doing {
    yield* stand();
    yield* face(to.x >= pose.pos.x ? RIGHT : LEFT);
    busy = true;
    const from = pose.pos.clone();
    // Up to a higher place the arc rises enough to clear its edge, no more.
    const rise = height + Math.max(0, to.y - from.y) * 0.3;
    for (let t = 0; t < 1;) {
      t = Math.min(1, t + dt / JUMP);
      // The clip crouches until 0.38 and has landed by 0.78: in between he flies.
      const u = smooth(0.38, 0.78, t);
      pose.leap = t;
      pose.air = smooth(0, 0.1, t) * (1 - smooth(0.9, 1, t));
      pose.lift = rise * 4 * u * (1 - u);
      pose.pos.lerpVectors(from, to, u);
      pose.pos.y += pose.lift;
      pose.pos.z += out * Math.sin(Math.PI * u);
      yield;
    }
    Object.assign(pose, { air: 0, lift: 0, leap: 0 });
    busy = false;
  }

  /** Runs the tap clip from one point of it to another: it starts and ends sitting. */
  function* tap(from: number, to: number): Doing {
    sitTo = 1;
    while (pose.sit < 0.9) yield;
    busy = true;
    for (let t = from; t < to;) {
      t = Math.min(to, t + dt / TAP);
      pose.tap = t;
      yield;
    }
    if (to < 1) return;
    pose.tap = 0;
    busy = false;
  }

  // ---------------------------------------------------------------- the book

  function* fly(o: THREE.Object3D, p: THREE.Vector3, q: THREE.Quaternion, scale = o.scale.x): Doing {
    const p0 = o.position.clone();
    const q0 = o.quaternion.clone();
    const s0 = o.scale.x;
    for (let t = 0; t < 1;) {
      t = Math.min(1, t + dt / 0.55);
      const u = smooth(0, 1, t);
      o.position.lerpVectors(p0, p, u).y += 0.12 * Math.sin(Math.PI * u);
      o.quaternion.slerpQuaternions(q0, q, u);
      o.scale.setScalar(s0 + (scale - s0) * u);
      yield;
    }
  }

  /** Opens the book from `from` to `to`: how far (rad) each half stands off lying flat open. */
  function* spread(book: THREE.Object3D, from: number, to: number, seconds: number): Doing {
    for (let t = 0; t < 1;) {
      t = Math.min(1, t + dt / seconds);
      openTo(book, from + (to - from) * smooth(0, 1, t));
      yield;
    }
  }

  function* putBack(w: RoomPhysics, read: Read): Doing {
    yield* fly(read.object, read.home.p, read.home.q, 1);
    w.restore(read.object);
  }

  // ---------------------------------------------------------------- doings

  /**
   * He goes to a book beside his stretch and taps it down, sits facing the camera and it flies into
   * his paws; there it opens toward him and he reads.
   */
  function* read(r: Room, w: RoomPhysics, read: Read): Doing {
    const left = read.home.p.x < pose.pos.x;
    yield* walkTo(left ? r.walk.from : r.walk.to);
    yield* sitDown(left ? LEFT : RIGHT);
    let taken = false;
    try {
      yield* tap(0, TAP_HITS[0]);
      taken = w.take(read.object);
      yield* tap(TAP_HITS[0], 1);
      if (!taken) return;
      const x = clamp(r.seat.position.x, r.walk.from, r.walk.to);
      yield* walkTo(x, READ_Z);
      yield* sitDown(FACE_CAMERA);
      holdTo = 1;
      // Into his paws, shut, its spine to the camera and as small as the open copy he holds.
      const shrink = (HELD_SCALE * OPEN_HEIGHT) / read.size.y;
      const at = new THREE.Vector3(x, r.walk.y + PAWS[1], READ_Z + PAWS[0] - (read.size.z * shrink) / 2);
      yield* fly(read.object, at, read.home.q, shrink);
      read.object.visible = false;
      held = read.open;
      openTo(held, SHUT);
      held.visible = true;
      yield* spread(held, SHUT, READING, 0.5);
      lidsTo = 0.3;
      // His eyes run along a line and back to the next one, down the page and up again: aimed past
      // the pages, low, so his head bows to the book and his eyes just clear its top.
      const length = rand(...READ);
      let line = 0;
      let u = 0;
      for (let t = 0; t < length; t += dt) {
        u += dt / LINE;
        if (u >= 1) {
          u = 0;
          line = (line + 1) % LINES;
        }
        pose.look = gaze.set((u - 0.5) * 0.5, OPEN_HEIGHT * (0.6 - line * 0.05), -0.4).applyMatrix4(held.matrix);
        yield;
      }
      pose.look = null;
      yield* spread(held, READING, SHUT, 0.4);
    } finally {
      lidsTo = 0;
      holdTo = 0;
      pose.look = null;
      if (held) {
        held.visible = false;
        held = null;
        read.object.visible = true;
      }
      if (taken) run(putBack(w, read));
    }
  }

  /** Where he can jump down to the motto's letters from his stretch, if they lie below and near it. */
  const dropTo = (r: Room, l: Ledge): Drop | null => {
    const lo = l.from + 0.2;
    const hi = l.to - 0.2;
    const down = r.walk.y - l.y;
    if (hi <= lo || down < 0.1 || down > DROP) return null;
    const mid = (lo + hi) / 2;
    const top = clamp(mid, r.walk.from, r.walk.to);
    const land = clamp(top + (mid < top ? -0.35 : 0.35), lo, hi);
    if (Math.abs(land - top) > ACROSS) return null;
    // His paws on their tops as the page shows them: standing at FRONT shows him a little lower.
    return { top, land, lo, hi, y: l.y - SINK + FRONT * Math.tan(TILT) };
  };

  function* climb(r: Room, d: Drop): Doing {
    yield* walkTo(d.land);
    yield* jump(new THREE.Vector3(d.top, r.walk.y, FRONT), 0.08, OUT);
    yield* sitDown(r.face);
  }

  /** Down to the letters, a walk along them, a sit, and back up. */
  function* stroll(r: Room, d: Drop): Doing {
    yield* walkTo(d.top, FRONT);
    yield* jump(new THREE.Vector3(d.land, d.y, FRONT), 0.1, OUT);
    const far = d.land - d.lo > d.hi - d.land ? rand(d.lo, d.land - 0.3) : rand(d.land + 0.3, d.hi);
    yield* walkTo(clamp(far, d.lo, d.hi));
    yield* sitDown(r.face);
    yield* pause(rand(3, 6));
    yield* climb(r, d);
  }

  function* pace(r: Room): Doing {
    yield* walkTo(rand(r.walk.from, r.walk.to));
    yield* sitDown(r.face);
  }

  /** He goes to his bed, where the room has one, lies down, shuts his eyes and sleeps a long while. */
  function* sleep(r: Room): Doing {
    if (r.bed) yield* goTo(r, r.bed.at.clone());
    yield* sitDown(r.face);
    try {
      lieTo = 1;
      yield* pause(1.2);
      lidsTo = 1;
      yield* pause(rand(...SLEEP));
      lidsTo = 0;
      yield* pause(0.6);
      lieTo = 0;
      yield* pause(0.8);
    } finally {
      lidsTo = 0;
      lieTo = 0;
    }
  }

  /** He stands, turns round once on the spot, as cats do before they settle, and sits again. */
  function* circle(r: Room): Doing {
    yield* stand();
    const start = pose.yaw;
    const way = Math.random() < 0.5 ? 1 : -1;
    for (let t = 0; t < 1;) {
      t = Math.min(1, t + dt / 1.6);
      pose.yaw = start + way * 2 * Math.PI * smooth(0, 1, t);
      pose.stride += dt * 1.4;
      yield;
    }
    pose.yaw = start;
    yield* sitDown(r.face);
  }

  function* home(r: Room): Doing {
    if (!(yield* goTo(r, r.seat.position.clone()))) yield* jump(r.seat.position.clone(), 0.1, OUT);
    yield* sitDown(r.face);
  }

  /** The plank whose top is at height y, from one end to the other; null for the floor or the letters. */
  const plankAt = (r: Room, y: number) => {
    for (const { object: o, shapes } of r.fixtures) {
      if (!String(o.userData.prop).startsWith("Shelf")) continue;
      const s = shapes[0];
      if (s?.kind === "box" && Math.abs(o.position.y - y) < 0.06) return { left: o.position.x - s.half[0], right: o.position.x + s.half[0] };
    }
    return null;
  };

  /**
   * He gets to `spot`, on whatever it lies on, as a cat would: along his level; down, by the end of
   * his plank and a hop off it; up, from right under it with a leap. Higher than he leaps, he does
   * not go.
   */
  function* goTo(r: Room, target: THREE.Vector3, hops = 3): Going {
    const w = world(room);
    // On the room's own floor he walks in front of the furniture, never behind it.
    const spot = r.front !== null && target.y < (r.ground ?? 0) + 0.05 ? target.clone().setZ(Math.max(target.z, r.front)) : target;
    // Where a jump comes down: on whatever is under that point, the sofa's seat first when it lies on his way
    // (not when he leaves it: from on it, the ray starts inside the cushion and finds the seat again).
    const landing = (x: number, sofa = true) => {
      const seat = sofa && r.bed && w ? w.top(x, r.bed.at.z, pose.pos.y - 0.05) : null;
      if (r.bed && seat !== null && seat > spot.y + 0.12) return new THREE.Vector3(x, seat, r.bed.at.z);
      return new THREE.Vector3(x, w?.top(x, spot.z, pose.pos.y - 0.05) ?? spot.y, spot.z);
    };
    const dy = spot.y - pose.pos.y;
    if (Math.abs(dy) < 0.12) {
      yield* walkTo(spot.x, spot.z);
      return true;
    }
    if (dy < 0) {
      const from = plankAt(r, pose.pos.y);
      const screen = world(room)?.edges();
      if (from) {
        let side = spot.x > from.right ? 1 : spot.x < from.left ? -1 : spot.x >= (from.left + from.right) / 2 ? 1 : -1;
        // He hops off the end with room for him on the screen below it.
        if (screen && (side > 0 ? from.right + 0.25 > screen.right - ROOM : from.left - 0.25 < screen.left + ROOM)) side = -side;
        const edge = side > 0 ? from.right : from.left;
        yield* walkTo(edge - side * 0.12);
        // Off the end, clearing whatever still stands between him and it.
        const off = edge + side * 0.25;
        const b = world(room)?.blocker(pose.pos.x, off, pose.pos.y);
        yield* jump(landing(off), b ? b.top - pose.pos.y + 0.08 : 0.1);
      } else {
        // Off the sofa's seat from its front edge, high enough to clear it: from its middle he would cross the cushion.
        const seat = r.bed !== null && Math.abs(pose.pos.y - r.bed.at.y) < 0.05;
        if (seat && r.bed) yield* walkTo(pose.pos.x, r.bed.edge);
        yield* jump(landing(pose.pos.x + clamp(spot.x - pose.pos.x, -0.4, 0.4), !seat), seat ? 0.2 : 0.1);
      }
      // He came down on something on his way: on from there.
      if (pose.pos.y > spot.y + 0.12) return hops > 0 && (yield* goTo(r, spot, hops - 1));
      yield* walkTo(spot.x, spot.z);
      return true;
    }
    // Up from the floor, by the front of the sofa's seat, never through it: tried before the leap's
    // limit, since his shelf is out of one leap from the floor and its fallback jump would cross the sofa.
    if (r.bed && hops > 0 && pose.pos.y < r.bed.at.y - 0.1 && spot.y > r.bed.at.y + 0.1) {
      const on = new THREE.Vector3(clamp(spot.x, r.bed.from, r.bed.to), r.bed.at.y, r.bed.at.z);
      if (!(yield* goTo(r, on, hops - 1))) return false;
      return yield* goTo(r, spot, hops - 1);
    }
    if (dy > LEAP_UP) return false;
    const to = plankAt(r, spot.y);
    const x = to ? clamp(spot.x, to.left + 0.12, to.right - 0.12) : spot.x;
    yield* walkTo(x);
    // Onto the sofa's seat over its front edge, then back along it: straight to its middle he would cross the cushion.
    const seat = r.bed !== null && Math.abs(spot.y - r.bed.at.y) < 0.05 && spot.z < r.bed.edge;
    yield* jump(new THREE.Vector3(x, spot.y, seat && r.bed ? r.bed.edge : spot.z), 0.1, OUT);
    if (seat) yield* walkTo(x, spot.z);
    return true;
  }

  /** A tap on him: a start, ears flat, then a slow blink at whoever did it. */
  function* startle(): Doing {
    earsTo = 1;
    if (!still) {
      busy = true;
      sitTo = 0;
      const y = pose.pos.y;
      for (let t = 0; t < 1;) {
        t = Math.min(1, t + dt / 0.5);
        pose.air = Math.sin(Math.PI * t);
        pose.leap = 0.4 + 0.4 * t;
        pose.lift = 0.07 * Math.sin(Math.PI * t);
        pose.pos.y = y + pose.lift;
        yield;
      }
      pose.pos.y = y;
      Object.assign(pose, { air: 0, lift: 0, leap: 0 });
      busy = false;
    }
    sitTo = 1;
    yield* pause(0.6);
    lidsTo = 1;
    yield* pause(0.55);
    lidsTo = 0;
    earsTo = 0;
    yield* pause(0.8);
  }

  /** He watches his toy until it lies on something, for `seconds` at most: in the air it is out of reach. */
  function* settle(p: THREE.Vector3, seconds: number): Going {
    let lying = 0;
    let y = p.y;
    // His head follows it; when it gets well behind him, he turns round to it.
    for (let t = 0; t < seconds; t += dt) {
      if (lying > 0.35) return true;
      if ((p.x - pose.pos.x) * Math.cos(pose.yaw) < -0.25) {
        yield* face(p.x >= pose.pos.x ? RIGHT : LEFT);
        y = p.y;
      }
      // Still, up and down, for a while: at the top of a bounce it is still for an instant only.
      lying = Math.abs(p.y - y) < 0.002 ? lying + dt : 0;
      y = p.y;
      yield;
    }
    return false;
  }

  /** He gets beside his toy, short of it, and faces it; false if it lies out of his reach. */
  function* reach(r: Room, p: THREE.Vector3): Going {
    // On the floor he keeps to the front: a toy deep behind the furniture is out of his reach.
    if (r.front !== null && p.y < (r.ground ?? 0) + 0.05 && Math.abs(p.z - r.front) > 0.5) return false;
    const side = p.x >= pose.pos.x ? 1 : -1;
    if (!(yield* goTo(r, new THREE.Vector3(p.x - side * 0.3, p.y, p.z)))) return false;
    yield* face(p.x >= pose.pos.x ? RIGHT : LEFT);
    return true;
  }

  /**
   * His toy flew: he watches it land, goes to it, bats it about, picks it up in his mouth and
   * carries it back to its place on his shelf. Out of his reach, he only watches it.
   */
  function* fetch(r: Room, w: RoomPhysics, toy: THREE.Object3D): Doing {
    const home = w.rest(toy);
    if (!home) return;
    const p = toy.position;
    /** Out of the world: in his mouth, or rolling into its place. */
    let out = false;
    pose.look = p;
    fetching = w;
    try {
      yield* stand();
      if (!(yield* settle(p, 6))) return;
      // It came down where it was: nothing to fetch.
      if (p.distanceTo(home.p) < 0.05) return;
      if (!(yield* reach(r, p))) {
        yield* pause(1.5);
        return;
      }
      // A bat or two, and after it each time.
      for (let i = Math.random() < 0.5 ? 1 : 2; i > 0; i--) {
        const side = p.x >= pose.pos.x ? 1 : -1;
        yield* tap(0, TAP_HITS[0]);
        w.poke(toy, p.clone(), new THREE.Vector3(side * 0.5, 0.4, 0));
        yield* tap(TAP_HITS[0], 1);
        yield* stand();
        if (!(yield* settle(p, 4)) || !(yield* reach(r, p))) return;
      }
      yield* stand();
      if (!w.hold(toy)) return;
      out = true;
      toy.scale.setScalar(CARRY);
      carried = toy;
      // Back up to his stretch, beside the toy's place.
      const back = new THREE.Vector3(clamp(home.p.x, r.walk.from, r.walk.to), r.walk.y, r.seat.position.z);
      if (!(yield* goTo(r, back))) yield* jump(back, 0.1, OUT);
      yield* walkTo(back.x, back.z);
      yield* face(home.p.x >= pose.pos.x ? RIGHT : LEFT);
      // He lets it go and it rolls into its place.
      carried = null;
      toy.scale.setScalar(1);
      yield* fly(toy, home.p, home.q);
      out = false;
      w.restore(toy);
      yield* sitDown(r.face);
    } finally {
      carried = null;
      fetching = null;
      pose.look = null;
      if (out) {
        toy.scale.setScalar(1);
        w.restore(toy);
      }
    }
  }

  function* trotOff(r: Room, done: () => void): Doing {
    try {
      speed = SPEED * HURRY;
      const floor = new THREE.Vector3(pose.pos.x, r.ground ?? 0, r.front ?? pose.pos.z);
      if (Math.abs(pose.pos.y - floor.y) > 0.05) yield* goTo(r, floor);
      const right = world(room)?.edges().right ?? pose.pos.x + 4;
      yield* walkTo(right + PAST, pose.pos.z);
      // Something in his way he could not hop: he goes on past it, out of sight.
      yield* plod(right + PAST, pose.pos.z);
    } finally {
      speed = SPEED;
      done();
    }
  }

  function* trotIn(r: Room): Doing {
    try {
      speed = SPEED * HURRY;
      yield* home(r);
    } finally {
      speed = SPEED;
    }
  }

  /** What he does next, never the same twice in a row; off the plank, he first climbs back. */
  const choose = (): Doing => {
    const r = rooms[room]!;
    const w = world(room);
    const ledge = w?.ledge();
    const drop = ledge ? dropTo(r, ledge) : null;
    if (pose.pos.y < r.walk.y - 0.05) return drop ? climb(r, drop) : home(r);
    const options: Array<[string, number, () => Doing]> = [
      ["circle", 1, () => circle(r)],
      ["sleep", 6, () => sleep(r)],
    ];
    if (w && r.reads.length > 0) options.push(["read", 3, () => read(r, w, r.reads[Math.floor(Math.random() * r.reads.length)]!)]);
    if (drop) options.push(["stroll", 3, () => stroll(r, drop)]);
    if (r.walk.to - r.walk.from > 0.1) options.push(["pace", 2, () => pace(r)]);
    const open = options.filter(([name]) => name !== last);
    let pick = Math.random() * open.reduce((sum, [, weight]) => sum + weight, 0);
    const [name, , make] = open.find(([, weight]) => (pick -= weight) < 0) ?? open[0]!;
    last = name;
    return make();
  };

  return {
    pose,
    get room() {
      return room;
    },
    get carried() {
      return carried;
    },
    get held() {
      return held;
    },
    busy: () => busy,
    enter(i, at, yaw) {
      room = i;
      leaving = false;
      stop = false;
      pose.pos.copy(at);
      pose.yaw = yaw;
      rest = rand(...REST);
    },
    leave() {
      leaving = true;
      if (job) stop = true;
    },
    stir() {
      if (job && calm) stop = true;
    },
    poke() {
      if (room < 0 || busy || leaving || exiting) return;
      end();
      job = startle();
      calm = false;
    },
    fetch(i, toy) {
      const w = world(i);
      if (i !== room || !w || busy || leaving || still || exiting) return;
      end();
      job = fetch(rooms[i]!, w, toy);
      // The pointer that threw it does not call him off it.
      calm = false;
    },
    exit(done) {
      if (exiting) return;
      if (room < 0 || still) {
        done();
        return;
      }
      exiting = true;
      end();
      job = trotOff(rooms[room]!, done);
      calm = false;
    },
    comeIn() {
      if (room < 0 || still) return;
      const r = rooms[room]!;
      const right = world(room)?.edges().right ?? pose.pos.x + 4;
      // Placed now, before a frame shows him on his seat.
      pose.pos.set(right + PAST, r.ground ?? 0, r.front ?? pose.pos.z);
      pose.sit = 0;
      end();
      job = trotIn(r);
      calm = false;
    },
    update(step, idle) {
      dt = step;
      fetching?.wait();
      for (let i = tasks.length - 1; i >= 0; i--) if (tasks[i]!.next().done) tasks.splice(i, 1);
      if (room >= 0) {
        if (stop && !busy) end();
        if (leaving && !job) {
          room = -1;
          leaving = false;
        }
      }
      if (room >= 0 && !job && !still) {
        rest -= dt;
        if (idle > IDLE && rest <= 0) job = choose();
      }
      if (job?.next().done) {
        job = null;
        calm = true;
        rest = rand(...REST);
      }
      pose.sit += (sitTo - pose.sit) * Math.min(1, dt * 6);
      pose.lids += (lidsTo - pose.lids) * Math.min(1, dt * 5);
      pose.hold += (holdTo - pose.hold) * Math.min(1, dt * 5);
      pose.lie += (lieTo - pose.lie) * Math.min(1, dt * 2);
      pose.ears += (earsTo - pose.ears) * Math.min(1, dt * (earsTo > pose.ears ? 14 : 2.5));
    },
    dispose() {
      end();
      tasks.length = 0;
    },
  };
}
