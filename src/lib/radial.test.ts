import { describe, expect, it } from "vitest";
import { arcPath, areaRadius, polar, wedgePath } from "./radial";

describe("polar", () => {
  it("puts 0° at twelve o'clock and goes clockwise", () => {
    expect(polar(0, 0, 10, 0)).toEqual({ x: 0, y: -10 });
    expect(polar(0, 0, 10, 90)).toEqual({ x: 10, y: 0 });
    expect(polar(0, 0, 10, 180)).toEqual({ x: 0, y: 10 });
  });
});

describe("areaRadius", () => {
  it("makes filled area proportional to the share", () => {
    const r0 = 20;
    const r1 = 100;
    const half = areaRadius(0.5, r0, r1);
    expect(half * half - r0 * r0).toBeCloseTo((r1 * r1 - r0 * r0) / 2);
    expect(areaRadius(0, r0, r1)).toBe(r0);
    expect(areaRadius(1, r0, r1)).toBe(r1);
    expect(areaRadius(3, r0, r1)).toBe(r1);
  });
});

describe("wedgePath", () => {
  it("is empty when there is nothing to draw", () => {
    expect(wedgePath(0, 0, 20, 20, 0, 30)).toBe("");
    expect(wedgePath(0, 0, 20, 40, 30, 30)).toBe("");
  });
  it("starts on the outer radius and closes", () => {
    const d = wedgePath(50, 50, 10, 40, 0, 90);
    expect(d.startsWith("M50 10")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
  });
});

describe("arcPath", () => {
  it("never draws a degenerate full circle", () => {
    expect(arcPath(0, 0, 10, 0, 360)).toContain(" 0 1 1 ");
    expect(arcPath(0, 0, 10, 0, 0)).toBe("");
  });
});
