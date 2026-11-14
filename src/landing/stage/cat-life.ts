import * as THREE from "three";
import { TAP_HITS } from "./cat";
import { makeOpenBook, type OpenBook } from "./open-book";
import { SINK, type Ledge, type RoomPhysics } from "./physics";
import { WALL } from "./props";
import { TILT, type Read, type Room } from "./rooms";

// Arandu's own life, while a scene stays put. After a few quiet seconds he does something: he turns
// round where he sits, walks his stretch of plank, jumps down to walk the motto's letters (they give
// under his paws), or takes a book down and reads it. Anything on the page stops him: a walk stops
// where it is, a jump or a tap ends first, a book goes back to its shelf. A tap on him startles him.
// Each doing is a generator that runs one step a frame. Everything here is in the room's content
// frame, in metres.

/** Seconds of quiet before he does something of his own; seconds between two of his doings. */
const IDLE = 6;
const REST: [number, number] = [3, 7];
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
/** The open book leans this much toward the camera, its near edge on his paws. */
const LECTERN = 0.5;
/** He reads this far out from the shelf's middle, toward the wall. */
const READ_Z = -0.05;
/** Seconds he reads, at most; seconds a line takes; lines on each page before the other. */
const READ: [number, number] = [18, 28];
const LINE = 1.3;
const LINES = 5;

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
  /** What he looks at, or null to leave his eyes to the stage. */
  look: THREE.Vector3 | null;
};

export type Life = {
  readonly pose: LifePose;
  /** The room he lives in, or -1 while the scroll carries him. */
  readonly room: number;
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
  /** One frame: idle is how long the page has been quiet, in seconds. */
  update(dt: number, idle: number): void;
  dispose(): void;
};

type Doing = Generator<void, void, unknown>;

/** A book he took down: the open copy he reads, and the prop that flies between it and the shelf. */
type Reading = {
  read: Read;
  room: Room;
  world: RoomPhysics;
  book: OpenBook;
  x: number;
  flight: Doing | null;
  shown: boolean;
};

