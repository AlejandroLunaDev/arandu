import type { BookSummary } from "@arandu/contracts";
import { gsap } from "gsap";
import * as THREE from "three";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { BOOK_EVENT, getBook, listBooks, openHeight, SHUT_EVENT, TURN, TURN_EVENT, type OpenedBook } from "../book/book-data";
import { makeCat } from "./cat";
import { CARRY, HELD_SCALE, makeLife, OPEN_HEIGHT, openTo, SHUT } from "./cat-life";
import { tokenColor } from "./palette";
import { loadRapier, roomPhysics, type RoomPhysics } from "./physics";
import { makeKit, type Kit } from "./props";
import { heroRoom, TILT, type Room } from "./rooms";

// The landing's 3D layer: one fixed canvas over the page that never takes clicks. Each scene with a
// [data-room] anchor gets its room of shelves, and Arandu follows the scroll from room to room. While
// a scene is pinned he sits and watches the pointer; while the next scene comes in he walks or leaps
// to its seat. Left alone a while, he stops watching and lives his own life (see cat-life.ts). The
// props have real gravity once the physics is in (see physics.ts): a tap knocks them, the pointer
// swings the hanging lamp, the cat shoves them. A tap on the little lamp switches it, a tap on the
// hanging lamp switches the page to its lamp theme and back; the yarn can be picked up and thrown,
// and he fetches it. Now and then, sitting, he asks the reader something. If WebGL or the models fail,
// <html> gets the "no3d" class and the page shows its drawn cats instead.

const BUILD: Record<string, (anchor: HTMLElement, kit: Kit) => Room> = {
  hero: heroRoom,
};

/** Seconds he keeps watching a pointer that has stopped moving. */
const GAZE = 4;
/** How bright a lit lamp's cap glows. */
const SHADE_GLOW = 0.8;
/** What a tap goes to, not to the stage. */
const CONTROLS = "a, button, input, textarea, select, label, iframe";
/** What he asks the reader, one at a time: the first after SAY_FIRST seconds, then one every SAY_EVERY, for SAY_FOR. */
const SAYS = [
  "Oi! Já sabe que carreira quer seguir?",
  "Não sabe que curso escolher? Te ajudo a descobrir.",
  "Me conta do que você gosta e a gente acha uma carreira.",
  "Quer viver um pedacinho de uma carreira antes de escolher?",
  "Que tal conhecer o dia a dia de uma profissão?",
  "Vai fazer o ENEM? Bora achar o curso certo pra você.",
  "Nunca é tarde pra escolher uma carreira.",
  "Ainda na dúvida? A gente descobre junto.",
];
const SAY_FIRST = 8;
const SAY_EVERY: [number, number] = [25, 40];
const SAY_FOR = 10;
/** Seconds per letter as his words type into the bubble: he says them, they do not just appear. */
const TYPE = 0.045;
/** Seconds he purrs after a tap on his head; seconds between two z's while he sleeps. */
const PURR = 2.4;
const SNORE = 1.2;
/** Seconds between two books on the shelf changing title. */
const ROTATE = 9;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** A soft round shadow, 1 by 1, lying flat: its alpha falls off from the middle. */
function shadowTexture() {
  const n = 64;
  const data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const r = Math.hypot(x - n / 2 + 0.5, y - n / 2 + 0.5) / (n / 2);
      const v = Math.round(255 * Math.max(0, 1 - r) ** 1.6);
      data.set([v, v, v, v], (y * n + x) * 4);
    }
  }
  const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

/** Starts the stage in host and returns its cleanup. */
export function runStage(host: HTMLElement): () => void {
  const root = document.documentElement;
  const canvas = document.createElement("canvas");
  host.appendChild(canvas);
  const fail = () => {
    root.classList.add("no3d");
    canvas.remove();
  };

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    fail();
    return () => {};
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  let cancelled = false;
  const stops: Array<() => void> = [];
  const cleanup = () => {
    cancelled = true;
    stops.forEach((stop) => stop());
    renderer.dispose();
    canvas.remove();
  };

  const draco = new DRACOLoader().setDecoderPath("/draco/");
  const loader = new GLTFLoader().setDRACOLoader(draco);
  // The books print their titles in the page's display font: wait for it too.
  Promise.all([loader.loadAsync("/models/arandu.glb"), loader.loadAsync("/models/props.glb"), document.fonts.ready])
    .then(([catGltf, propsGltf]) => {
      draco.dispose();
      if (cancelled) return;
      stops.push(start(renderer, catGltf, propsGltf));
    })
    .catch((error: unknown) => {
      draco.dispose();
      if (cancelled) return;
      console.error("The 3D stage could not start", error);
      fail();
    });

  return cleanup;
}

