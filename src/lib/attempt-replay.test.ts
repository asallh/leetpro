import { describe, expect, it } from "vitest";
import { replayAttempts } from "./attempt-replay";

const t0 = new Date("2026-11-01T12:00:00Z");
const day = (d: number) => new Date(t0.getTime() + d * 86_400_000);
const attempt = (id: string, d: number, confidence: number) => ({ id, date: day(d), createdAt: day(d), confidence });

describe("replayAttempts", () => {
  it("returns no problem state when nothing is left", () => {
    expect(replayAttempts([])).toEqual({ attempts: [], problem: null });
  });

  it("schedules a lone attempt as if it were the first ever logged", () => {
    const { attempts, problem } = replayAttempts([attempt("a", 0, 4)]);
    expect(attempts).toEqual([{ id: "a", attemptNumber: 1, prevInterval: 0, prevStatus: "new_problem" }]);
    expect(problem).toEqual({
      status: "review",
      reviewInterval: 7,
      nextReviewDate: day(7),
      totalAttempts: 1,
      lastAttemptDate: day(0),
      bestConfidence: 4,
    });
  });

  it("chains each attempt's starting schedule from the one before, oldest first", () => {
    // Given out of order on purpose.
    const { attempts, problem } = replayAttempts([attempt("c", 10, 5), attempt("a", 0, 4), attempt("b", 7, 3)]);
    expect(attempts).toEqual([
      { id: "a", attemptNumber: 1, prevInterval: 0, prevStatus: "new_problem" },
      { id: "b", attemptNumber: 2, prevInterval: 7, prevStatus: "review" },
      { id: "c", attemptNumber: 3, prevInterval: 3, prevStatus: "review" },
    ]);
    expect(problem).toMatchObject({ reviewInterval: 14, nextReviewDate: day(24), totalAttempts: 3, bestConfidence: 5 });
  });

  it("drops a removed duplicate's effect on the schedule and best confidence", () => {
    // A 5 logged twice by mistake: the second would have doubled the interval.
    const withDuplicate = replayAttempts([attempt("a", 0, 5), attempt("dup", 0.001, 5)]);
    expect(withDuplicate.problem?.reviewInterval).toBe(28);

    const after = replayAttempts([attempt("a", 0, 5)]);
    expect(after.problem).toMatchObject({ reviewInterval: 14, totalAttempts: 1, nextReviewDate: day(14) });
  });

  it("breaks ties on date by creation time", () => {
    const same = day(0);
    const { attempts } = replayAttempts([
      { id: "second", date: same, createdAt: day(1), confidence: 3 },
      { id: "first", date: same, createdAt: day(0), confidence: 3 },
    ]);
    expect(attempts.map((a) => a.id)).toEqual(["first", "second"]);
  });
});
