import * as THREE from "three";
import { tokenColor } from "./palette";

// A book for the cat to read, built in code from the closed book's size and cover, so the book he
// reads is the one he took from the shelf: two boards, two blocks of pages, and one leaf that turns.
// Its origin is the middle of the spine, under the boards; the spine runs along Z, the pages open
// to -X and +X. Shut, it lies on its back cover with the front half folded over onto it.

export type OpenBook = {
  group: THREE.Group;
  /** Opens it: 0 lies shut, 1 lies open flat. */
  open(t: number): void;
  /** Turns the leaf: 0 lies on the right, 1 on the left. */
  turn(t: number): void;
  /** A point on the open pages, in the group's frame: u runs across both pages 0..1, v down them 0..1. */
  spot(u: number, v: number, out: THREE.Vector3): THREE.Vector3;
  dispose(): void;
};

const LEAF_SEGMENTS = 12;
/** BoxGeometry's face for +Y: a page block's top is the open page. */
const TOP_FACE = 2;

/** Lines of text on a page, drawn once and shared by every open book. */
let pageMap: THREE.CanvasTexture | null = null;
function linedPage() {
  if (pageMap) return pageMap;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 384;
  const g = canvas.getContext("2d");
  if (!g) throw new Error("No 2D canvas for the open book");
  g.fillStyle = `#${tokenColor("cream-50").getHexString()}`;
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = `#${tokenColor("cream-300").getHexString()}`;
  for (let y = 40, i = 0; y < canvas.height - 36; y += 18, i++) {
    const end = i % 7 === 6 ? 0.55 : 0.92 - ((i * 37) % 11) / 100;
    g.fillRect(26, y, (canvas.width - 52) * end, 6);
  }
  pageMap = new THREE.CanvasTexture(canvas);
  pageMap.colorSpace = THREE.SRGBColorSpace;
  return pageMap;
}

/**
 * @param size the closed book: thickness (x), height (y) and depth (z), in metres.
 * @param cover the token of its cover color.
 */
export function makeOpenBook(size: THREE.Vector3, cover: string): OpenBook {
  const group = new THREE.Group();
  const width = size.z; // each page, spine to fore-edge
  const length = size.y; // along the spine
  const board = 0.006;
  const block = Math.max(0.008, (size.x - 2 * board) / 2); // each side's pages
  // The front half turns about the spine at the height of the open pages: shut, it lies on the back half.
  const hinge = new THREE.Group();
  hinge.position.y = board + block;
  group.add(hinge);

  const boardMaterial = new THREE.MeshStandardMaterial({ color: tokenColor(cover), roughness: 0.6 });
  const edgeMaterial = new THREE.MeshStandardMaterial({ color: tokenColor("cream-200"), roughness: 0.9 });
  const pageMaterial = new THREE.MeshStandardMaterial({ map: linedPage(), roughness: 0.9, side: THREE.DoubleSide });
  const owned: Array<{ dispose(): void }> = [boardMaterial, edgeMaterial, pageMaterial];
  const pages = Array.from({ length: 6 }, (_, i) => (i === TOP_FACE ? pageMaterial : edgeMaterial));

  const box = (parent: THREE.Object3D, dims: THREE.Vector3Tuple, at: THREE.Vector2Tuple, materials: THREE.Material | THREE.Material[]) => {
    const geometry = new THREE.BoxGeometry(...dims);
    owned.push(geometry);
    const mesh = new THREE.Mesh(geometry, materials);
    mesh.position.set(at[0], at[1], 0);
    parent.add(mesh);
  };

  // Each half: a board a little longer and wider than its pages, and the block of pages on it.
  const boardSize: THREE.Vector3Tuple = [width + 0.01, board, length + 0.012];
  const blockSize: THREE.Vector3Tuple = [width, block, length];
  box(group, boardSize, [-boardSize[0] / 2, board / 2], boardMaterial);
  box(group, blockSize, [-width / 2, board + block / 2], pages);
  box(hinge, boardSize, [boardSize[0] / 2, board / 2 - hinge.position.y], boardMaterial);
  box(hinge, blockSize, [width / 2, -block / 2], pages);

  // The leaf: a plane hinged on the spine, lying on the right pages, bent as it turns.
  const leafGeometry = new THREE.PlaneGeometry(width, length, LEAF_SEGMENTS, 1);
  leafGeometry.rotateX(-Math.PI / 2);
  leafGeometry.translate(width / 2, 0, 0);
  owned.push(leafGeometry);
  const leaf = new THREE.Mesh(leafGeometry, pageMaterial);
  leaf.position.y = 0.001;
  hinge.add(leaf);
  const flat = Float32Array.from(leafGeometry.attributes.position.array);

  const turn = (t: number) => {
    const angle = Math.PI * THREE.MathUtils.clamp(t, 0, 1);
    // Midway the fore-edge lags behind the spine, as a real page does.
    const curl = 0.9 * Math.sin(angle);
    const position = leafGeometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const r = flat[i * 3];
      const a = angle - curl * (r / width) ** 2;
      position.setXYZ(i, r * Math.cos(a), r * Math.sin(a), flat[i * 3 + 2]);
    }
    position.needsUpdate = true;
    leafGeometry.computeVertexNormals();
    leaf.visible = t > 0.001 && t < 0.999;
  };
  turn(0);

  return {
    group,
    open(t) {
      hinge.rotation.z = Math.PI * (1 - THREE.MathUtils.clamp(t, 0, 1));
    },
    turn,
    spot(u, v, out) {
      return out.set((u * 2 - 1) * width * 0.8, board + block, (v - 0.5) * length * 0.8);
    },
    dispose() {
      owned.forEach((o) => o.dispose());
    },
  };
}
