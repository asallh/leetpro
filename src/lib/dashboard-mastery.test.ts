import { describe, expect, it } from "vitest";
import {
  buildActivity,
  buildDifficulty,
  buildStages,
  buildStuckProblems,
  buildTrend,
  stageOf,
  struggleScore,
  trendSentence,
  type MasteryAttempt,
  type MasteryProblem,
  type Result,
} from "./dashboard-mastery";

const NOW = new Date("2026-11-24T20:00:00");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

let seq = 0;
function problem(over: Partial<MasteryProblem> & { difficulty?: "easy" | "medium" | "hard" } = {}): MasteryProblem {
  seq++;
  const { difficulty = "medium", ...rest } = over;
  return {
    id: `up${seq}`,
    problemId: `p${seq}`,
    status: "learning",
    totalAttempts: 1,
    bestConfidence: 3,
    lastAttemptDate: daysAgo(0),
    reviewInterval: 7,
    problem: { title: `Problem ${seq}`, slug: `problem-${seq}`, difficulty, leetcodeId: null, topics: ["Arrays & Hashing"] },
    ...rest,
  };
}
const attempt = (problemId: string, ago: number, result: Result, confidence = 3): MasteryAttempt => ({
  problemId,
  date: daysAgo(ago),
  confidence,
  result,
});

describe("stageOf", () => {
  it("puts a forgotten mastered problem in fading, not mastered", () => {
    expect(stageOf(problem({ status: "mastered", lastAttemptDate: daysAgo(30), reviewInterval: 7 }), NOW)).toBe("fading");
  });
  it("separates mastered, holding and learning", () => {
    expect(stageOf(problem({ status: "mastered" }), NOW)).toBe("mastered");
    expect(stageOf(problem({ bestConfidence: 4 }), NOW)).toBe("holding");
    expect(stageOf(problem({ bestConfidence: 2 }), NOW)).toBe("learning");
  });
  it("skips problems with no attempt", () => {
    expect(stageOf(problem({ totalAttempts: 0, lastAttemptDate: null }), NOW)).toBeNull();
  });
});

describe("buildStages", () => {
  it("counts each stage and writes one sentence", () => {
    const s = buildStages(
      [problem({ status: "mastered" }), problem({ bestConfidence: 4 }), problem({ bestConfidence: 1 }), problem({ lastAttemptDate: daysAgo(40) })],
      NOW
    );
    expect(s.counts).toEqual({ mastered: 1, holding: 1, learning: 1, fading: 1 });
    expect(s.sentence).toBe("You've mastered 1 of 4 problems. 1 more is solved and holding, 1 is still shaky and 1 is fading.");
  });
  it("has an empty-state sentence", () => {
    expect(buildStages([], NOW).total).toBe(0);
  });
});

describe("buildDifficulty", () => {
  it("reports solved count and unaided rate per difficulty", () => {
    const a = problem({ difficulty: "hard", bestConfidence: 4 });
    const b = problem({ difficulty: "hard", bestConfidence: 2 });
    const rows = buildDifficulty([a, b], [
      attempt(a.problemId, 1, "solved_independently", 4),
      attempt(b.problemId, 1, "needed_solution", 2),
    ]);
    const hard = rows.find((r) => r.difficulty === "hard")!;
    expect(hard).toMatchObject({ tried: 2, solved: 1, attempts: 2, unaidedRate: 0.5, avgConfidence: 3 });
    expect(rows.find((r) => r.difficulty === "easy")!.unaidedRate).toBeNull();
  });
});

describe("buildStuckProblems", () => {
  it("lists problems whose last attempt failed or that stay below confidence 3", () => {
    const failedTwice = problem({ bestConfidence: 2 });
    const stuckLow = problem({ bestConfidence: 2 });
    const fine = problem({ bestConfidence: 4 });
    const recovered = problem({ bestConfidence: 4 });
    const out = buildStuckProblems(
      [failedTwice, stuckLow, fine, recovered],
      [
        attempt(failedTwice.problemId, 5, "could_not_solve", 1),
        attempt(failedTwice.problemId, 1, "needed_solution", 2),
        attempt(stuckLow.problemId, 5, "solved_with_hint", 2),
        attempt(stuckLow.problemId, 1, "solved_with_hint", 2),
        attempt(fine.problemId, 1, "solved_independently", 4),
        attempt(recovered.problemId, 5, "needed_solution", 1),
        attempt(recovered.problemId, 1, "solved_independently", 4),
      ]
    );
    expect(out.map((p) => p.id)).toEqual([failedTwice.id, stuckLow.id]);
    expect(out[0].reason).toBe("Needed the solution or got stuck on 2 of 2 tries");
    expect(out[1].reason).toBe("Best confidence is 2 after 2 tries");
  });
});

describe("struggleScore", () => {
  it("ranks a topic with failures below one with the same confidence and none", () => {
    const row = { avgConfidence: 3, fading: 0 };
    expect(struggleScore(row, { attempts: 4, unaidedRate: 0, failedRate: 0.5 })).toBeLessThan(
      struggleScore(row, { attempts: 4, unaidedRate: 1, failedRate: 0 })
    );
  });
});

describe("buildTrend", () => {
  it("buckets attempts into 8 weeks ending this week", () => {
    const { series } = buildTrend([attempt("x", 0, "solved_independently", 4), attempt("x", 70, "solved_independently", 4)], NOW);
    expect(series).toHaveLength(8);
    expect(series[7].attempts).toBe(1);
    expect(series.reduce((n, w) => n + w.attempts, 0)).toBe(1);
  });
});

describe("trendSentence", () => {
  it("says when confidence went up", () => {
    expect(trendSentence({ n: 5, conf: 2.5, un: 0.2 }, { n: 6, conf: 3.6, un: 0.5 }, 4)).toBe(
      "Confidence is up from 2.5 to 3.6 over the last 4 weeks, and you solve 50% without help, up from 20%."
    );
  });
  it("waits for enough attempts", () => {
    expect(trendSentence({ n: 1, conf: 3, un: 0 }, { n: 4, conf: 3, un: 0 }, 4)).toMatch(/A trend shows/);
  });
});

describe("buildActivity", () => {
  it("counts attempts per day and keeps a streak alive until today ends", () => {
    const a = buildActivity([daysAgo(1), daysAgo(1), daysAgo(2), daysAgo(5)], NOW, 7);
    expect(a.series.map((d) => d.count)).toEqual([0, 1, 0, 0, 1, 2, 0]);
    expect(a.streak).toBe(2);
    expect(a.activeDays).toBe(3);
    expect(a.total).toBe(4);
  });
  it("has no streak after a missed day", () => {
    expect(buildActivity([daysAgo(2)], NOW).streak).toBe(0);
  });
});
