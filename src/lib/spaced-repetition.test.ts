import { describe, expect, it } from "vitest";
import { calculateNextReview } from "./spaced-repetition";

const from = new Date("2026-11-18T12:00:00Z");
const daysAfter = (d: number) => new Date(from.getTime() + d * 86_400_000);

describe("calculateNextReview", () => {
  it("brings a shaky attempt back tomorrow and marks it learning", () => {
    for (const confidence of [1, 2]) {
      const r = calculateNextReview({ confidence, currentInterval: 30, currentStatus: "review", from });
      expect(r.newInterval).toBe(1);
      expect(r.newStatus).toBe("learning");
      expect(r.nextReviewDate).toEqual(daysAfter(1));
    }
  });

  it("schedules a 3 in three days and keeps it in review", () => {
    const r = calculateNextReview({ confidence: 3, currentInterval: 14, currentStatus: "mastered", from });
    expect(r.newInterval).toBe(3);
    expect(r.newStatus).toBe("review");
  });

  it("doubles the interval on a confident attempt", () => {
    const r = calculateNextReview({ confidence: 4, currentInterval: 7, currentStatus: "review", from });
    expect(r.newInterval).toBe(14);
  });

  it("never drops a confident attempt below its base interval", () => {
    const r = calculateNextReview({ confidence: 5, currentInterval: 1, currentStatus: "learning", from });
    expect(r.newInterval).toBe(14);
    expect(r.newStatus).toBe("review");
  });

  it("caps the interval at 180 days", () => {
    const r = calculateNextReview({ confidence: 5, currentInterval: 120, currentStatus: "mastered", from });
    expect(r.newInterval).toBe(180);
  });

  it("masters a problem after a confident review on a two-week interval", () => {
    const r = calculateNextReview({ confidence: 4, currentInterval: 14, currentStatus: "review", from });
    expect(r.newStatus).toBe("mastered");
  });

  it("uses the base interval on a first confident attempt", () => {
    const r = calculateNextReview({ confidence: 4, currentInterval: 0, currentStatus: "new_problem", from });
    expect(r.newInterval).toBe(7);
    expect(r.newStatus).toBe("review");
  });

  it("stays in review one day short of the two-week mastery threshold", () => {
    const r = calculateNextReview({ confidence: 4, currentInterval: 13, currentStatus: "review", from });
    expect(r.newInterval).toBe(26);
    expect(r.newStatus).toBe("review");
  });

  // Out-of-range confidence is not rejected here (the API validates it); these pin today's behaviour.
  it("treats confidence 0 like a failed attempt", () => {
    const r = calculateNextReview({ confidence: 0, currentInterval: 7, currentStatus: "review", from });
    expect(r.newInterval).toBe(1);
    expect(r.newStatus).toBe("learning");
  });

  it("gives confidence 6 a one-day base interval", () => {
    const r = calculateNextReview({ confidence: 6, currentInterval: 0, currentStatus: "new_problem", from });
    expect(r.newInterval).toBe(1);
    expect(r.newStatus).toBe("review");
  });

  it("keeps a mastered problem mastered on a confident check-in", () => {
    const r = calculateNextReview({ confidence: 4, currentInterval: 7, currentStatus: "mastered", from });
    expect(r.newStatus).toBe("mastered");
  });
});
