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

  it("undoes a removed attempt's best confidence and renumbers the ones after it", () => {
    const withMistake = replayAttempts([attempt("a", 0, 3), attempt("oops", 1, 5), attempt("c", 4, 3)]);
    expect(withMistake.problem).toMatchObject({ bestConfidence: 5, totalAttempts: 3 });
    expect(withMistake.attempts[2]).toMatchObject({ id: "c", attemptNumber: 3 });

    // "oops" removed: c is attempt 2 and starts from the interval a earned.
    const after = replayAttempts([attempt("a", 0, 3), attempt("c", 4, 3)]);
    expect(after.problem).toMatchObject({ bestConfidence: 3, totalAttempts: 2, reviewInterval: 3, nextReviewDate: day(7) });
    expect(after.attempts[1]).toEqual({ id: "c", attemptNumber: 2, prevInterval: 3, prevStatus: "review" });
  });

  it("threads the stage through mastery and a lapse", () => {
    const { attempts, problem } = replayAttempts([attempt("a", 0, 5), attempt("b", 14, 5), attempt("c", 42, 2)]);
    expect(attempts[1]).toMatchObject({ prevInterval: 14, prevStatus: "review" });
    expect(attempts[2]).toMatchObject({ prevInterval: 28, prevStatus: "mastered" });
    expect(problem).toMatchObject({
      status: "learning",
      reviewInterval: 1,
      nextReviewDate: day(43),
      bestConfidence: 5,
      lastAttemptDate: day(42),
    });
  });

  it("breaks ties on date by creation time", () => {
    const same = day(0);
    const { attempts } = replayAttempts([
      { id: "second", date: same, createdAt: day(1), confidence: 3 },
      { id: "first", date: same, createdAt: day(0), confidence: 3 },
    ]);
    expect(attempts.map((a) => a.id)).toEqual(["first", "second"]);
  });

  it("falls back to id when a double submit ties on both timestamps", () => {
    const same = day(0);
    const twice = (id: string) => ({ id, date: same, createdAt: same, confidence: 3 });
    expect(replayAttempts([twice("b"), twice("a")]).attempts.map((a) => a.id)).toEqual(["a", "b"]);
    expect(replayAttempts([twice("a"), twice("b")]).attempts.map((a) => a.id)).toEqual(["a", "b"]);
  });
});
