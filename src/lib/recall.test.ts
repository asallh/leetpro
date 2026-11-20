import { describe, expect, it } from "vitest";
import { DUE_RECALL, estimateRecall, isFading } from "./recall";

const DAY = 86_400_000;
const now = new Date("2026-11-18T12:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * DAY);

describe("estimateRecall", () => {
  it("is null when the problem was never attempted", () => {
    expect(estimateRecall(null, 7, now)).toBeNull();
  });

  it("is 100% right after an attempt", () => {
    expect(estimateRecall(now, 7, now)).toBe(1);
  });

  it("reaches the review threshold exactly on the scheduled review day", () => {
    expect(estimateRecall(daysAgo(7), 7, now)).toBeCloseTo(DUE_RECALL, 10);
  });

  it("fades slower for a longer interval", () => {
    expect(estimateRecall(daysAgo(3), 14, now)!).toBeGreaterThan(estimateRecall(daysAgo(3), 3, now)!);
  });

  it("treats an interval below one day as one day", () => {
    expect(estimateRecall(daysAgo(1), 0, now)).toBeCloseTo(DUE_RECALL, 10);
  });

  it("does not go above 100% for an attempt dated in the future", () => {
    expect(estimateRecall(daysAgo(-2), 7, now)).toBe(1);
  });
});

describe("isFading", () => {
  it("is true only below the review threshold", () => {
    expect(isFading(null)).toBe(false);
    expect(isFading(DUE_RECALL)).toBe(false);
    expect(isFading(DUE_RECALL - 0.01)).toBe(true);
  });
});
