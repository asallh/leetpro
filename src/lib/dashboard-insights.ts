import { addDays, differenceInCalendarDays, startOfDay } from "date-fns";
import { CATALOG, roadmapTopic } from "@/lib/data/catalog";
import { BLIND_75, GRIND_75, NEETCODE_150_IDS } from "@/lib/data/problem-lists";
import { TOPICS } from "@/lib/data/topics";
import { estimateRecall, isFading } from "@/lib/recall";

/** Same rule as the Lists page: a problem counts as solved at best confidence 3+. */
export const SOLVED_CONFIDENCE = 3;

type ProblemRef = { leetcodeId: number | null; topics: string[]; title: string };

export type TrackedLike = {
  id: string;
  problemId: string;
  bestConfidence: number | null;
  lastAttemptDate: Date | null;
  nextReviewDate: Date | null;
  reviewInterval: number;
  problem: ProblemRef & { difficulty: "easy" | "medium" | "hard"; url: string };
};

export type AttemptLite = { problemId: string; date: Date; confidence: number };

/** Grind 75 uses its own category names; fold them into the NeetCode roadmap topics. */
const TOPIC_ALIASES: Record<string, string> = {
  Array: "Arrays & Hashing",
  "Hash Table": "Arrays & Hashing",
  String: "Arrays & Hashing",
  "Binary Tree": "Trees",
  "Binary Search Tree": "Trees",
  Graph: "Graphs",
  Heap: "Heap / Priority Queue",
  Trie: "Tries",
  "Dynamic Programming": "1-D Dynamic Programming",
  Binary: "Bit Manipulation",
  Matrix: "Math & Geometry",
  Recursion: "Backtracking",
  Queue: "Stack",
};

const LIST_NAMES = new Set(["NeetCode 150", "Blind 75", "Grind 75"]);
const TOPIC_BY_TITLE = new Map(CATALOG.map((p) => [p.title.toLowerCase(), p.topics[0]]));

export function topicOf(problem: { leetcodeId: number | null; topics: string[]; title?: string }): string {
  let raw = roadmapTopic(problem);
  // Problems logged without a LeetCode number can carry a list name as their first tag.
  if (LIST_NAMES.has(raw) || raw === "Uncategorized") {
    raw =
      (problem.title ? TOPIC_BY_TITLE.get(problem.title.toLowerCase()) : undefined) ??
      problem.topics.find((t) => !LIST_NAMES.has(t)) ??
      "Uncategorized";
  }
  return TOPIC_ALIASES[raw] ?? raw;
}

