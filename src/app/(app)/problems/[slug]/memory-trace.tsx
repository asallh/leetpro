import { LocalDate } from "@/components/local-date";
import type { AttemptResult } from "@/generated/prisma/enums";
import { buildTrace, type TracePoint } from "@/lib/memory-trace";
import { DUE_RECALL } from "@/lib/recall";
import { cn } from "@/lib/utils";

const W = 1000;
const H = 100;

type TraceAttempt = {
  id: string;
  date: Date;
  attemptNumber: number;
  result: AttemptResult;
  prevInterval: number | null;
};

/**
 * This problem's memory over time: each attempt resets estimated recall to 100%,
 * then it decays on the same curve as estimateRecall until the next attempt. The
 * stretch below the 70% review line is drawn in the highlighter colour.
 *
 * Paths are drawn in a stretched SVG; dots and labels are HTML placed by percent so
 * they keep their shape and size at any width.
 */
export function MemoryTrace({
  attempts,
  currentInterval,
  nextReviewDate,
  now,
}: {
  /** Oldest first. */
  attempts: TraceAttempt[];
  currentInterval: number;
  nextReviewDate: Date | null;
  now: Date;
}) {
  if (attempts.length === 0) return null;

  const { start, end, past, future, clusters } = buildTrace({ attempts, currentInterval, nextReviewDate, now });
  const due = nextReviewDate ? new Date(nextReviewDate).getTime() : null;
  const span = end - start;

  const x = (t: number) => ((t - start) / span) * W;
  const y = (r: number) => (1 - r) * H;
  const pct = (t: number) => `${((t - start) / span) * 100}%`;
  const pt = (p: TracePoint) => `${x(p.t).toFixed(1)},${y(p.r).toFixed(2)}`;

  // Each run after the first starts with the jump back up to 100% at its attempt.
  const pastPath = past.map((run, i) => `${i === 0 ? "M" : "L"}${run.map(pt).join(" L")}`).join(" ");
  const futurePath = future.length > 0 ? `M${future.map(pt).join(" L")}` : "";

  const lineY = y(DUE_RECALL);
  const todayFrac = (now.getTime() - start) / span;
  const dueFrac = due != null ? (due - start) / span : null;
  const dueOverdue = due != null && due <= now.getTime();
  const showDueLabel = dueFrac != null && !dueOverdue && Math.abs(dueFrac - todayFrac) > 0.14;

  const summary = `Estimated recall over ${attempts.length} ${attempts.length === 1 ? "attempt" : "attempts"} since ${new Date(start).toISOString().slice(0, 10)}. Each attempt resets it to 100%, and a review comes due when it falls to ${Math.round(DUE_RECALL * 100)}%.`;

  return (
    <figure className="m-0">
      <div className="relative ml-12 mr-2 h-44 sm:h-52" role="img" aria-label={summary}>
        {/* y-axis labels */}
        <span className="num absolute top-0 -left-12 -translate-y-1/2 text-sm text-muted-foreground">100%</span>
        <span
          className="num absolute -left-12 -translate-y-1/2 text-sm font-medium text-highlight"
          style={{ top: `${lineY}%` }}
        >
          {Math.round(DUE_RECALL * 100)}%
        </span>
        <span className="num absolute bottom-0 -left-12 translate-y-1/2 text-sm text-muted-foreground">0%</span>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
          aria-hidden="true"
        >
          <defs>
            <clipPath id="trace-above">
              <rect x="0" y="-10" width={W} height={lineY + 10} />
            </clipPath>
            <clipPath id="trace-below">
              <rect x="0" y={lineY} width={W} height={H - lineY + 10} />
            </clipPath>
          </defs>
          <line x1="0" x2={W} y1="0" y2="0" className="stroke-border" vectorEffect="non-scaling-stroke" />
          <line x1="0" x2={W} y1={H} y2={H} className="stroke-border" vectorEffect="non-scaling-stroke" />
          {/* the review line */}
          <rect x="0" y={lineY} width={W} height={H - lineY} className="fill-highlight/[0.03]" />
          <line
            x1="0"
            x2={W}
            y1={lineY}
            y2={lineY}
            className="stroke-highlight/60"
            strokeDasharray="2 4"
            vectorEffect="non-scaling-stroke"
          />
          {/* today */}
          <line
            x1={todayFrac * W}
            x2={todayFrac * W}
            y1="0"
            y2={H}
            className="stroke-muted-foreground/50"
            vectorEffect="non-scaling-stroke"
          />
          {[
            { clip: "trace-above", cls: "stroke-foreground" },
            { clip: "trace-below", cls: "stroke-highlight" },
          ].map(({ clip, cls }) => (
            <g key={clip} clipPath={`url(#${clip})`} fill="none" strokeLinejoin="round" strokeLinecap="round">
              <path d={pastPath} className={cls} strokeWidth="2.25" vectorEffect="non-scaling-stroke" />
              {futurePath && (
                <path
                  d={futurePath}
                  className={cls}
                  strokeWidth="2"
                  strokeDasharray="1 6"
                  opacity="0.7"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </g>
          ))}
        </svg>

        {/* attempt marks, coloured by how the latest attempt in each mark went (the list
            below says it in words); attempts too close to tell apart share one mark */}
        {clusters.map((c) => {
          const a = c[c.length - 1];
          return (
            <span
              key={a.id}
              aria-hidden="true"
              className={cn(
                "absolute top-0 grid h-6 min-w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-card px-1 text-xs font-bold leading-none",
                a.result === "solved_independently"
                  ? "bg-remembered text-background"
                  : a.result === "could_not_solve"
                    ? "bg-destructive text-background"
                    : "bg-foreground text-background"
              )}
              style={{ left: pct(new Date(a.date).getTime()) }}
            >
              <span className="num">
                {c.length === 1 ? a.attemptNumber : `${c[0].attemptNumber}–${a.attemptNumber}`}
              </span>
            </span>
          );
        })}

        {/* today and next review */}
        <span
          className="absolute -bottom-7 -translate-x-1/2 text-sm font-medium whitespace-nowrap"
          style={{ left: `${todayFrac * 100}%` }}
        >
          Today
        </span>
        {showDueLabel && dueFrac != null && (
          <>
            <span
              aria-hidden="true"
              className="absolute h-2 w-px -translate-x-1/2 bg-highlight"
              style={{ left: `${dueFrac * 100}%`, top: `calc(${lineY}% - 4px)` }}
            />
            <span
              className="absolute -bottom-7 -translate-x-1/2 text-sm whitespace-nowrap text-muted-foreground"
              style={{ left: `${dueFrac * 100}%` }}
            >
              Due <LocalDate date={new Date(due!)} pattern="MMM d" />
            </span>
          </>
        )}
      </div>
      <figcaption className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <span>
          Started <LocalDate date={new Date(start)} pattern="MMM d, yyyy" />
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="h-0.5 w-5 bg-highlight" />
          Below {Math.round(DUE_RECALL * 100)}% means it is due for review
        </span>
      </figcaption>
    </figure>
  );
}
