/** How far the cloud reaches past the words' box, in pixels: the height of a puff. */
export const CLOUD_OUT = 16;

/**
 * A puff's share of the outline, about, in pixels; and their sizes in turn, so the cloud does not look stamped. Few,
 * wide and low: a busy outline pulls the eye off the words.
 */
const PUFF = 78;
const SIZES = [1, 1.18, 0.92, 1.12, 0.95, 1.2, 0.9];
/** How flat each puff is (its radius, of its chord), in turn: half would be a full half circle. */
const ROUND = [0.72, 0.78, 0.7, 0.76];
/** How far a puff's line goes on into the next one: a short curl, the hint that the cloud is drawn by hand. */
const CURL = (13 * Math.PI) / 180;

type Point = [x: number, y: number];

/**
 * A thought cloud round a box of words `width` by `height`, as two SVG paths in a drawing that is CLOUD_OUT wider than
 * the box on every side: `fill` is the cloud's whole shape, `line` its outline, puff by puff. The puffs go clockwise
 * round the box's rounded outline, each one an arc between two points on it, and each one's line curls a little into
 * the next. Their size is the same whatever the box's size: a bigger box gets more of them.
 */
export function cloudPath(width: number, height: number): { fill: string; line: string } {
  const r = Math.min(26, width / 2, height / 2);
  const [w, h] = [width - 2 * r, height - 2 * r];
  const quarter = (Math.PI * r) / 2;
  const sides = [w, quarter, h, quarter, w, quarter, h, quarter];
  const length = 2 * (w + h) + 4 * quarter;

  /** The point `s` pixels along the box's outline, clockwise from the end of its top left corner. */
  const at = (s: number): Point => {
    let side = 0;
    while (side < 7 && s > sides[side]!) s -= sides[side++]!;
    // A corner's turn so far, from the direction its side came in.
    const a = s / r + ((side - 1) / 2) * (Math.PI / 2) - Math.PI / 2;
    const corners: Point[] = [
      [width - r, r],
      [width - r, height - r],
      [r, height - r],
      [r, r],
    ];
    const on: Point =
      side === 0
        ? [r + s, 0]
        : side === 2
          ? [width, r + s]
          : side === 4
            ? [width - r - s, height]
            : side === 6
              ? [0, height - r - s]
              : [corners[(side - 1) / 2]![0] + r * Math.cos(a), corners[(side - 1) / 2]![1] + r * Math.sin(a)];
    return [on[0] + CLOUD_OUT, on[1] + CLOUD_OUT];
  };

  const count = Math.max(6, Math.round(length / PUFF));
  const sizes = Array.from({ length: count }, (_, i) => SIZES[i % SIZES.length]!);
  const total = sizes.reduce((sum, size) => sum + size, 0);
  let along = 0;
  const points = sizes.map((size) => {
    const point = at((length * along) / total);
    along += size;
    return point;
  });

  const n = (v: number) => String(Math.round(v * 10) / 10);
  let fill = `M${n(points[0]![0])} ${n(points[0]![1])}`;
  let line = "";
  points.forEach((a, i) => {
    const b = points[(i + 1) % count]!;
    const chord = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const radius = ROUND[i % ROUND.length]! * chord;
    // The puff's centre: off the chord's middle, toward the box (to the right, going clockwise).
    const off = Math.sqrt(radius * radius - (chord / 2) ** 2) / chord;
    const centre: Point = [(a[0] + b[0]) / 2 - (b[1] - a[1]) * off, (a[1] + b[1]) / 2 + (b[0] - a[0]) * off];
    const [x, y] = [b[0] - centre[0], b[1] - centre[1]];
    const curl: Point = [centre[0] + x * Math.cos(CURL) - y * Math.sin(CURL), centre[1] + x * Math.sin(CURL) + y * Math.cos(CURL)];
    const arc = `A${n(radius)} ${n(radius)} 0 0 1 `;
    fill += `${arc}${n(b[0])} ${n(b[1])}`;
    line += `M${n(a[0])} ${n(a[1])}${arc}${n(b[0])} ${n(b[1])}${arc}${n(curl[0])} ${n(curl[1])}`;
  });
  return { fill: `${fill}Z`, line };
}
