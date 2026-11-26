import type { ProblemStatus } from "@/generated/prisma/enums";
import { calculateNextReview } from "./spaced-repetition";

export interface ReplayInput {
  id: string;
  date: Date;
  createdAt: Date;
  confidence: number;
}

export interface ReplayedAttempt {
  id: string;
  attemptNumber: number;
  prevInterval: number;
  prevStatus: ProblemStatus;
}

export interface ReplayedProblem {
  status: ProblemStatus;
  reviewInterval: number;
  nextReviewDate: Date;
  totalAttempts: number;
  lastAttemptDate: Date;
  bestConfidence: number;
}

/**
 * Rebuilds a problem's schedule from the attempts left on it, oldest first,
 * as if only those had ever been logged. Used after an attempt is removed so
 * a duplicate or mistaken attempt leaves no trace in the review schedule,
 * the attempt numbers or the per-attempt "schedule before" snapshots.
 * Returns `problem: null` when no attempts remain.
 */
export function replayAttempts(attempts: ReplayInput[]): {
  attempts: ReplayedAttempt[];
  problem: ReplayedProblem | null;
} {
  const ordered = [...attempts].sort(
    // A double submit can tie on both timestamps; id keeps the order stable.
    (a, b) =>
      a.date.getTime() - b.date.getTime() ||
      a.createdAt.getTime() - b.createdAt.getTime() ||
      a.id.localeCompare(b.id),
  );

  let interval = 0;
  let status: ProblemStatus = "new_problem";
  let nextReviewDate: Date | null = null;
  let bestConfidence = 0;
  const replayed: ReplayedAttempt[] = [];

  ordered.forEach((a, i) => {
    replayed.push({ id: a.id, attemptNumber: i + 1, prevInterval: interval, prevStatus: status });
    const review = calculateNextReview({
      confidence: a.confidence,
      currentInterval: interval,
      currentStatus: status,
      from: a.date,
    });
    interval = review.newInterval;
    status = review.newStatus;
    nextReviewDate = review.nextReviewDate;
    bestConfidence = Math.max(bestConfidence, a.confidence);
  });

  const last = ordered.at(-1);
  return {
    attempts: replayed,
    problem:
      last && nextReviewDate
        ? {
            status,
            reviewInterval: interval,
            nextReviewDate,
            totalAttempts: ordered.length,
            lastAttemptDate: last.date,
            bestConfidence,
          }
        : null,
  };
}