function avg(nums: number[]): number | null {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

/* ---------------------------------------------------------------- Progress */

export type ListProgress = {
  name: string;
  total: number;
  solved: number;
  attempted: number;
  /** Projected finish at the recent pace; null when there is no pace yet or it's done. */
  finishDate: Date | null;
};

export function buildProgress(tracked: TrackedLike[], attempts: AttemptLite[], now: Date) {
  const solvedIds = new Set<number>();
  const attemptedIds = new Set<number>();
  let solved = 0;
  const byDifficulty = { easy: 0, medium: 0, hard: 0 };
  for (const t of tracked) {
    if (t.problem.leetcodeId != null) attemptedIds.add(t.problem.leetcodeId);
    if ((t.bestConfidence ?? 0) >= SOLVED_CONFIDENCE) {
      solved++;
      byDifficulty[t.problem.difficulty]++;
      if (t.problem.leetcodeId != null) solvedIds.add(t.problem.leetcodeId);
    }
  }

  // Pace: distinct problems first attempted in the last 28 days, per week.
  const firstSeen = new Map<string, number>();
  for (const a of attempts) {
    const t = new Date(a.date).getTime();
    const prev = firstSeen.get(a.problemId);
    if (prev == null || t < prev) firstSeen.set(a.problemId, t);
  }
  const since = now.getTime() - 28 * 86_400_000;
  const newLast28 = [...firstSeen.values()].filter((t) => t >= since).length;
  const daysActive = Math.min(28, Math.max(7, (now.getTime() - Math.min(...firstSeen.values(), now.getTime())) / 86_400_000));
  const perWeek = firstSeen.size ? (newLast28 / daysActive) * 7 : 0;

  const lists: ListProgress[] = [
    { name: "Blind 75", ids: BLIND_75.map((p) => p.leetcodeId) },
    { name: "Grind 75", ids: GRIND_75.map((p) => p.leetcodeId) },
    { name: "NeetCode 150", ids: NEETCODE_150_IDS },
  ].map(({ name, ids }) => {
    const s = ids.filter((id) => solvedIds.has(id)).length;
    const remaining = ids.length - s;
    return {
      name,
      total: ids.length,
      solved: s,
      attempted: ids.filter((id) => attemptedIds.has(id)).length,
      finishDate:
        remaining > 0 && perWeek > 0 ? addDays(startOfDay(now), Math.ceil((remaining / perWeek) * 7)) : null,
    };
  });

  return { solved, attempted: tracked.length, byDifficulty, perWeek, lists };
}

/* ------------------------------------------------------------------ Topics */

export type TopicCell = {
  title: string;
  state: "fading" | "solved" | "attempted" | "untouched";
};

export type TopicRow = {
  topic: string;
  cells: TopicCell[];
  /** Tracked problems in this topic outside the curated catalog. */
  extra: number;
  attempted: number;
  solved: number;
  fading: number;
  avgConfidence: number | null;
  verdict: "Review" | "Shaky" | "Solid" | "Building" | "Not started";
};

/**
 * One row per roadmap topic: a cell per curated problem coloured by your state
 * on it, average confidence across your attempts, and a one-word verdict.
 */
export function buildTopicMap(tracked: TrackedLike[], attempts: AttemptLite[], now: Date): TopicRow[] {
  const byLc = new Map<number, TrackedLike>();
  const byProblemId = new Map<string, TrackedLike>();
  for (const t of tracked) {
    if (t.problem.leetcodeId != null) byLc.set(t.problem.leetcodeId, t);
    byProblemId.set(t.problemId, t);
  }
  const confByTopic = new Map<string, number[]>();
  for (const a of attempts) {
    const t = byProblemId.get(a.problemId);
    if (!t) continue;
    const topic = topicOf(t.problem);
    confByTopic.set(topic, [...(confByTopic.get(topic) ?? []), a.confidence]);
  }

  const stateOf = (t: TrackedLike | undefined): TopicCell["state"] => {
    if (!t) return "untouched";
    if (isFading(estimateRecall(t.lastAttemptDate, t.reviewInterval, now))) return "fading";
    return (t.bestConfidence ?? 0) >= SOLVED_CONFIDENCE ? "solved" : "attempted";
  };

  const catalogIds = new Set(CATALOG.map((p) => p.leetcodeId));
  return TOPICS.map((topic) => {
    const cells: TopicCell[] = CATALOG.filter((p) => (TOPIC_ALIASES[p.topics[0]] ?? p.topics[0]) === topic).map((p) => ({
      title: p.title,
      state: stateOf(byLc.get(p.leetcodeId)),
    }));
    const extras = tracked.filter(
      (t) => topicOf(t.problem) === topic && (t.problem.leetcodeId == null || !catalogIds.has(t.problem.leetcodeId))
    );
    for (const t of extras) cells.push({ title: t.problem.title, state: stateOf(t) });
    const attempted = cells.filter((c) => c.state !== "untouched").length;
    const solved = cells.filter((c) => c.state === "solved").length;
    const fading = cells.filter((c) => c.state === "fading").length;
    const avgConfidence = avg(confByTopic.get(topic) ?? []);
    const verdict: TopicRow["verdict"] =
      attempted === 0
        ? "Not started"
        : fading > 0
          ? "Review"
          : avgConfidence != null && avgConfidence < 3
            ? "Shaky"
            : avgConfidence != null && avgConfidence >= 4 && solved >= 2
              ? "Solid"
              : "Building";
    return { topic, cells, extra: extras.length, attempted, solved, fading, avgConfidence, verdict };
  });
}

/* ------------------------------------------------------------------ Memory */

export type DueItem = {
  id: string;
  title: string;
  url: string;
  recall: number | null;
  daysUntilDue: number;
  fading: boolean;
};

export function buildMemory(tracked: TrackedLike[], now: Date) {
  const today = startOfDay(now);
  const items: DueItem[] = tracked
    .filter((t) => t.nextReviewDate && t.lastAttemptDate)
    .map((t) => {
      const recall = estimateRecall(t.lastAttemptDate, t.reviewInterval, now);
      return {
        id: t.id,
        title: t.problem.title,
        url: t.problem.url,
        recall,
        daysUntilDue: differenceInCalendarDays(new Date(t.nextReviewDate!), today),
        fading: isFading(recall),
      };
    })
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue || (a.recall ?? 1) - (b.recall ?? 1));

  const recalls = items.map((i) => i.recall).filter((r): r is number => r != null);
  return {
    items,
    fading: items.filter((i) => i.fading).length,
    dueThisWeek: items.filter((i) => !i.fading && i.daysUntilDue <= 7).length,
    averageRecall: avg(recalls),
  };
}

export function dueLabel(i: Pick<DueItem, "daysUntilDue" | "fading">): string {
  if (i.fading || i.daysUntilDue < 0) return "Review now";
  if (i.daysUntilDue === 0) return "Due today";
  if (i.daysUntilDue === 1) return "Due tomorrow";
  return `Due in ${i.daysUntilDue} days`;
}
