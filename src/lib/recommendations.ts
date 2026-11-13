import { addHours } from "date-fns";
import { CATALOG, roadmapTopic } from "@/lib/data/catalog";
import { TOPICS } from "@/lib/data/topics";
import { DUE_RECALL, estimateRecall } from "@/lib/recall";
import {
  buildTopicPerformance,
  type AttemptLike,
  type UserProblemLike,
} from "@/lib/dashboard-metrics";

/**
 * Decides the single next thing to practice.
 *
 * 1. Standing. A tracked problem is due once its estimated recall falls below
 *    DUE_RECALL (its scheduled review date). The mode follows from what's due:
 *    - start:           nothing tracked yet → first problem on the roadmap
 *    - new:             nothing due → good standing, start a new problem
 *    - review_then_new: a small, recoverable backlog → clear it, then one new
 *    - review:          a big backlog, or something nearly forgotten → review only
 * 2. Reviews are ranked by how far recall has dropped, with a boost for problems
 *    still in `learning` and for problems in a weak topic.
 * 3. New problems come from untracked catalog problems. Weak topics come first,
 *    then the NeetCode roadmap order. Difficulty steps up once you've solved
 *    enough at the level below with confidence 4+.
 *
 * Topics are roadmap categories (see roadmapTopic), not LeetCode's own tags.
 */

export type RecommendationMode = "start" | "new" | "review_then_new" | "review";

export type CandidateProblem = {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  url: string;
  leetcodeId: number | null;
  topics: string[];
  lists: string[];
};

export type ReviewPick = {
  userProblemId: string;
  problem: UserProblemLike["problem"];
  recall: number;
  overdueDays: number;
  score: number;
  reasons: string[];
};

export type NewPick = {
  problem: CandidateProblem;
  topic: string;
  reason: string;
};

export type Recommendation = {
  mode: RecommendationMode;
  headline: string;
  detail: string;
  reviews: ReviewPick[];
  /** Due problems beyond the ones in `reviews`. */
  reviewsRemaining: number;
  newProblems: NewPick[];
  standing: {
    dueCount: number;
    dueSoonCount: number;
    learningCount: number;
    lowestRecall: number | null;
  };
};

/** Reviews shown as the next session. */
export const REVIEW_BATCH = 3;
/** More due than this and new problems wait. */
export const BACKLOG_LIMIT = 4;
/** Any due problem below this recall and new problems wait. */
export const CRITICAL_RECALL = 0.5;
/** Average confidence below this marks a topic weak. */
export const WEAK_TOPIC_CONFIDENCE = 3;
/** Problems solved at confidence 4+ needed before stepping up a difficulty. */
const STEP_UP_AFTER = { easy: 2, medium: 3 } as const;
const NEW_PICKS = 3;
const DAY_MS = 86_400_000;

const DIFFICULTY_RANK = { easy: 0, medium: 1, hard: 2 } as const;
const RANK_DIFFICULTY = ["easy", "medium", "hard"] as const;
type Difficulty = (typeof RANK_DIFFICULTY)[number];

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function weakTopicMap(attempts: AttemptLike[]) {
  const map = new Map<string, number>();
  const normalized = attempts.map((a) => ({
    ...a,
    problem: { ...a.problem, topics: [roadmapTopic(a.problem)] },
  }));
  for (const t of buildTopicPerformance(normalized, Infinity)) {
    if (t.avgConfidence < WEAK_TOPIC_CONFIDENCE) map.set(t.topic, t.avgConfidence);
  }
  return map;
}

export function rankReviews(
  userProblems: UserProblemLike[],
  weakTopics: Map<string, number>,
  now: Date
): ReviewPick[] {
  const picks: ReviewPick[] = [];

  for (const up of userProblems) {
    if (up.status === "mastered" || !up.nextReviewDate || up.nextReviewDate > now) continue;
    const recall = estimateRecall(up.lastAttemptDate, up.reviewInterval, now) ?? 0;
    const overdueDays = Math.max(
      0,
      Math.floor((now.getTime() - up.nextReviewDate.getTime()) / DAY_MS)
    );
    const topic = roadmapTopic(up.problem);
    const weak = weakTopics.has(topic) ? topic : null;

    let score = DUE_RECALL - recall;
    const reasons = [`recall ${Math.round(recall * 100)}%`];
    if (overdueDays > 0) reasons.push(`${plural(overdueDays, "day")} overdue`);
    if (up.status === "learning") {
      score += 0.15;
      reasons.push("still learning");
    }
    if (weak) {
      score += 0.1;
      reasons.push(`weak topic: ${weak}`);
    }

    picks.push({
      userProblemId: up.id,
      problem: up.problem,
      recall,
      overdueDays,
      score,
      reasons,
    });
  }

  return picks.sort((a, b) => b.score - a.score || a.recall - b.recall);
}

function topicOrder(topic: string) {
  const i = (TOPICS as readonly string[]).indexOf(topic);
  return i === -1 ? TOPICS.length : i;
}

function targetDifficulty(solid: Record<Difficulty, number>, weak: boolean): Difficulty {
  if (solid.easy < STEP_UP_AFTER.easy) return "easy";
  if (weak || solid.medium < STEP_UP_AFTER.medium) return "medium";
  return "hard";
}

