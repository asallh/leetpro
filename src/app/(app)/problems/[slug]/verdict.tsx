"use client";

import { useIsClient } from "@/components/local-date";
import { buildVerdict, type VerdictInput } from "@/lib/problem-verdict";
import { estimateRecall } from "@/lib/recall";

/**
 * The status sentence, worked out in the viewer's timezone so "later today" and
 * "tomorrow" match their own calendar. Until hydration it shows only the recall
 * clause from the server, which is the same in every timezone.
 */
export function ProblemVerdict({
  problem,
  serverRecall,
  lastAttemptDate,
  reviewInterval,
}: {
  problem: VerdictInput;
  serverRecall: number | null;
  lastAttemptDate: Date | null;
  reviewInterval: number;
}) {
  const isClient = useIsClient();
  if (!isClient) {
    return <>{buildVerdict(problem && { ...problem, nextReviewDate: null }, serverRecall, new Date(0))}</>;
  }
  const now = new Date();
  return <>{buildVerdict(problem, estimateRecall(lastAttemptDate, reviewInterval, now), now)}</>;
}
