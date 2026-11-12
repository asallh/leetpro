/**
 * Estimated recall for a tracked problem, from a simple exponential forgetting
 * curve: R(t) = exp(-t / S). S is chosen so recall reaches DUE_RECALL on the
 * scheduled review date (t = reviewInterval days). This is a display estimate,
 * not part of the scheduler in spaced-repetition.ts.
 */
export const DUE_RECALL = 0.7;

const DAY_MS = 86_400_000;

export function estimateRecall(
  lastAttemptDate: Date | null | undefined,
  reviewIntervalDays: number,
  now: Date = new Date()
): number | null {
  if (!lastAttemptDate) return null;
  const elapsedDays = Math.max(0, (now.getTime() - new Date(lastAttemptDate).getTime()) / DAY_MS);
  const interval = Math.max(1, reviewIntervalDays);
  const stability = interval / Math.log(1 / DUE_RECALL);
  return Math.exp(-elapsedDays / stability);
}

export function isFading(recall: number | null): boolean {
  return recall !== null && recall < DUE_RECALL;
}
