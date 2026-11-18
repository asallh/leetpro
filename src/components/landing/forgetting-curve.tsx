"use client";

import { useId, useRef, useState, type PointerEvent } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { DUE_RECALL } from "@/lib/recall";
import { DifficultyBadge } from "@/components/difficulty-badge";

/*
 * An interactive version of the recall model in src/lib/recall.ts: drag
 * through the next three weeks, watch problems fade below the review line,
 * and review one to reset its curve with a longer interval. Example data.
 */

const HORIZON = 21;
const MAX_INTERVAL = 180;

type Review = { at: number; interval: number };
type Problem = { title: string; d: "easy" | "medium" | "hard"; reviews: Review[] };

const START: Problem[] = [
  { title: "Two Sum", d: "easy", reviews: [{ at: -2, interval: 14 }] },
  { title: "Coin Change", d: "medium", reviews: [{ at: -3, interval: 7 }] },
  { title: "Course Schedule", d: "medium", reviews: [{ at: -1, interval: 3 }] },
  { title: "Trapping Rain Water", d: "hard", reviews: [{ at: -4, interval: 3 }] },
];

function recallAt(p: Problem, day: number) {
  const last = [...p.reviews].reverse().find((r) => r.at <= day) ?? p.reviews[0];
  const stability = last.interval / Math.log(1 / DUE_RECALL);
  return Math.exp(-Math.max(0, day - last.at) / stability);
}

// Chart geometry, in SVG user units.
const W = 600;
const H = 260;
const PAD = { l: 8, r: 8, t: 12, b: 28 };
const x = (day: number) => PAD.l + (day / HORIZON) * (W - PAD.l - PAD.r);
const y = (r: number) => PAD.t + (1 - r) * (H - PAD.t - PAD.b);

function path(p: Problem) {
  let d = "";
  for (let i = 0; i <= HORIZON * 4; i++) {
    const day = i / 4;
    d += `${i ? "L" : "M"}${x(day).toFixed(1)},${y(recallAt(p, day)).toFixed(1)}`;
  }
  return d;
}