export function pickNewProblems(
  candidates: CandidateProblem[],
  userProblems: UserProblemLike[],
  weakTopics: Map<string, number>,
  limit = NEW_PICKS
): NewPick[] {
  const trackedIds = new Set(
    userProblems.map((up) => up.problem.leetcodeId).filter((id) => id != null)
  );
  const trackedTitles = new Set(userProblems.map((up) => up.problem.title.toLowerCase()));

  // Solved at confidence 4+, per topic and difficulty.
  const solid = new Map<string, Record<Difficulty, number>>();
  for (const up of userProblems) {
    if ((up.bestConfidence ?? 0) < 4) continue;
    const topic = roadmapTopic(up.problem);
    const row = solid.get(topic) ?? { easy: 0, medium: 0, hard: 0 };
    row[up.problem.difficulty]++;
    solid.set(topic, row);
  }

  const byTopic = new Map<string, CandidateProblem[]>();
  for (const c of candidates) {
    if (c.leetcodeId != null && trackedIds.has(c.leetcodeId)) continue;
    if (trackedTitles.has(c.title.toLowerCase())) continue;
    const topic = c.topics[0];
    // Seed placeholders ("LeetCode 123", topic Unknown) aren't worth suggesting.
    if (!topic || topic === "Unknown") continue;
    const list = byTopic.get(topic) ?? [];
    list.push(c);
    byTopic.set(topic, list);
  }

  const topics = Array.from(byTopic.keys()).sort((a, b) => {
    const wa = weakTopics.get(a);
    const wb = weakTopics.get(b);
    if (wa != null && wb != null) return wa - wb;
    if (wa != null) return -1;
    if (wb != null) return 1;
    return topicOrder(a) - topicOrder(b) || a.localeCompare(b);
  });

  const picks: NewPick[] = [];
  for (const topic of topics) {
    if (picks.length >= limit) break;
    const weakConf = weakTopics.get(topic);
    const counts = solid.get(topic) ?? { easy: 0, medium: 0, hard: 0 };
    const target = targetDifficulty(counts, weakConf != null);
    const best = byTopic
      .get(topic)!
      .slice()
      .sort(
        (a, b) =>
          Math.abs(DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[target]) -
            Math.abs(DIFFICULTY_RANK[b.difficulty] - DIFFICULTY_RANK[target]) ||
          DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty] ||
          b.lists.length - a.lists.length ||
          (a.leetcodeId ?? Infinity) - (b.leetcodeId ?? Infinity)
      )[0];

    let reason: string;
    if (weakConf != null) {
      reason = `Weak topic (avg confidence ${weakConf.toFixed(1)}). A fresh ${best.difficulty} rebuilds the pattern.`;
    } else if (counts.easy + counts.medium + counts.hard === 0) {
      reason = `Next on the roadmap: ${topic}.`;
    } else if (best.difficulty !== "easy" && best.difficulty === target) {
      const below = RANK_DIFFICULTY[DIFFICULTY_RANK[target] - 1];
      reason = `${counts[below]} ${below} solved at confidence 4+ in ${topic}. Step up to ${target}.`;
    } else {
      reason = `Keep building ${topic}.`;
    }

    picks.push({ problem: best, topic, reason });
  }

  return picks;
}

export function recommendNextAction({
  userProblems,
  attempts,
  candidates = CATALOG,
  now = new Date(),
}: {
  userProblems: UserProblemLike[];
  attempts: AttemptLike[];
  /** Problems that can be suggested as new. Defaults to the curated lists. */
  candidates?: CandidateProblem[];
  now?: Date;
}): Recommendation {
  const weakTopics = weakTopicMap(attempts);
  const due = rankReviews(userProblems, weakTopics, now);
  const soon = addHours(now, 24);
  const dueSoonCount = userProblems.filter(
    (up) =>
      up.status !== "mastered" &&
      up.nextReviewDate != null &&
      up.nextReviewDate > now &&
      up.nextReviewDate <= soon
  ).length;
  const learningCount = userProblems.filter((up) => up.status === "learning").length;
  const lowestRecall = due.length ? Math.min(...due.map((d) => d.recall)) : null;
  const standing = { dueCount: due.length, dueSoonCount, learningCount, lowestRecall };
  const reviews = due.slice(0, REVIEW_BATCH);
  const reviewsRemaining = due.length - reviews.length;
  const attempted = userProblems.some((up) => up.lastAttemptDate != null);

  if (!attempted) {
    return {
      mode: "start",
      headline: "Start your first problem",
      detail:
        "Nothing is tracked yet. Solve this with the extension installed and LeetPro schedules the first review for you.",
      reviews: [],
      reviewsRemaining: 0,
      newProblems: pickNewProblems(candidates, userProblems, weakTopics),
      standing,
    };
  }

  if (due.length === 0) {
    return {
      mode: "new",
      headline: "Good standing. Start something new",
      detail:
        dueSoonCount > 0
          ? `Nothing is fading. ${plural(dueSoonCount, "review")} come${dueSoonCount === 1 ? "s" : ""} due in the next 24 hours, so a new problem now fits before then.`
          : "Nothing is fading, so reviewing now would be early. Spend the session on a new problem.",
      reviews: [],
      reviewsRemaining: 0,
      newProblems: pickNewProblems(candidates, userProblems, weakTopics),
      standing,
    };
  }

  const critical = lowestRecall != null && lowestRecall < CRITICAL_RECALL;
  if (due.length > BACKLOG_LIMIT || critical) {
    return {
      mode: "review",
      headline: `Review ${plural(due.length, "fading problem")} first`,
      detail: critical
        ? `One is down to ${Math.round(lowestRecall! * 100)}% recall. Hold off on new problems until the queue is clear.`
        : `More than ${BACKLOG_LIMIT} problems are fading. Hold off on new problems until the queue is clear.`,
      reviews,
      reviewsRemaining,
      newProblems: [],
      standing,
    };
  }

  return {
    mode: "review_then_new",
    headline: `Review ${due.length}, then start a new one`,
    detail:
      "The backlog is small and still recoverable. Clear it, then use the rest of the session on a new problem.",
    reviews,
    reviewsRemaining,
    newProblems: pickNewProblems(candidates, userProblems, weakTopics, 1),
    standing,
  };
}
