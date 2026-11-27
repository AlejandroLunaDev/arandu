import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { tokenColor, tokenValue } from "@/landing/stage/palette";

/** Bubbles that rise from the fish, and sparks that burst round it. */
const BUBBLES = 34;
const SPARKS = 90;
/** Where the fish is on the canvas, in the scene's units: a little over the middle, the words under it. */
const FISH = new THREE.Vector3(0, 0.45, 0);
/** How far up and out the scene reaches before a bubble starts again by the fish. */
const TOP = 3.4;

/**
 * The celebration when the day's peixinhos are caught: soap bubbles that catch two moving lights rise from the fish
 * and drift up, and amber and cream sparks burst round it, again and again, until stop().
 */
export function runCatch(canvas: HTMLCanvasElement): () => void {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
  camera.position.z = 8;

  // Two lights circle the fish, so the bubbles' shine moves over them.
  const warm = new THREE.PointLight(tokenColor("amber-300"), 30, 12);
  const cool = new THREE.PointLight(tokenColor("violet-400"), 24, 12);
  scene.add(warm, cool, new THREE.AmbientLight(tokenColor("cream-50"), 0.4));

  const bubble = new THREE.SphereGeometry(1, 32, 16);
  const film = new THREE.MeshPhysicalMaterial({
    color: tokenColor("cream-50"),
    roughness: 0.04,
    transparent: true,
    opacity: 0.32,
    iridescence: 1,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [180, 520],
    clearcoat: 1,
    envMapIntensity: 1.8,
    depthWrite: false,
  });
  const bubbles = new THREE.InstancedMesh(bubble, film, BUBBLES);
  scene.add(bubbles);
  const pos = new Float32Array(BUBBLES * 3);
  const vel = new Float32Array(BUBBLES * 3);
  const size = new Float32Array(BUBBLES);
  const wobble = new Float32Array(BUBBLES);
  const blow = (i: number, burst: boolean) => {
    const a = Math.random() * Math.PI * 2;
    const out = burst ? 0.8 + Math.random() * 1.6 : 0.2 + Math.random() * 0.4;
    // Each number on its own, no array: this runs in the draw loop.
    const k = i * 3;
    pos[k] = FISH.x;
    pos[k + 1] = FISH.y;
    pos[k + 2] = (Math.random() - 0.5) * 0.6;
    vel[k] = Math.cos(a) * out;
    vel[k + 1] = Math.sin(a) * out * 0.6 + 0.5;
    vel[k + 2] = 0;
    size[i] = 0.07 + Math.random() ** 2 * 0.24;
    wobble[i] = Math.random() * Math.PI * 2;
  };
  for (let i = 0; i < BUBBLES; i++) blow(i, true);

  // A spark is a four-pointed star drawn once on a canvas, added onto what is behind it.
  const star = document.createElement("canvas");
  star.width = star.height = 64;
  const g = star.getContext("2d");
  if (g) {
    // Drawn in cream: the points' own colours tint it.
    const cream = tokenValue("cream-50");
    const glow = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    glow.addColorStop(0, cream);
    glow.addColorStop(1, "transparent");
    g.globalAlpha = 0.6;
    g.fillStyle = glow;
    g.fillRect(0, 0, 64, 64);
    g.globalAlpha = 1;
    g.fillStyle = cream;
    g.beginPath();
    g.moveTo(32, 0);
    g.quadraticCurveTo(35, 29, 64, 32);
    g.quadraticCurveTo(35, 35, 32, 64);
    g.quadraticCurveTo(29, 35, 0, 32);
    g.quadraticCurveTo(29, 29, 32, 0);
    g.fill();
  }
  const sprite = new THREE.CanvasTexture(star);
  const sparkGeometry = new THREE.BufferGeometry();
  const sparkAt = new Float32Array(SPARKS * 3);
  const sparkInk = new Float32Array(SPARKS * 3);
  const sparkVel = new Float32Array(SPARKS * 3);
  const sparkLife = new Float32Array(SPARKS);
  sparkGeometry.setAttribute("position", new THREE.BufferAttribute(sparkAt, 3));
  sparkGeometry.setAttribute("color", new THREE.BufferAttribute(sparkInk, 3));
  const sparkMaterial = new THREE.PointsMaterial({
    size: 0.32,
    map: sprite,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  scene.add(new THREE.Points(sparkGeometry, sparkMaterial));
  const inks = [tokenColor("amber-300"), tokenColor("amber-400"), tokenColor("cream-50")];
  const ink = new Float32Array(SPARKS * 3);
  const spark = (i: number) => {
    const a = Math.random() * Math.PI * 2;
    const out = 1.5 + Math.random() * 3;
    const k = i * 3;
    sparkAt[k] = FISH.x;
    sparkAt[k + 1] = FISH.y;
    sparkAt[k + 2] = 0.4;
    sparkVel[k] = Math.cos(a) * out;
    sparkVel[k + 1] = Math.sin(a) * out;
    sparkVel[k + 2] = (Math.random() - 0.5) * 2;
    sparkLife[i] = 0.7 + Math.random() * 0.9;
    const c = inks[i % inks.length]!;
    ink[k] = c.r;
    ink[k + 1] = c.g;
    ink[k + 2] = c.b;
  };
  for (let i = 0; i < SPARKS; i++) spark(i);

  const measure = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const resize = new ResizeObserver(measure);
  resize.observe(canvas);
  measure();

  const dummy = new THREE.Object3D();
  let before = performance.now();
  let frame = 0;
  const draw = () => {
    const now = performance.now();
    const dt = Math.min((now - before) / 1000, 0.05);
    before = now;
    const t = now / 1000;
    warm.position.set(Math.cos(t * 1.3) * 2.4, FISH.y + Math.sin(t * 1.3) * 1.6, 2.5);
    cool.position.set(Math.cos(t * 1.3 + Math.PI) * 2.4, FISH.y + Math.sin(t * 1.3 + Math.PI) * 1.6, 2.5);

    for (let i = 0; i < BUBBLES; i++) {
      const k = i * 3;
      // Thrown out of the fish, they slow down and float up, swaying, until they leave the top and start again.
      vel[k] = vel[k]! * (1 - dt * 1.4);
      vel[k + 1] = vel[k + 1]! + (0.55 - vel[k + 1]!) * dt * 1.2;
      pos[k] = pos[k]! + (vel[k]! + Math.sin(t * 1.7 + wobble[i]!) * 0.18) * dt;
      pos[k + 1] = pos[k + 1]! + vel[k + 1]! * dt;
      if (pos[k + 1]! > TOP + size[i]!) blow(i, false);
      const breathe = 1 + Math.sin(t * 3 + wobble[i]!) * 0.04;
      dummy.position.set(pos[k]!, pos[k + 1]!, pos[k + 2]!);
      dummy.scale.set(size[i]! * breathe, size[i]! / breathe, size[i]!);
      dummy.updateMatrix();
      bubbles.setMatrixAt(i, dummy.matrix);
    }
    bubbles.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < SPARKS; i++) {
      const k = i * 3;
      sparkLife[i] = sparkLife[i]! - dt;
      if (sparkLife[i]! <= 0) spark(i);
      const drag = 1 - dt * 2.2;
      sparkVel[k] = sparkVel[k]! * drag;
      sparkVel[k + 1] = sparkVel[k + 1]! * drag - dt * 0.8;
      sparkVel[k + 2] = sparkVel[k + 2]! * drag;
      sparkAt[k] = sparkAt[k]! + sparkVel[k]! * dt;
      sparkAt[k + 1] = sparkAt[k + 1]! + sparkVel[k + 1]! * dt;
      sparkAt[k + 2] = sparkAt[k + 2]! + sparkVel[k + 2]! * dt;
      // They twinkle as they fade.
      const shine = Math.min(1, sparkLife[i]! * 1.5) * (0.6 + 0.4 * Math.sin(t * 18 + i));
      sparkInk[k] = ink[k]! * shine;
      sparkInk[k + 1] = ink[k + 1]! * shine;
      sparkInk[k + 2] = ink[k + 2]! * shine;
    }
    sparkGeometry.attributes.position!.needsUpdate = true;
    sparkGeometry.attributes.color!.needsUpdate = true;

    renderer.render(scene, camera);
    frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw);

  return () => {
    cancelAnimationFrame(frame);
    resize.disconnect();
    bubble.dispose();
    film.dispose();
    sprite.dispose();
    sparkGeometry.dispose();
    sparkMaterial.dispose();
    scene.environment?.dispose();
    room.dispose();
    pmrem.dispose();
    renderer.dispose();
  };
}