export function ForgettingCurve() {
  const [problems, setProblems] = useState(START);
  const [day, setDay] = useState(6);
  const [focus, setFocus] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const clip = useId();
  const dragging = useRef(false);

  const fading = problems.filter((p) => recallAt(p, day) < DUE_RECALL).length;
  const touched = problems !== START;

  const review = (i: number) =>
    setProblems((ps) =>
      ps.map((p, j) => {
        if (j !== i) return p;
        const prev = p.reviews[p.reviews.length - 1].interval;
        // Keep only reviews before now, so scrubbing back and reviewing again rewrites the future.
        const kept = p.reviews.filter((r) => r.at < day);
        return { ...p, reviews: [...kept, { at: day, interval: Math.min(prev * 2, MAX_INTERVAL) }] };
      })
    );

  const scrubTo = (e: PointerEvent<SVGSVGElement>) => {
    const r = svg.current?.getBoundingClientRect();
    if (!r) return;
    const ux = ((e.clientX - r.left) / r.width) * W;
    const d = ((ux - PAD.l) / (W - PAD.l - PAD.r)) * HORIZON;
    setDay(Math.round(Math.min(HORIZON, Math.max(0, d)) * 2) / 2);
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-10">
      <div className="rounded-2xl border bg-card p-4 sm:p-6">
        <p className="marker text-xl font-bold sm:text-2xl" aria-live="polite">
          {day === 0 ? "Today" : `In ${day} ${day === 1 ? "day" : "days"}`},{" "}
          {fading === 0 ? (
            "everything is still remembered."
          ) : (
            <>
              <span className="highlight">
                {fading} of {problems.length}
              </span>{" "}
              {fading === 1 ? "problem is" : "problems are"} fading.
            </>
          )}
        </p>

        <svg
          ref={svg}
          viewBox={`0 0 ${W} ${H}`}
          className="mt-5 w-full cursor-ew-resize touch-none select-none"
          role="img"
          aria-label="Estimated recall for four example problems over the next three weeks"
          onPointerDown={(e) => {
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            scrubTo(e);
          }}
          onPointerMove={(e) => dragging.current && scrubTo(e)}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
        >
          <defs>
            <clipPath id={clip}>
              <rect x={0} y={y(DUE_RECALL)} width={W} height={H} />
            </clipPath>
          </defs>

          {[0, 7, 14, 21].map((d) => (
            <g key={d}>
              <line x1={x(d)} x2={x(d)} y1={PAD.t} y2={H - PAD.b} className="stroke-border" strokeWidth={1} />
              <text
                x={x(d)}
                y={H - 8}
                textAnchor={d === 0 ? "start" : d === HORIZON ? "end" : "middle"}
                className="fill-muted-foreground text-[11px]"
              >
                {d === 0 ? "Today" : `${d / 7} ${d === 7 ? "week" : "weeks"}`}
              </text>
            </g>
          ))}

          <rect x={PAD.l} y={y(DUE_RECALL)} width={W - PAD.l - PAD.r} height={y(0) - y(DUE_RECALL)} className="fill-highlight/[0.04]" />
          <line
            x1={PAD.l}
            x2={W - PAD.r}
            y1={y(DUE_RECALL)}
            y2={y(DUE_RECALL)}
            className="stroke-highlight"
            strokeDasharray="4 5"
            strokeWidth={1}
          />
          <text x={W - PAD.r} y={y(DUE_RECALL) - 6} textAnchor="end" className="fill-highlight text-[11px]">
            Review line, 70%
          </text>

          {problems.map((p, i) => {
            const d = path(p);
            const dim = focus !== null && focus !== i;
            return (
              <g key={p.title} className={cn("transition-opacity duration-200", dim && "opacity-25")}>
                <path d={d} fill="none" className="stroke-foreground/55" strokeWidth={focus === i ? 2.5 : 1.75} />
                <path d={d} fill="none" clipPath={`url(#${clip})`} className="stroke-highlight" strokeWidth={focus === i ? 2.5 : 1.75} />
              </g>
            );
          })}

          <line x1={x(day)} x2={x(day)} y1={PAD.t} y2={H - PAD.b} className="stroke-foreground" strokeWidth={1.25} />
          {problems.map((p, i) => {
            const r = recallAt(p, day);
            return (
              <circle
                key={p.title}
                cx={x(day)}
                cy={y(r)}
                r={focus === i ? 5 : 4}
                className={cn(r < DUE_RECALL ? "fill-highlight" : "fill-foreground", "stroke-card")}
                strokeWidth={2}
              />
            );
          })}
        </svg>

        <label className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="shrink-0">Look ahead</span>
          <input
            type="range"
            min={0}
            max={HORIZON}
            step={0.5}
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
            className="w-full"
            aria-valuetext={`${day} days from today`}
          />
        </label>
      </div>

      <div>
        <h3 className="font-semibold">Review one and watch it reset</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Each review starts the curve again and doubles the wait before the next one.
        </p>
        <ul className="mt-5 divide-y rounded-2xl border bg-card">
          {problems.map((p, i) => {
            const r = recallAt(p, day);
            const isFading = r < DUE_RECALL;
            const next = p.reviews[p.reviews.length - 1];
            return (
              <li
                key={p.title}
                className="flex items-center gap-3 px-4 py-3"
                onPointerEnter={() => setFocus(i)}
                onPointerLeave={() => setFocus(null)}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    <span className={isFading ? "highlight" : undefined}>{p.title}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <DifficultyBadge difficulty={p.d} className="text-xs" />, every {next.interval} days
                  </p>
                </div>
                <span className={cn("num w-20 text-right text-sm", isFading ? "text-highlight" : "text-muted-foreground")}>
                  {Math.round(r * 100)}%{isFading && ", fading"}
                </span>
                <button
                  type="button"
                  onClick={() => review(i)}
                  onFocus={() => setFocus(i)}
                  onBlur={() => setFocus(null)}
                  className="rounded-lg border px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-secondary"
                  aria-label={`Review ${p.title} on day ${day}`}
                >
                  Review
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={() => setProblems(START)}
          className={cn(
            "mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-opacity hover:text-foreground",
            touched ? "opacity-100" : "pointer-events-none opacity-0"
          )}
          tabIndex={touched ? 0 : -1}
        >
          <RotateCcw className="size-3.5" aria-hidden="true" /> Start over
        </button>
      </div>
    </div>
  );
}
