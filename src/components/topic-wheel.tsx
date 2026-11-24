"use client";

import { useState } from "react";
import { areaRadius, polar, wedgePath } from "@/lib/radial";
import { cn } from "@/lib/utils";

export type WheelTopic = {
  topic: string;
  short: string;
  total: number;
  solved: number;
  fading: number;
  attempted: number;
  avgConfidence: number | null;
  verdict: string;
};

const W = 460;
const H = 380;
const CX = W / 2;
const CY = H / 2;
const R0 = 52;
const R = 132;
const LABEL_R = R + 14;

/**
 * Every roadmap topic as a wedge, clockwise in roadmap order from twelve o'clock.
 * Filled area grows with your share of the topic: solved nearest the centre, then
 * fading, then tried. Hover or focus a wedge to read it in the middle.
 */
export function TopicWheel({ topics }: { topics: WheelTopic[] }) {
  const [active, setActive] = useState<number | null>(null);
  const step = 360 / topics.length;
  const totals = topics.reduce(
    (t, x) => ({
      solved: t.solved + x.solved,
      total: t.total + x.total,
      started: t.started + (x.attempted > 0 ? 1 : 0),
    }),
    { solved: 0, total: 0, started: 0 },
  );
  const a = active != null ? topics[active] : null;

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mx-auto block w-full max-w-[30rem]"
        role="group"
        aria-label="Topic wheel: how much of each topic you've solved"
        onMouseLeave={() => setActive(null)}
      >
        {topics.map((t, i) => {
          const a0 = i * step;
          const a1 = a0 + step;
          const total = Math.max(1, t.total);
          const rSolved = areaRadius(t.solved / total, R0, R);
          const rFading = areaRadius((t.solved + t.fading) / total, R0, R);
          const rTried = areaRadius(t.attempted / total, R0, R);
          const mid = a0 + step / 2;
          const lp = polar(CX, CY, LABEL_R, mid);
          const anchor = mid < 8 || mid > 352 || Math.abs(mid - 180) < 8 ? "middle" : mid < 180 ? "start" : "end";
          const dim = active != null && active !== i;
          return (
            <g
              key={t.topic}
              tabIndex={0}
              role="img"
              aria-label={`${t.topic}: ${t.solved} of ${t.total} solved, ${t.fading} fading, ${t.attempted - t.solved - t.fading} tried. ${t.verdict}.`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="cursor-default outline-none transition-opacity duration-150"
              style={{ opacity: dim ? 0.35 : 1 }}
            >
              {/* Hit target: the whole wedge out to the label. */}
              <path d={wedgePath(CX, CY, R0, LABEL_R, a0, a1)} className="fill-transparent" />
              <path d={wedgePath(CX, CY, R0, R, a0, a1)} className="fill-secondary stroke-background" strokeWidth={2} />
              <path
                d={wedgePath(CX, CY, R0, rTried, a0, a1)}
                className="fill-remembered/30 stroke-background"
                strokeWidth={2}
              />
              <path
                d={wedgePath(CX, CY, R0, rFading, a0, a1)}
                className="fill-highlight stroke-background"
                strokeWidth={2}
              />
              <path
                d={wedgePath(CX, CY, R0, rSolved, a0, a1)}
                className="fill-remembered stroke-background"
                strokeWidth={2}
              />
              {active === i && (
                <path
                  d={wedgePath(CX, CY, R0, R, a0, a1)}
                  className="fill-none stroke-foreground/70"
                  strokeWidth={1.5}
                />
              )}
              <text
                x={lp.x}
                y={lp.y}
                textAnchor={anchor}
                dominantBaseline="middle"
                className={cn(
                  "text-[11px]",
                  active === i
                    ? "fill-foreground font-semibold"
                    : t.attempted > 0
                      ? "fill-foreground"
                      : "fill-muted-foreground",
                )}
              >
                {t.short}
              </text>
            </g>
          );
        })}

        <g aria-live="polite" className="pointer-events-none">
          {a ? (
            <>
              <text x={CX} y={CY - 14} textAnchor="middle" className="marker fill-foreground text-[22px] font-bold">
                {a.solved}/{a.total}
              </text>
              <text x={CX} y={CY + 6} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                {a.avgConfidence != null ? `confidence ${a.avgConfidence.toFixed(1)}` : "not started"}
              </text>
              <text x={CX} y={CY + 21} textAnchor="middle" className="fill-foreground text-[10px] font-semibold">
                {a.verdict}
              </text>
            </>
          ) : (
            <>
              <text x={CX} y={CY - 6} textAnchor="middle" className="marker fill-foreground text-[26px] font-bold">
                {totals.solved}
              </text>
              <text x={CX} y={CY + 14} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                of {totals.total} solved
              </text>
            </>
          )}
        </g>
      </svg>
      <figcaption className="mt-2 text-center text-sm text-muted-foreground">
        {a ? (
          <>
            <span className="font-semibold text-foreground">{a.topic}</span>: {a.solved} of {a.total} solved
            {a.fading > 0 ? `, ${a.fading} fading` : ""}.
          </>
        ) : (
          `${totals.started} of ${topics.length} topics started. Hover a topic to read it.`
        )}
      </figcaption>
    </figure>
  );
}
