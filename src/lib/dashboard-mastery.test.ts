import { describe, expect, it } from "vitest";
import {
  buildActivity,
  buildDifficulty,
  buildStages,
  buildStuckProblems,
  buildTopicStats,
  buildTrend,
  stageOf,
  stageSentence,
  struggleScore,
  topicStruggleSentence,
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
    problem: {
      title: `Problem ${seq}`,
      slug: `problem-${seq}`,
      difficulty,
      leetcodeId: null,
      topics: ["Arrays & Hashing"],
    },
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
    expect(stageOf(problem({ status: "mastered", lastAttemptDate: daysAgo(30), reviewInterval: 7 }), NOW)).toBe(
      "fading",
    );
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
      [
        problem({ status: "mastered" }),
        problem({ bestConfidence: 4 }),
        problem({ bestConfidence: 1 }),
        problem({ lastAttemptDate: daysAgo(40) }),
      ],
      NOW,
    );
    expect(s.counts).toEqual({ mastered: 1, holding: 1, learning: 1, fading: 1 });
    expect(s.sentence).toBe(
      "You've mastered 1 of 4 problems. 1 more is solved and holding, 1 is still shaky and 1 is fading.",
    );
  });
  it("has an empty-state sentence", () => {
    const empty = buildStages([], NOW);
    expect(empty.total).toBe(0);
    expect(empty.sentence).toMatch(/^Log a few attempts/);
  });
});

describe("buildDifficulty", () => {
  it("reports solved count and unaided rate per difficulty", () => {
    const a = problem({ difficulty: "hard", bestConfidence: 4 });
    const b = problem({ difficulty: "hard", bestConfidence: 2 });
    const rows = buildDifficulty(
      [a, b],
      [attempt(a.problemId, 1, "solved_independently", 4), attempt(b.problemId, 1, "needed_solution", 2)],
    );
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
      ],
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
      struggleScore(row, { attempts: 4, unaidedRate: 1, failedRate: 0 }),
    );
  });
});

describe("buildTrend", () => {
  it("buckets attempts into 8 weeks ending this week", () => {
    const { series } = buildTrend(
      [attempt("x", 0, "solved_independently", 4), attempt("x", 70, "solved_independently", 4)],
      NOW,
    );
    expect(series).toHaveLength(8);
    expect(series[7].attempts).toBe(1);
    expect(series.reduce((n, w) => n + w.attempts, 0)).toBe(1);
  });
});

describe("trendSentence", () => {
  it("says when confidence went up", () => {
    expect(trendSentence({ n: 5, conf: 2.5, un: 0.2 }, { n: 6, conf: 3.6, un: 0.5 }, 4)).toBe(
      "Confidence is up from 2.5 to 3.6 over the last 4 weeks, and you solve 50% without help, up from 20%.",
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

describe("buildTrend across daylight saving", () => {
  it("counts a Monday after spring-forward in its own week", () => {
    // In US time zones the week of Mar 9 2026 is an hour short; bucketing by milliseconds put it a week early.
    const now = new Date(2026, 3, 22, 12);
    const { series } = buildTrend(
      [{ problemId: "x", date: new Date(2026, 2, 9, 10), confidence: 4, result: "solved_independently" }],
      now,
    );
    const week = series.find((w) => w.weekStart.getTime() === new Date(2026, 2, 9).getTime());
    expect(week?.attempts).toBe(1);
  });
});

describe("stageSentence", () => {
  it("leads with solved-with-confidence when nothing is mastered yet", () => {
    expect(stageSentence({ mastered: 0, holding: 2, learning: 1, fading: 0 }, 3)).toBe(
      "You've solved 2 of 3 problems with confidence. 1 is still shaky.",
    );
  });
  it("stops after the lead when there is nothing else to say", () => {
    expect(stageSentence({ mastered: 1, holding: 0, learning: 0, fading: 0 }, 1)).toBe(
      "You've mastered 1 of 1 problem.",
    );
  });
});

describe("buildTopicStats", () => {
  it("rates attempts per topic and ignores attempts on untracked problems", () => {
    const arrays = problem();
    const heap = problem({
      problem: {
        title: "Heap one",
        slug: "heap-one",
        difficulty: "medium",
        leetcodeId: null,
        topics: ["Heap / Priority Queue"],
      },
    });
    const stats = buildTopicStats(
      [arrays, heap],
      [
        attempt(arrays.problemId, 3, "solved_independently"),
        attempt(arrays.problemId, 2, "needed_solution"),
        attempt(heap.problemId, 1, "could_not_solve"),
        attempt("untracked", 1, "could_not_solve"),
      ],
    );
    expect(stats.get("Arrays & Hashing")).toEqual({ attempts: 2, unaidedRate: 0.5, failedRate: 0.5 });
    expect(stats.get("Heap / Priority Queue")).toEqual({ attempts: 1, unaidedRate: 0, failedRate: 1 });
    expect(stats.size).toBe(2);
  });
});

describe("topicStruggleSentence", () => {
  it("waits for data", () => {
    expect(topicStruggleSentence(undefined, undefined)).toMatch(/shows up once/);
    expect(topicStruggleSentence({ topic: "Trees", avgConfidence: null, fading: 0 }, undefined)).toMatch(
      /shows up once/,
    );
  });
  it("names confidence, failures and fading", () => {
    expect(
      topicStruggleSentence(
        { topic: "Graphs", avgConfidence: 2, fading: 1 },
        { attempts: 4, unaidedRate: 0, failedRate: 0.5 },
      ),
    ).toBe(
      "Graphs needs the most work: average confidence 2.0 out of 5, you needed the solution or got stuck on 2 of 4 attempts, 1 problem fading.",
    );
  });
  it("leaves out clauses with nothing to report", () => {
    expect(
      topicStruggleSentence(
        { topic: "Stack", avgConfidence: 3.5, fading: 0 },
        { attempts: 2, unaidedRate: 1, failedRate: 0 },
      ),
    ).toBe("Stack needs the most work: average confidence 3.5 out of 5.");
  });
});

describe("buildStuckProblems, single attempts and limits", () => {
  it("explains a single failed attempt", () => {
    const couldNot = problem({ bestConfidence: 1 });
    const neededSolution = problem({ bestConfidence: 2 });
    const out = buildStuckProblems(
      [couldNot, neededSolution],
      [
        attempt(couldNot.problemId, 1, "could_not_solve", 1),
        attempt(neededSolution.problemId, 1, "needed_solution", 2),
      ],
    );
    expect(Object.fromEntries(out.map((p) => [p.id, p.reason]))).toEqual({
      [couldNot.id]: "Couldn't solve it last time",
      [neededSolution.id]: "Needed the solution last time",
    });
  });
  it("falls back to the best attempt when bestConfidence is missing", () => {
    const p = problem({ bestConfidence: null });
    const out = buildStuckProblems(
      [p],
      [attempt(p.problemId, 3, "solved_with_hint", 2), attempt(p.problemId, 1, "solved_with_hint", 1)],
    );
    expect(out[0].reason).toBe("Best confidence is 2 after 2 tries");
  });
  it("keeps only the worst few, breaking ties by title", () => {
    const ps = Array.from({ length: 7 }, () => problem({ bestConfidence: 1 }));
    const out = buildStuckProblems(
      ps,
      ps.map((p) => attempt(p.problemId, 1, "could_not_solve", 1)),
      5,
    );
    expect(out).toHaveLength(5);
    const titles = out.map((p) => p.title);
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
  });
});
