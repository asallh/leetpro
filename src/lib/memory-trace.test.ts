import { describe, expect, it } from "vitest";
import { buildTrace, CLUSTER_GAP, type TracePoint } from "./memory-trace";
import { DUE_RECALL, estimateRecall } from "./recall";

const DAY = 86_400_000;
const t0 = new Date("2026-11-01T12:00:00Z");
const day = (d: number) => new Date(t0.getTime() + d * DAY);
const attempt = (d: number, prevInterval: number | null, id = `a${d}`) => ({ id, date: day(d), prevInterval });

/** The sampled point nearest to time t. */
function nearest(points: TracePoint[], t: number) {
  return points.reduce((best, p) => (Math.abs(p.t - t) < Math.abs(best.t - t) ? p : best));
}

describe("buildTrace", () => {
  it("matches estimateRecall, so the chart and the Recall now figure agree", () => {
    const trace = buildTrace({ attempts: [attempt(0, 0)], currentInterval: 7, nextReviewDate: day(7), now: day(4) });
    for (const p of trace.past[0]) {
      expect(p.r).toBeCloseTo(estimateRecall(t0, 7, new Date(p.t))!, 12);
    }
    expect(trace.past[0].at(-1)!.r).toBeCloseTo(estimateRecall(t0, 7, day(4))!, 12);
  });

  it("decays each segment on the interval set after that attempt", () => {
    // Attempt 2's prevInterval (3) is the interval attempt 1 earned; the latest uses currentInterval.
    const trace = buildTrace({
      attempts: [attempt(0, 0), attempt(5, 3)],
      currentInterval: 7,
      nextReviewDate: day(12),
      now: day(20),
    });
    expect(nearest(trace.past[0], day(3).getTime()).r).toBeCloseTo(DUE_RECALL, 1);
    expect(nearest(trace.past[1], day(12).getTime()).r).toBeCloseTo(DUE_RECALL, 1);
  });

  it("starts every segment back at 100%", () => {
    const trace = buildTrace({
      attempts: [attempt(0, 0), attempt(2, 1), attempt(6, 3)],
      currentInterval: 7,
      nextReviewDate: day(13),
      now: day(8),
    });
    expect(trace.past).toHaveLength(3);
    for (const run of trace.past) expect(run[0].r).toBe(1);
  });

  it("treats a missing or zero prevInterval as one day", () => {
    const missing = buildTrace({ attempts: [attempt(0, 0), attempt(4, null)], currentInterval: 3, nextReviewDate: null, now: day(5) });
    const zero = buildTrace({ attempts: [attempt(0, 0), attempt(4, 0)], currentInterval: 3, nextReviewDate: null, now: day(5) });
    expect(nearest(missing.past[0], day(1).getTime()).r).toBeCloseTo(DUE_RECALL, 1);
    expect(zero.past[0]).toEqual(missing.past[0]);
  });

  it("splits the latest segment at now: solid before, projected after", () => {
    const now = day(3);
    const trace = buildTrace({ attempts: [attempt(0, 0)], currentInterval: 7, nextReviewDate: day(7), now });
    expect(trace.past[0].at(-1)!.t).toBe(now.getTime());
    expect(trace.future[0].t).toBe(now.getTime());
    expect(trace.future.at(-1)!.t).toBe(trace.end);
    expect(trace.end).toBeGreaterThan(day(7).getTime());
  });

  it("keeps only a short projection past now when the review is already overdue", () => {
    const trace = buildTrace({ attempts: [attempt(0, 0)], currentInterval: 1, nextReviewDate: day(1), now: day(10) });
    expect(trace.end).toBeGreaterThan(day(10).getTime());
    expect(trace.future.length).toBeGreaterThan(0);
    expect(trace.past[0].at(-1)!.r).toBeLessThan(DUE_RECALL);
  });

  it("never samples backwards or above 100% when an attempt is dated after now", () => {
    const trace = buildTrace({ attempts: [attempt(0, 0), attempt(2, 1)], currentInterval: 3, nextReviewDate: day(5), now: day(1) });
    const latest = trace.past[1];
    for (let i = 1; i < latest.length; i++) expect(latest[i].t).toBeGreaterThanOrEqual(latest[i - 1].t);
    for (const p of [...trace.past.flat(), ...trace.future]) expect(p.r).toBeLessThanOrEqual(1);
  });

  it("has a positive span for a single attempt logged right now", () => {
    const trace = buildTrace({ attempts: [attempt(0, 0)], currentInterval: 1, nextReviewDate: null, now: t0 });
    expect(trace.end).toBeGreaterThan(trace.start);
    expect(trace.past[0].every((p) => Number.isFinite(p.r))).toBe(true);
  });

  describe("clusters", () => {
    it("groups attempts closer than the cluster gap", () => {
      const close = [attempt(0, 0, "a"), { id: "b", date: new Date(t0.getTime() + 60_000), prevInterval: 1 }];
      const trace = buildTrace({ attempts: close, currentInterval: 7, nextReviewDate: day(30), now: day(1) });
      expect(trace.clusters.map((c) => c.map((a) => a.id))).toEqual([["a", "b"]]);
    });

    it("measures from the group's first attempt, so a chain cannot stretch across the axis", () => {
      // 100-day axis: each step is 2% (under the gap) but the chain spans 8%.
      const attempts = [0, 2, 4, 6, 8].map((d) => attempt(d, 1));
      const trace = buildTrace({ attempts, currentInterval: 1, nextReviewDate: day(96), now: day(96) });
      const span = trace.end - trace.start;
      for (const group of trace.clusters) {
        const width = (group.at(-1)!.date.getTime() - group[0].date.getTime()) / span;
        expect(width).toBeLessThan(CLUSTER_GAP);
      }
      expect(trace.clusters.length).toBeGreaterThan(1);
    });
  });
});
