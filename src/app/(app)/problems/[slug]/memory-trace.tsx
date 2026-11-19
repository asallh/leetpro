import { DUE_RECALL } from "@/lib/recall";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const DAY_MS = 86_400_000;
const W = 1000;
const H = 100;

type TraceAttempt = {
  id: string;
  date: Date;
  attemptNumber: number;
  result: "solved_independently" | "solved_with_hint" | "needed_solution" | "could_not_solve";
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

  const start = new Date(attempts[0].date).getTime();
  const last = new Date(attempts[attempts.length - 1].date).getTime();
  const due = nextReviewDate ? new Date(nextReviewDate).getTime() : null;
  const rawEnd = Math.max(now.getTime(), due ?? 0, last + DAY_MS);
  // A little room after the last thing on the axis so its label is not on the edge.
  const end = rawEnd + Math.max(DAY_MS / 2, (rawEnd - start) * 0.04);
  const span = end - start;

  const x = (t: number) => ((t - start) / span) * W;
  const y = (r: number) => (1 - r) * H;
  const pct = (t: number) => `${((t - start) / span) * 100}%`;

  // One decay segment per attempt, running to the next attempt (or the end of the axis).
  const past: string[] = [];
  let future = "";
  attempts.forEach((a, i) => {
    const t0 = new Date(a.date).getTime();
    const t1 = i < attempts.length - 1 ? new Date(attempts[i + 1].date).getTime() : end;
    const interval = Math.max(1, i < attempts.length - 1 ? (attempts[i + 1].prevInterval ?? 1) : currentInterval);
    const stability = interval / Math.log(1 / DUE_RECALL);
    const recallAt = (t: number) => Math.exp(-(t - t0) / DAY_MS / stability);

    const sample = (from: number, to: number) => {
      const steps = 48;
      const pts: string[] = [];
      for (let s = 0; s <= steps; s++) {
        const t = from + ((to - from) * s) / steps;
        pts.push(`${x(t).toFixed(1)},${y(recallAt(t)).toFixed(2)}`);
      }
      return pts;
    };

    const isLast = i === attempts.length - 1;
    const pastEnd = isLast ? Math.min(t1, now.getTime()) : t1;
    // The drop back up to 100% at each new attempt is part of the line.
    const head = i > 0 ? [`${x(t0).toFixed(1)},${y(1).toFixed(2)}`] : [];
    past.push([...head, ...sample(t0, pastEnd)].join(" "));
    if (isLast && t1 > now.getTime()) future = sample(now.getTime(), t1).join(" ");
  });
  const pastPath = past.map((p, i) => (i === 0 ? `M${p.replace(/ /g, " L")}` : `L${p.replace(/ /g, " L")}`)).join(" ");
  const futurePath = future ? `M${future.replace(/ /g, " L")}` : "";

  // Group attempts whose marks would overlap (closer than ~3% of the axis).
  const clusters: TraceAttempt[][] = [];
  for (const a of attempts) {
    const group = clusters[clusters.length - 1];
    const t = new Date(a.date).getTime();
    if (group && (t - new Date(group[group.length - 1].date).getTime()) / span < 0.03) group.push(a);
    else clusters.push([a]);
  }

  const lineY = y(DUE_RECALL);
  const todayFrac = (now.getTime() - start) / span;
  const dueFrac = due != null ? (due - start) / span : null;
  const dueOverdue = due != null && due <= now.getTime();
  const showDueLabel = dueFrac != null && !dueOverdue && Math.abs(dueFrac - todayFrac) > 0.14;

  const summary = `Estimated recall over ${attempts.length} ${attempts.length === 1 ? "attempt" : "attempts"} since ${format(start, "MMM d, yyyy")}. Each attempt resets it to 100%, and a review comes due when it falls to ${Math.round(DUE_RECALL * 100)}%.`;

  return (
    <figure className="m-0">
      <div className="relative ml-11 mr-2 h-44 sm:h-52" role="img" aria-label={summary}>
        {/* y-axis labels */}
        <span className="num absolute top-0 -left-11 -translate-y-1/2 text-xs text-muted-foreground">100%</span>
        <span
          className="num absolute -left-11 -translate-y-1/2 text-xs font-medium text-highlight"
          style={{ top: `${lineY}%` }}
        >
          {Math.round(DUE_RECALL * 100)}%
        </span>
        <span className="num absolute bottom-0 -left-11 translate-y-1/2 text-xs text-muted-foreground">0%</span>

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
                "absolute top-0 grid h-5 min-w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-card px-1 text-[0.625rem] font-bold leading-none",
                a.result === "solved_independently"
                  ? "bg-remembered text-[#10241A]"
                  : a.result === "could_not_solve"
                    ? "bg-destructive text-[#2A0F0B]"
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
          className="absolute -bottom-7 -translate-x-1/2 text-xs font-medium whitespace-nowrap"
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
              className="absolute -bottom-7 -translate-x-1/2 text-xs whitespace-nowrap text-muted-foreground"
              style={{ left: `${dueFrac * 100}%` }}
            >
              Due {format(due!, "MMM d")}
            </span>
          </>
        )}
      </div>
      <figcaption className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <span>Started {format(start, "MMM d, yyyy")}</span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="h-0.5 w-5 bg-highlight" />
          Below {Math.round(DUE_RECALL * 100)}% means it is due for review
        </span>
      </figcaption>
    </figure>
  );
}
