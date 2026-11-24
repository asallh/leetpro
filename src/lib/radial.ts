/**
 * Geometry for the dashboard's radial charts. Angles are in degrees, 0 at twelve
 * o'clock, increasing clockwise, so charts read like a clock face.
 */

export type Point = { x: number; y: number };

const round = (n: number) => Math.round(n * 100) / 100;

export function polar(cx: number, cy: number, r: number, deg: number): Point {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: round(cx + r * Math.cos(rad)), y: round(cy + r * Math.sin(rad)) };
}

/** An annular wedge between radii r0 and r1, from angle a0 to a1 (a1 > a0). */
export function wedgePath(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  if (r1 <= r0 || a1 <= a0) return "";
  const large = a1 - a0 > 180 ? 1 : 0;
  const o0 = polar(cx, cy, r1, a0);
  const o1 = polar(cx, cy, r1, a1);
  const i1 = polar(cx, cy, r0, a1);
  const i0 = polar(cx, cy, r0, a0);
  return [
    `M${o0.x} ${o0.y}`,
    `A${r1} ${r1} 0 ${large} 1 ${o1.x} ${o1.y}`,
    `L${i1.x} ${i1.y}`,
    `A${r0} ${r0} 0 ${large} 0 ${i0.x} ${i0.y}`,
    "Z",
  ].join(" ");
}

/** An open arc stroke along radius r, for progress rings. A full turn is split so SVG can draw it. */
export function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const sweep = Math.min(359.99, Math.max(0, a1 - a0));
  if (sweep === 0) return "";
  const end = a0 + sweep;
  const s = polar(cx, cy, r, a0);
  const e = polar(cx, cy, r, end);
  return `M${s.x} ${s.y} A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
}

/**
 * Outer radius for a wedge whose filled share is `frac`, so the filled area (not the
 * radius) is proportional to the share. Without this, half-solved topics look like
 * a quarter.
 */
export function areaRadius(frac: number, r0: number, r1: number): number {
  const f = Math.min(1, Math.max(0, frac));
  return Math.sqrt(r0 * r0 + f * (r1 * r1 - r0 * r0));
}
