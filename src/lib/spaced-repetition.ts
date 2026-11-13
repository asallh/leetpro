import { addDays } from "date-fns";

type ProblemStatus = "new_problem" | "learning" | "review" | "mastered";

interface ReviewInput {
  confidence: number;
  currentInterval: number;
  currentStatus: ProblemStatus;
  /** Date the interval counts from. Defaults to now. */
  from?: Date;
}

interface ReviewResult {
  nextReviewDate: Date;
  newInterval: number;
  newStatus: ProblemStatus;
}

const BASE_INTERVALS: Record<number, number> = {
  1: 1,
  2: 1,
  3: 3,
  4: 7,
  5: 14,
};

const MAX_INTERVAL = 180;

export function calculateNextReview(input: ReviewInput): ReviewResult {
  const { confidence, currentInterval, currentStatus } = input;
  const now = input.from ?? new Date();

  let newInterval = BASE_INTERVALS[confidence] ?? 1;

  if (confidence >= 4 && currentInterval > 0) {
    newInterval = Math.min(currentInterval * 2, MAX_INTERVAL);
  }

  if (confidence <= 2) {
    newInterval = 1;
  }

  let newStatus: ProblemStatus;
  if (confidence <= 2) {
    newStatus = "learning";
  } else if (confidence === 3) {
    newStatus = "review";
  } else if (currentStatus === "review" && confidence >= 4 && currentInterval >= 14) {
    newStatus = "mastered";
  } else {
    newStatus = "review";
  }

  return {
    nextReviewDate: addDays(now, newInterval),
    newInterval,
    newStatus,
  };
}