/** Where he jumps down to the letters: from `top` on the plank to `land`, and how far along they go. */
type Drop = { top: number; land: number; lo: number; hi: number; y: number };

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// The closed book on its back, its spine along Z: its thickness turns up, its height runs along
// the spine, its depth across.
const LYING = new THREE.Quaternion().setFromRotationMatrix(
  new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)),
);
const TILTED = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), LECTERN);
const ONE = new THREE.Vector3(1, 1, 1);

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
  let rest = 0;
  let last = "";
  let sitTo = 1;
  let lidsTo = 0;
  let earsTo = 0;
  const tasks: Doing[] = [];
  const readings = new Set<Reading>();
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

  function* walkTo(x: number, z = pose.pos.z): Doing {
    const dx = x - pose.pos.x;
    const dz = z - pose.pos.z;
    const far = Math.hypot(dx, dz);
    if (far < 0.005) return;
    yield* stand();
    yield* face(dx >= 0 ? RIGHT : LEFT);
    for (let done = 0; done < far; ) {
      const step = Math.min(SPEED * dt, far - done);
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
    for (let t = 0; t < 1; ) {
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
    for (let t = from; t < to; ) {
      t = Math.min(to, t + dt / TAP);
      pose.tap = t;
      yield;
    }
    if (to < 1) return;
    pose.tap = 0;
    busy = false;
  }

  // ---------------------------------------------------------------- the book

  function* fly(o: THREE.Object3D, p: THREE.Vector3, q: THREE.Quaternion): Doing {
    const p0 = o.position.clone();
    const q0 = o.quaternion.clone();
    for (let t = 0; t < 1; ) {
      t = Math.min(1, t + dt / 0.55);
      const u = smooth(0, 1, t);
      o.position.lerpVectors(p0, p, u).y += 0.12 * Math.sin(Math.PI * u);
      o.quaternion.slerpQuaternions(q0, q, u);
      yield;
    }
  }

  function* fold(book: OpenBook, from: number, to: number, seconds: number): Doing {
    for (let t = 0; t < 1; ) {
      t = Math.min(1, t + dt / seconds);
      book.open(from + (to - from) * smooth(0, 1, t));
      yield;
    }
  }

  function* leaf(book: OpenBook): Doing {
    for (let t = 0; t < 1; ) {
      t = Math.min(1, t + dt / 0.8);
      book.turn(smooth(0, 1, t));
      yield;
    }
    book.turn(0);
  }

  /** The book comes off the shelf: it flies to lie shut where he will read it, its open copy hidden under it. */
  const takeDown = (r: Room, w: RoomPhysics, read: Read): Reading => {
    const x = clamp(r.seat.position.x, r.walk.from, r.walk.to);
    const book = makeOpenBook(read.size, read.cover);
    const h = read.size.y;
    // Its near edge up on his paws, its far edge down on the plank, short of the plank's front.
    const deep = (h / 2) * Math.cos(LECTERN);
    book.group.quaternion.copy(TILTED);
    book.group.position.set(x, r.walk.y + (h / 2) * Math.sin(LECTERN), Math.min(READ_Z + 0.07 + deep, WALL - 0.01 - deep));
    book.group.updateMatrix();
    book.group.visible = false;
    book.open(0);
    r.content.add(book.group);
    // Where the prop lies shut over its copy: its middle half a depth from the spine, half a height
    // down the spine from the middle.
    const p = new THREE.Vector3();
    const q = new THREE.Quaternion();
    new THREE.Matrix4()
      .compose(new THREE.Vector3(-read.size.z / 2, read.size.x / 2, -h / 2), LYING, ONE)
      .premultiply(book.group.matrix)
      .decompose(p, q, new THREE.Vector3());
    const reading: Reading = { read, room: r, world: w, book, x, flight: null, shown: false };
    reading.flight = run(
      (function* () {
        yield* fly(read.object, p, q);
        reading.flight = null;
      })(),
    );
    readings.add(reading);
    return reading;
  };

  function* putBack(s: Reading): Doing {
    // A book still in the air turns back from where it is.
    s.flight?.return();
    s.flight = null;
    if (s.shown) {
      yield* fold(s.book, 1, 0, 0.45);
      s.book.group.visible = false;
      s.read.object.visible = true;
    }
    yield* fly(s.read.object, s.read.home.p, s.read.home.q);
    s.world.restore(s.read.object);
    s.room.content.remove(s.book.group);
    s.book.dispose();
    readings.delete(s);
  }

  function* turnPage(book: OpenBook): Doing {
    yield* tap(0, TAP_HITS[0]);
    run(leaf(book));
    yield* tap(TAP_HITS[0], 1);
  }

  // ---------------------------------------------------------------- doings

  /** He goes to a book beside his stretch, taps it down, sits behind it facing the camera and reads. */
  function* read(r: Room, w: RoomPhysics, read: Read): Doing {
    const left = read.home.p.x < pose.pos.x;
    yield* walkTo(left ? r.walk.from : r.walk.to);
    yield* sitDown(left ? LEFT : RIGHT);
    let reading: Reading | null = null;
    try {
      yield* tap(0, TAP_HITS[0]);
      if (w.take(read.object)) reading = takeDown(r, w, read);
      yield* tap(TAP_HITS[0], 1);
      if (!reading) return;
      yield* walkTo(reading.x, READ_Z);
      yield* sitDown(FACE_CAMERA);
      while (reading.flight) yield;
      read.object.visible = false;
      reading.book.group.visible = true;
      reading.shown = true;
      yield* fold(reading.book, 0, 1, 0.7);
      lidsTo = 0.3;
      // His eyes run along a line and back to the next one, down a page, then the other; then he
      // turns the page with a paw.
      const length = rand(...READ);
      let line = 0;
      let side = 0;
      let u = 0;
      for (let t = 0; t < length; t += dt) {
        u += dt / LINE;
        if (u >= 1) {
          u = 0;
          if (++line === LINES) {
            line = 0;
            if (++side === 2) {
              side = 0;
              yield* turnPage(reading.book);
            }
          }
        }
        pose.look = reading.book.spot(side * 0.5 + 0.06 + u * 0.38, 0.15 + line * 0.15, gaze).applyMatrix4(reading.book.group.matrix);
        yield;
      }
    } finally {
      lidsTo = 0;
      pose.look = null;
      if (reading) run(putBack(reading));
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

  /** He stands, turns round once on the spot, as cats do before they settle, and sits again. */
  function* circle(r: Room): Doing {
    yield* stand();
    const start = pose.yaw;
    const way = Math.random() < 0.5 ? 1 : -1;
    for (let t = 0; t < 1; ) {
      t = Math.min(1, t + dt / 1.6);
      pose.yaw = start + way * 2 * Math.PI * smooth(0, 1, t);
      pose.stride += dt * 1.4;
      yield;
    }
    pose.yaw = start;
    yield* sitDown(r.face);
  }

  function* home(r: Room): Doing {
    yield* jump(r.seat.position.clone(), 0.1, OUT);
    yield* sitDown(r.face);
  }

  /** A tap on him: a start, ears flat, then a slow blink at whoever did it. */
  function* startle(): Doing {
    earsTo = 1;
    if (!still) {
      busy = true;
      sitTo = 0;
      const y = pose.pos.y;
      for (let t = 0; t < 1; ) {
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

  /** What he does next, never the same twice in a row; off the plank, he first climbs back. */
  const choose = (): Doing => {
    const r = rooms[room];
    const w = world(room);
    const ledge = w?.ledge();
    const drop = ledge ? dropTo(r, ledge) : null;
    if (pose.pos.y < r.walk.y - 0.05) return drop ? climb(r, drop) : home(r);
    const options: Array<[string, number, () => Doing]> = [["circle", 1, () => circle(r)]];
    if (w && r.reads.length > 0) options.push(["read", 4, () => read(r, w, r.reads[Math.floor(Math.random() * r.reads.length)])]);
    if (drop) options.push(["stroll", 3, () => stroll(r, drop)]);
    if (r.walk.to - r.walk.from > 0.1) options.push(["pace", 2, () => pace(r)]);
    const open = options.filter(([name]) => name !== last);
    let pick = Math.random() * open.reduce((sum, [, weight]) => sum + weight, 0);
    const [name, , make] = open.find(([, weight]) => (pick -= weight) < 0) ?? open[0];
    last = name;
    return make();
  };

  return {
    pose,
    get room() {
      return room;
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
      if (room < 0 || busy || leaving) return;
      end();
      job = startle();
      calm = false;
    },
    update(step, idle) {
      dt = step;
      for (let i = tasks.length - 1; i >= 0; i--) if (tasks[i].next().done) tasks.splice(i, 1);
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
      pose.ears += (earsTo - pose.ears) * Math.min(1, dt * (earsTo > pose.ears ? 14 : 2.5));
    },
    dispose() {
      end();
      tasks.length = 0;
      for (const s of readings) {
        s.room.content.remove(s.book.group);
        s.book.dispose();
        s.read.object.visible = true;
      }
      readings.clear();
    },
  };
}