type Gltf = Awaited<ReturnType<GLTFLoader["loadAsync"]>>;

function start(renderer: THREE.WebGLRenderer, catGltf: Gltf, propsGltf: Gltf): () => void {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const scene = new THREE.Scene();
  // Pixel units: one unit is one CSS pixel, the origin at the middle of the viewport.
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -4000, 4000);
  camera.position.z = 2000;

  scene.add(new THREE.HemisphereLight(tokenColor("cream-100"), tokenColor("ink-800"), 1.3));
  const key = new THREE.DirectionalLight(tokenColor("cream-50"), 2.4);
  key.position.set(1.2, 1.6, 0.9);
  scene.add(key);
  const back = new THREE.DirectionalLight(tokenColor("cream-200"), 1.6);
  back.position.set(-1.5, 0.8, -1);
  scene.add(back);

  const kit = makeKit(propsGltf);
  const rooms = [...document.querySelectorAll<HTMLElement>("[data-room]")].map((anchor) => {
    const build = BUILD[anchor.dataset.room ?? ""];
    if (!build) throw new Error(`Unknown room: ${anchor.dataset.room}`);
    const room = build(anchor, kit);
    scene.add(room.group);
    return room;
  });
  if (rooms.length === 0) throw new Error("The page has no [data-room] anchor");

  // The physics comes in after the first frames: until then the props stand where the rooms put them.
  let worlds: RoomPhysics[] = [];
  let live = true;
  loadRapier()
    .then((R) => {
      if (live) worlds = rooms.map((r) => roomPhysics(R, r));
    })
    .catch((error: unknown) => console.error("The physics could not start: the props stay put", error));

  // A warm light at every lamp's bulb, reaching `reach` metres. The count never changes, so the
  // shaders compile once.
  const lamps = rooms.flatMap((r) =>
    r.content.children
      .filter((o) => String(o.userData.prop ?? "").startsWith("Lamp"))
      .map((lamp) => {
        const light = new THREE.PointLight(tokenColor("amber-300"), 1.4, 1, 0);
        scene.add(light);
        const bulb = lamp.getObjectByName(`${lamp.userData.prop}Light`) ?? lamp;
        const pendant = lamp.userData.prop === "LampPendant";
        return { r, lamp, bulb, light, reach: pendant ? 2.2 : 1.2, power: pendant ? 1.4 : 2.4 };
      }),
  );

  const cat = makeCat(catGltf);
  scene.add(cat.root);
  // The cat's soft shadow, 1 m by 1 m, lying flat under him.
  const shadowTex = shadowTexture();
  const shadowGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const catShadowMaterial = new THREE.MeshBasicMaterial({
    color: tokenColor("ink-950"),
    alphaMap: shadowTex,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const catShadow = new THREE.Mesh(shadowGeo, catShadowMaterial);
  scene.add(catShadow);

  // The cat leaves room i - 1 for room i while the scene of room i comes in: from when its top is
  // 85% of the viewport down to when it reaches the top.
  let W = 0;
  let H = 0;
  let ranges: Array<[number, number]> = [];
  const layout = () => {
    W = innerWidth;
    H = innerHeight;
    renderer.setSize(W, H, false);
    Object.assign(camera, { left: -W / 2, right: W / 2, top: H / 2, bottom: -H / 2 });
    camera.updateProjectionMatrix();
    rooms.forEach((r) => r.layout());
    worlds.forEach((w) => w.layout());
    ranges = rooms.map((r) => {
      const top = r.scene.getBoundingClientRect().top + scrollY;
      return [top - H * 0.85, top];
    });
  };
  const progress = () => {
    let p = 0;
    for (let i = 1; i < ranges.length; i++) {
      const [s, e] = ranges[i];
      const f = clamp((scrollY - s) / (e - s), 0, 1);
      p += f;
      if (f < 1) break;
    }
    return p;
  };

  let laidOut = false;
  const relayout = () => {
    if (laidOut) return;
    laidOut = true;
    requestAnimationFrame(() => {
      laidOut = false;
      layout();
    });
  };
  addEventListener("resize", relayout);
  const watcher = new ResizeObserver(relayout);
  watcher.observe(document.body);
  document.fonts?.ready.then(relayout);
  layout();

  const life = makeLife(rooms, (i) => worlds[i] ?? null, reduce);
  // Where he is in each room, in its frame: his seat, or wherever his own doings left him.
  const spots = rooms.map((r) => r.seat.position.clone());
  // Any input stops what he does; only the mouse moving keeps his eyes on it.
  let lastInput = performance.now() / 1000;
  let lastMove = -Infinity;
  const onInput = (e: Event) => {
    lastInput = performance.now() / 1000;
    life.stir();
    if (e instanceof KeyboardEvent && e.key === "Escape") shutBook();
  };
  addEventListener("scroll", onInput, { passive: true });
  addEventListener("keydown", onInput);

  const pointer = { x: 0, y: 0, on: false };
  const onPointer = (e: PointerEvent) => {
    onInput(e);
    if (e.pointerType !== "mouse") return;
    lastMove = lastInput;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.on = true;
  };
  addEventListener("pointermove", onPointer, { passive: true });

  // Whether a screen point falls on the cat: a ray from the camera, in his own frame, against a box
  // round his body. Only while he lives in a room: on the move he is too busy to mind.
  const catBox = new THREE.Box3(new THREE.Vector3(-0.16, 0, -0.1), new THREE.Vector3(0.22, 0.4, 0.1));
  const catRay = new THREE.Ray();
  const catInverse = new THREE.Matrix4();
  const overCat = (sx: number, sy: number) => {
    if (life.room < 0) return false;
    catInverse.copy(cat.yaw.matrixWorld).invert();
    catRay.origin.set(sx - W / 2, H / 2 - sy, 1000).applyMatrix4(catInverse);
    catRay.direction.set(0, 0, -1).transformDirection(catInverse);
    return catRay.intersectsBox(catBox);
  };

  // What the pointer is over: a prop or a lamp of some room, found by a ray from the camera.
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pick = (sx: number, sy: number) => {
    if (worlds.length === 0) return null;
    ndc.set((sx / W) * 2 - 1, 1 - (sy / H) * 2);
    raycaster.setFromCamera(ndc, camera);
    for (const hit of raycaster.intersectObjects(rooms.map((r) => r.content), true)) {
      for (let i = 0; i < rooms.length; i++) {
        const prop = worlds[i].owner(hit.object);
        if (prop) return { i, prop, point: hit.point };
      }
    }
    return null;
  };

  // A tap on a little lamp switches it: its bulb, its shade and its light. Each lamp gets its own
  // copies of those materials the first time.
  const dark = new Set<THREE.Object3D>();
  const glows: THREE.Material[] = [];
  // The bulb hides under the cap: lit, the whole cap glows warm.
  const glow = (lamp: THREE.Object3D, on: boolean) =>
    lamp.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const m = o.material as THREE.MeshStandardMaterial;
      if (!["LampBulb", "LampShadeInner", "LampShade"].includes(m.name)) return;
      if (o.userData.glow === undefined) {
        o.userData.glow = m.name === "LampShade" ? SHADE_GLOW : m.emissiveIntensity;
        o.material = m.clone();
        if (m.name === "LampShade") (o.material as THREE.MeshStandardMaterial).emissive.copy(tokenColor("amber-200"));
        glows.push(o.material);
      }
      (o.material as THREE.MeshStandardMaterial).emissiveIntensity = on ? o.userData.glow : 0;
    });
  const switchLamp = (lamp: THREE.Object3D) => {
    const on = dark.delete(lamp);
    if (!on) dark.add(lamp);
    glow(lamp, on);
  };
  for (const { lamp } of lamps) if (lamp.userData.prop !== "LampPendant") glow(lamp, true);

  // A tap on the cat startles him. A tap knocks a prop away from where it lands, a little up: on its
  // left side it sends it right. A tap on a letter of the motto flicks it.
  const at = new THREE.Vector3();
  const push = new THREE.Vector3();
  const onDown = (e: PointerEvent) => {
    lastInput = performance.now() / 1000;
    const target = e.target instanceof Element ? e.target : null;
    if (book) {
      if (!target?.closest("[data-pages]")) shutBook();
      return;
    }
    if (e.pointerType === "mouse") {
      lastMove = lastInput;
      Object.assign(pointer, { x: e.clientX, y: e.clientY, on: true });
    }
    if (!target?.closest(CONTROLS) && overCat(e.clientX, e.clientY)) {
      // On his head the tap is a stroke: he purrs. Anywhere else it startles him.
      const head = headOnScreen();
      if (Math.hypot(e.clientX - head.x, e.clientY - head.y) < 0.14 * cat.root.scale.x) {
        purrUntil = performance.now() / 1000 + PURR;
        for (let n = 0; n < 4; n++) setTimeout(() => float("heart", "♥"), n * 180);
      } else life.poke();
      return;
    }
    life.stir();
    const letter = target?.closest<HTMLElement>("[data-letter]");
    if (letter) {
      worlds.forEach((w) => w.flick(letter));
      return;
    }
    if (target?.closest(CONTROLS)) return;
    const hit = pick(e.clientX, e.clientY);
    if (!hit) return;
    const name = String(hit.prop.userData.prop ?? "");
    if (name === "LampPendant") {
      const html = document.documentElement;
      html.dataset.theme = html.dataset.theme === "lamp" ? "dark" : "lamp";
      return;
    }
    if (name.startsWith("Lamp")) {
      switchLamp(hit.prop);
      return;
    }
    if (name === "YarnBall" && toRoom(rooms[hit.i], e.clientX, e.clientY, at) && worlds[hit.i].grab(hit.prop, at)) {
      // No text selection while it is held.
      e.preventDefault();
      holding = { i: hit.i, prop: hit.prop };
      document.body.style.cursor = "grabbing";
      return;
    }
    const local = rooms[hit.i].content.worldToLocal(at.copy(hit.point));
    push.set(local.x < hit.prop.position.x ? 1.3 : -1.3, 0.9, -0.2);
    if (name.startsWith("Book")) {
      const { i, prop } = hit;
      const n = taps?.prop === prop ? taps.n + 1 : 1;
      clearTimeout(taps?.timer);
      if (n >= TAPS) {
        worlds[i].poke(prop, local, push);
        taps = { prop, n, timer: window.setTimeout(() => (taps = null), TAP_GAP) };
      } else {
        taps = { prop, n, timer: window.setTimeout(() => ((taps = null), openBook(i, prop)), TAP_GAP) };
      }
      return;
    }
    worlds[hit.i].poke(hit.prop, local, push);
  };

  // A tap on a book brings it off its shelf: it flies to the middle of the screen, turns its front
  // cover to you and opens. Three quick taps knock it over instead. A tap or Escape shuts it and
  // sends it home.
  const TAPS = 3;
  const TAP_GAP = 300;
  /** How far (rad) each half stands off lying flat once it is open: a book held, not one pressed flat. */
  const LEAN = 0.06;
  /** How far (rad) the open book tips back, its top away from you: a turning leaf rises into view. */
  const TIP = 0.3;
  const X = new THREE.Vector3(1, 0, 0);
  const Y = new THREE.Vector3(0, 1, 0);
  let taps: { prop: THREE.Object3D; n: number; timer: number } | null = null;
  let book: gsap.core.Timeline | null = null;
  /** The open copy on screen, and its leaf's turn under way. */
  let shown: THREE.Object3D | null = null;
  let leafTurn: gsap.core.Tween | null = null;
  const openBook = (i: number, prop: THREE.Object3D) => {
    if (book || !worlds[i].take(prop)) return;
    const open = kit.open(prop);
    const box = new THREE.Box3().setFromObject(prop);
    const from = new THREE.Vector3((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2);
    const s0 = (box.max.y - box.min.y) / OPEN_HEIGHT;
    // Open, it spreads 1.4 times as wide as it is tall; its pages (book-pages.tsx) take the same size.
    const height = openHeight(W, H);
    const s1 = height / OPEN_HEIGHT;
    // Its origin is the foot of the spine: shut, the cover reaches right of it; open, it is the middle.
    const shutAt = new THREE.Vector3(-0.14 * s1, -height / 2, 600);
    const openAt = new THREE.Vector3(0, -height / 2, 600);
    const spine = new THREE.Quaternion().setFromAxisAngle(Y, Math.PI);
    const cover = new THREE.Quaternion().setFromAxisAngle(Y, Math.PI / 2);
    const pages = new THREE.Quaternion().setFromAxisAngle(X, -TIP);
    const s = { fly: 0, open: 0 };
    const apply = () => {
      open.position.lerpVectors(from, shutAt, s.fly).lerp(openAt, s.open);
      open.position.y += 0.15 * height * Math.sin(Math.PI * s.fly);
      open.quaternion.slerpQuaternions(spine, cover, s.fly).slerp(pages, s.open);
      open.scale.setScalar(s0 + (s1 - s0) * s.fly);
      // Tipped back, it would look shorter: stretched as much, its pages stay the size of their print.
      open.scale.y /= Math.cos(TIP * s.open);
      openTo(open, SHUT + (LEAN - SHUT) * s.open);
    };
    prop.visible = false;
    scene.add(open);
    shown = open;
    apply();
    const pace = reduce ? 0.01 : 1;
    book = gsap
      .timeline({
        onUpdate: apply,
        onComplete: () => {
          const title = String(prop.userData.career ?? "");
          const opened: OpenedBook = { title, slug: prop.userData.slug ?? null, research: !!prop.userData.research };
          dispatchEvent(new CustomEvent(BOOK_EVENT, { detail: opened }));
        },
        onReverseComplete: () => {
          scene.remove(open);
          shown = null;
          prop.visible = true;
          worlds[i].restore(prop);
          book = null;
        },
      })
      .to(s, { fly: 1, duration: 0.7 * pace, ease: "power2.inOut" })
      .to(s, { open: 1, duration: 0.6 * pace, ease: "power2.out" });
  };
  const shutBook = () => {
    if (!book) return;
    dispatchEvent(new CustomEvent(BOOK_EVENT, { detail: null }));
    leafTurn?.kill();
    book.reverse();
  };
  // The page asks for a turn: the leaf lifts off the right half and lies down on the left, or back.
  // Done, it is back on the right, unseen: both halves are blank paper under the page's print.
  const onTurn = (e: Event) => {
    const leaf = shown?.getObjectByName("BookOpenLeaf");
    if (!leaf || !book || book.reversed() || book.progress() < 1) return;
    const forward = (e as CustomEvent<number>).detail > 0;
    const flat = -LEAN;
    const over = LEAN - Math.PI;
    leafTurn?.kill();
    leafTurn = gsap.fromTo(
      leaf.rotation,
      { y: forward ? flat : over },
      { y: forward ? over : flat, duration: TURN * (reduce ? 0.01 : 1), ease: "power2.inOut", onComplete: () => void (leaf.rotation.y = flat) },
    );
  };
  addEventListener(TURN_EVENT, onTurn);
  addEventListener("pointerdown", onDown);
  addEventListener(SHUT_EVENT, shutBook);

  // The shelf's titles are professions from the API that have something to show. A title the API
  // lists keeps its book; the rest take one of its professions, and every ROTATE seconds one book
  // on its shelf changes to another. The research book never changes; one in a paw or open waits.
  const shelved = rooms.flatMap((r) => r.props.map((p) => p.object)).filter((o) => o.userData.career && !o.userData.research);
  const title = (o: THREE.Object3D, b: BookSummary) => {
    kit.retitle(o, b.profession.name);
    o.userData.slug = b.profession.slug;
    // Fetched now, so the book opens with its pages already filled.
    getBook(b.profession.slug).catch(() => {});
    for (const r of rooms) for (const read of r.reads) if (read.object === o) kit.wear(read.open, o);
  };
  let rotation = 0;
  listBooks()
    .then((pool) => {
      if (!live || pool.length === 0) return;
      const named = new Map(pool.map((b) => [b.profession.name, b]));
      const spare = () => {
        const on = new Set(shelved.map((o) => o.userData.slug));
        const free = pool.filter((b) => !on.has(b.profession.slug));
        return free[Math.floor(Math.random() * free.length)];
      };
      for (const o of shelved) {
        const same = named.get(o.userData.career);
        if (!same) continue;
        o.userData.slug = same.profession.slug;
        getBook(same.profession.slug).catch(() => {});
      }
      for (const o of shelved) {
        const next = !o.userData.slug && spare();
        if (next) title(o, next);
      }
      rotation = window.setInterval(() => {
        const ready = shelved.filter((o) => o.visible && o !== life.held);
        const o = ready[Math.floor(Math.random() * ready.length)];
        const next = o && spare();
        if (next) title(o, next);
      }, ROTATE * 1000);
    })
    .catch((error: unknown) => console.warn("The shelf keeps its own titles:", error));

  // The yarn in the pointer's hold follows it; let go, it flies, and he goes after it.
  let holding: { i: number; prop: THREE.Object3D } | null = null;
  const onDrag = (e: PointerEvent) => {
    // Let go outside the window: no pointerup came, but no button is down any more.
    if (holding && e.pointerType === "mouse" && e.buttons === 0) return onUp();
    if (holding && toRoom(rooms[holding.i], e.clientX, e.clientY, at)) worlds[holding.i].drag(at);
  };
  const onUp = () => {
    if (!holding) return;
    worlds[holding.i].release();
    life.fetch(holding.i, holding.prop);
    holding = null;
    document.body.style.cursor = "";
  };
  addEventListener("pointermove", onDrag);
  addEventListener("pointerup", onUp);
  addEventListener("pointercancel", onUp);

  // The first room makes its entrance once the models are in: the shelves rise, the lamp drops.
  const intro = { rise: reduce ? 1 : 0, drop: reduce ? 1 : 0 };
  const tweens = reduce
    ? []
    : [
        gsap.to(intro, { rise: 1, duration: 1, ease: "power3.out" }),
        gsap.to(intro, { drop: 1, duration: 1.4, ease: "elastic.out(1, 0.5)", delay: 0.15 }),
      ];
  const pa = new THREE.Vector3();
  const pb = new THREE.Vector3();
  const look = new THREE.Vector3();
  let pS = progress();
  let yawNow = rooms[0].face;
  let toUser = 0;
  let stride = 0;
  let prevX: number | null = null;
  const sweepFrom = new THREE.Vector3();
  const sweepTo = new THREE.Vector3();
  const sweepV = new THREE.Vector3();
  // Where a point of the screen falls on a room's wall plane (z = 0 in its frame): the camera looks
  // straight down -Z, the room leans back.
  const ray = new THREE.Ray();
  const wall = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const inverse = new THREE.Matrix4();
  const toRoom = (r: Room, sx: number, sy: number, out: THREE.Vector3) => {
    inverse.copy(r.content.matrixWorld).invert();
    ray.origin.set(sx - W / 2, H / 2 - sy, 1000).applyMatrix4(inverse);
    ray.direction.set(0, 0, -1).transformDirection(inverse);
    return ray.intersectPlane(wall, out);
  };
  const catAt = new THREE.Vector3();
  // Hearts and z's rise from his head: spans over the canvas, gone when their animation ends.
  const headAt = new THREE.Vector3();
  const headOnScreen = () => {
    cat.mouth.getWorldPosition(headAt);
    return { x: headAt.x + W / 2, y: H / 2 - headAt.y - 0.06 * cat.root.scale.x };
  };
  const float = (kind: "heart" | "z", glyph: string) => {
    const host = bubble?.parentElement;
    if (!host || reduce) return;
    const { x, y } = headOnScreen();
    // From just above his head, a little to one side.
    const up = 0.14 * cat.root.scale.x;
    const s = document.createElement("span");
    s.dataset.float = kind;
    s.className = kind === "heart" ? "type-body-lg" : "type-body";
    s.textContent = glyph;
    s.style.translate = `${(x + up * 0.4 + (Math.random() - 0.5) * up).toFixed(1)}px ${(y - up).toFixed(1)}px`;
    s.addEventListener("animationend", () => s.remove());
    host.append(s);
  };
  let purrUntil = 0;
  let snoreAt = 0;
  const mouthAt = new THREE.Vector3();
  const heldAt = new THREE.Matrix4();
  const catLocal = new THREE.Vector3();
  const shadowAt = new THREE.Vector3();
  let sitNow = 1;
  let lifeStride = 0;
  let seen = { x: -1, y: -1 };
  let last = performance.now();
  let raf = 0;
  const bubble = document.querySelector<HTMLElement>("[data-say]");
  let sayAt = last / 1000 + SAY_FIRST;
  let sayUntil = 0;
  let said = -1;
  let sayFrom = 0;
  let typed = -1;
  // The bubble holds the whole line from the start, the letters still to come hidden, so it never
  // grows as he talks.
  const said1 = document.createElement("span");
  const said2 = document.createElement("span");
  said2.dataset.untyped = "";
  bubble?.replaceChildren(said1, said2);

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;

    rooms[0].reveal(intro.rise, intro.drop);
    rooms.forEach((r) => r.place(W, H));
    for (const { r, lamp, bulb, light, reach, power } of lamps) {
      bulb.getWorldPosition(light.position);
      light.distance = reach * r.k;
      light.intensity = lamp.visible && !dark.has(lamp) ? power : 0;
    }
    kit.tick(t);

    // The scroll waits while he is mid-jump or mid-tap: he lands first.
    if (!life.busy()) pS = reduce ? progress() : lerp(pS, progress(), 1 - 0.0009 ** dt);
    const i0 = clamp(Math.floor(pS), 0, Math.max(0, rooms.length - 2));
    const iB = Math.min(i0 + 1, rooms.length - 1);
    const f = clamp(pS - i0, 0, 1);
    const A = rooms[i0];
    const B = rooms[iB];

    // He lives in a room while its scene stays put, and leaves it as soon as the scroll moves on.
    const settled = f < 0.01 ? i0 : f > 0.99 ? iB : -1;
    if (life.room >= 0 && life.room !== settled) life.leave();
    life.update(dt, t - lastInput);
    if (life.room < 0 && settled >= 0) {
      // The rooms he left wait for him at their seats.
      spots.forEach((s, i) => {
        if (i !== settled) s.copy(rooms[i].seat.position);
      });
      life.enter(settled, spots[settled], yawNow);
      lifeStride = life.pose.stride;
    }

    const p = life.pose;
    const own = life.room >= 0;
    let k: number;
    let lift: number; // metres above the ground under him
    let sitTo: number;
    let air: number;
    let leap: number;
    if (own) {
      const r = rooms[life.room];
      spots[life.room].copy(p.pos);
      r.content.localToWorld(catAt.copy(p.pos));
      r.content.localToWorld(shadowAt.copy(p.pos).setY(p.pos.y - p.lift));
      k = r.k;
      lift = p.lift;
      // While he talks he turns to face you.
      toUser += ((sayUntil > 0 ? 1 : 0) - toUser) * Math.min(1, dt * 3);
      yawNow = p.yaw + Math.atan2(Math.sin(-Math.PI / 2 - p.yaw), Math.cos(-Math.PI / 2 - p.yaw)) * toUser;
      stride += p.stride - lifeStride;
      lifeStride = p.stride;
      ({ sit: sitTo, air, leap } = p);
    } else {
      A.content.localToWorld(pa.copy(spots[i0]));
      B.content.localToWorld(pb.copy(spots[iB]));
      const e = ease(f);
      const dx = pb.x - pa.x;
      const dy = pb.y - pa.y;
      const jumps = Math.abs(dy) > 24 || Math.abs(dx) > W * 0.3;
      air = jumps && !reduce ? Math.sin(Math.PI * f) : 0;
      leap = f;
      k = lerp(A.k, B.k, e);
      const hop = air * (k * 0.5 + Math.abs(dy) * 0.25);
      shadowAt.set(lerp(pa.x, pb.x, e), lerp(pa.y, pb.y, e), lerp(pa.z, pb.z, e));
      catAt.copy(shadowAt).y += hop;
      lift = hop / k;
      sitTo = 1 - smooth(0, 0.16, f) * (1 - smooth(0.84, 1, f));
      // In profile while he travels, a three-quarter turn toward the copy while he sits.
      const yawTo = sitTo < 0.5 ? (dx >= 0 ? 0 : -Math.PI) : (f < 0.5 ? A : B).face;
      yawNow = lerp(yawNow, yawTo, 1 - 0.004 ** dt);
      if (prevX !== null && !air) stride += Math.abs(catAt.x - prevX) / (k * 0.35);
    }
    prevX = catAt.x;
    // The two hand over to each other mid-pose: the sit eases across.
    sitNow = lerp(sitNow, sitTo, 1 - 0.0001 ** dt);

    cat.root.position.copy(catAt);
    // Purring, he trembles.
    const purring = t < purrUntil;
    if (purring) cat.root.position.x += Math.sin(t * 95) * 0.003 * k;
    if (own && life.pose.lie > 0.9 && life.pose.lids > 0.8 && t > snoreAt) {
      snoreAt = t + SNORE;
      float("z", "z");
    }
    cat.root.scale.setScalar(k);
    cat.root.rotation.x = TILT;
    cat.yaw.rotation.y = yawNow;

    // What he looks at: his book while he reads, you while he talks, else the pointer while it
    // moves, else around.
    let gaze: THREE.Vector3 | null = null;
    if (own && p.look) gaze = rooms[life.room].content.localToWorld(look.copy(p.look));
    else if (sayUntil > 0) gaze = look.set(catAt.x, catAt.y + 0.3 * k, 2000);
    else if (pointer.on && sitNow > 0.5 && t - lastMove < GAZE) gaze = look.set(pointer.x - W / 2, H / 2 - pointer.y, 700);
    cat.update({ sit: sitNow, leap, air, stride, tap: p.tap, lids: purring ? Math.max(p.lids, 0.6) : p.lids, ears: p.ears, hold: p.hold, lie: p.lie, look: gaze }, dt, t);
    // What he carries sits in his mouth, where the pose just put it: its origin is at its bottom.
    if (own && life.carried) {
      cat.root.updateMatrixWorld(true);
      rooms[life.room].content.worldToLocal(cat.mouth.getWorldPosition(mouthAt));
      life.carried.position.copy(mouthAt).y -= 0.1 * CARRY;
    }
    // The open book he reads sits between his paws, facing him.
    if (own && life.held) {
      const book = life.held;
      cat.root.updateMatrixWorld(true);
      heldAt.copy(rooms[life.room].content.matrixWorld).invert().multiply(cat.paws.matrixWorld);
      heldAt.decompose(book.position, book.quaternion, book.scale);
      book.scale.multiplyScalar(HELD_SCALE);
    }

    // His body shoves the props of the room he is in, while his feet are on its planks.
    const home = own ? life.room : f < 0.5 ? i0 : iB;
    worlds.forEach((w, i) => {
      if (i !== home || air > 0.2) w.cat(null, 0);
      else w.cat(rooms[i].content.worldToLocal(catLocal.copy(catAt)), yawNow);
    });

    // The pointer drags the hanging lamp as it passes, and shows a hand over what a tap would knock.
    if (pointer.on && (pointer.x !== seen.x || pointer.y !== seen.y)) {
      const moved = seen.x >= 0;
      if (moved && dt > 0) {
        rooms.forEach((r, i) => {
          if (!toRoom(r, seen.x, seen.y, sweepFrom) || !toRoom(r, pointer.x, pointer.y, sweepTo)) return;
          sweepV.set((pointer.x - seen.x) / dt / r.k, -(pointer.y - seen.y) / dt / (r.k * Math.cos(TILT)), 0);
          worlds[i]?.sweep(sweepFrom, sweepTo, sweepV);
        });
      }
      seen = { x: pointer.x, y: pointer.y };
      const over = holding ? null : pick(pointer.x, pointer.y);
      document.body.style.cursor = holding
        ? "grabbing"
        : over?.prop.userData.prop === "YarnBall"
          ? "grab"
          : over || overCat(pointer.x, pointer.y)
            ? "pointer"
            : "";
    }
    worlds.forEach((w) => w.step(dt));

    // His bubble: it opens while he sits still in a room, over his head, inside the viewport.
    if (bubble) {
      const sitting = own && sitNow > 0.9 && !life.busy() && life.pose.lie < 0.1 && !book;
      const line = SAYS[said] ?? "";
      const pace = reduce ? 0 : TYPE;
      // Once he has started a line he finishes it, even if he gets up meanwhile.
      const done = t - sayFrom >= line.length * pace;
      if (sayUntil > 0 && (t > sayUntil || (!sitting && done))) {
        delete bubble.dataset.on;
        sayUntil = 0;
        sayAt = t + SAY_EVERY[0] + Math.random() * (SAY_EVERY[1] - SAY_EVERY[0]);
      } else if (sayUntil === 0 && sitting && t > sayAt) {
        said = (said + 1 + Math.floor(Math.random() * (SAYS.length - 1))) % SAYS.length;
        said1.textContent = "";
        said2.textContent = SAYS[said];
        typed = 0;
        sayFrom = t;
        bubble.dataset.on = "";
        sayUntil = t + SAYS[said].length * (reduce ? 0 : TYPE) + SAY_FOR;
      }
      if (sayUntil > 0) {
        const text = SAYS[said];
        const n = pace > 0 ? Math.min(text.length, Math.floor((t - sayFrom) / pace)) : text.length;
        if (n !== typed) {
          typed = n;
          said1.textContent = text.slice(0, n);
          said2.textContent = text.slice(n);
        }
        const half = bubble.offsetWidth / 2 + 8;
        bubble.style.translate = `${clamp(catAt.x + W / 2, half, W - half).toFixed(1)}px ${(H / 2 - catAt.y - 0.5 * k).toFixed(1)}px`;
      }
    }

    const fade = 1 - Math.min(0.7, lift / 1.2);
    catShadow.position.copy(shadowAt).y += 0.004 * k;
    catShadow.rotation.x = TILT;
    catShadow.scale.set(k * 0.62 * fade, 1, k * 0.3 * fade);
    catShadowMaterial.opacity = 0.55 * fade;

    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(frame);

  return () => {
    live = false;
    life.dispose();
    worlds.forEach((w) => w.dispose());
    glows.forEach((m) => m.dispose());
    if (bubble) delete bubble.dataset.on;
    document.body.style.cursor = "";
    removeEventListener("pointerdown", onDown);
    book?.kill();
    clearTimeout(taps?.timer);
    clearInterval(rotation);
    removeEventListener(SHUT_EVENT, shutBook);
    removeEventListener(TURN_EVENT, onTurn);
    leafTurn?.kill();
    dispatchEvent(new CustomEvent(BOOK_EVENT, { detail: null }));
    removeEventListener("pointermove", onDrag);
    removeEventListener("pointerup", onUp);
    removeEventListener("pointercancel", onUp);
    removeEventListener("scroll", onInput);
    removeEventListener("keydown", onInput);
    cancelAnimationFrame(raf);
    tweens.forEach((tween) => tween.kill());
    removeEventListener("resize", relayout);
    removeEventListener("pointermove", onPointer);
    watcher.disconnect();
    cat.dispose();
    kit.dispose();
    shadowTex.dispose();
    shadowGeo.dispose();
    catShadowMaterial.dispose();
  };
}
