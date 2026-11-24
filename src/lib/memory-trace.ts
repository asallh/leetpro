import { estimateRecall } from "@/lib/recall";

const DAY_MS = 86_400_000;
const SAMPLES_PER_SEGMENT = 48;
/** Attempts closer than this share one mark on the chart (fraction of the axis). */
export const CLUSTER_GAP = 0.03;

export type TraceAttemptInput = {
  date: Date;
  /** The review interval in days before this attempt was logged (the API stores it). */
  prevInterval: number | null;
};

export type TracePoint = { t: number; r: number };

export type Trace<A extends TraceAttemptInput> = {
  /** Axis start and end, in epoch ms. */
  start: number;
  end: number;
  /** Recall up to now: one run of points per attempt, each starting back at 100%. */
  past: TracePoint[][];
  /** Projected recall from now to the end of the axis; empty when the axis ends at now. */
  future: TracePoint[];
  /** Attempts grouped so marks closer than CLUSTER_GAP of the axis share one. */
  clusters: A[][];
};

/**
 * The data behind a problem's memory chart. Each attempt resets recall to 100%,
 * then it decays on estimateRecall's curve for the interval the scheduler set after
 * that attempt: the next attempt's prevInterval, or the problem's current interval
 * for the latest one.
 */
export function buildTrace<A extends TraceAttemptInput>({
  attempts,
  currentInterval,
  nextReviewDate,
  now,
}: {
  /** Oldest first; must not be empty. */
  attempts: A[];
  currentInterval: number;
  nextReviewDate: Date | null;
  now: Date;
}): Trace<A> {
  const nowMs = now.getTime();
  const start = new Date(attempts[0].date).getTime();
  const last = new Date(attempts[attempts.length - 1].date).getTime();
  const due = nextReviewDate ? new Date(nextReviewDate).getTime() : 0;
  const rawEnd = Math.max(nowMs, due, last + DAY_MS);
  // A little room after the last thing on the axis so its label is not on the edge.
  const end = rawEnd + Math.max(DAY_MS / 2, (rawEnd - start) * 0.04);

  const past: TracePoint[][] = [];
  let future: TracePoint[] = [];
  attempts.forEach((a, i) => {
    const isLast = i === attempts.length - 1;
    const t0 = new Date(a.date).getTime();
    const t1 = isLast ? end : new Date(attempts[i + 1].date).getTime();
    const interval = isLast ? currentInterval : (attempts[i + 1].prevInterval ?? 1);
    const at = (t: number): TracePoint => ({ t, r: estimateRecall(new Date(t0), interval, new Date(t)) ?? 1 });
    const sample = (from: number, to: number) =>
      Array.from({ length: SAMPLES_PER_SEGMENT + 1 }, (_, s) => at(from + ((to - from) * s) / SAMPLES_PER_SEGMENT));

    // Never sample backwards, even if an attempt is dated after now (clock skew, seeded data).
    const pastEnd = Math.max(t0, isLast ? Math.min(t1, nowMs) : t1);
    past.push(sample(t0, pastEnd));
    if (isLast && t1 > nowMs) future = sample(Math.max(t0, nowMs), t1);
  });

  const span = end - start;
  const clusters: A[][] = [];
  for (const a of attempts) {
    const group = clusters[clusters.length - 1];
    const t = new Date(a.date).getTime();
    if (group && (t - new Date(group[0].date).getTime()) / span < CLUSTER_GAP) group.push(a);
    else clusters.push([a]);
  }

  return { start, end, past, future, clusters };
}
