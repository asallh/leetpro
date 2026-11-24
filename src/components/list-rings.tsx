import { arcPath } from "@/lib/radial";

type RingList = { name: string; total: number; solved: number; attempted: number };

const W = 300;
const H = 170;
const CX = 205;
const CY = H / 2;
const STROKE = 11;
const GAP = 4;
/** Rings stop at nine o'clock so the top-left quarter is free for labels. */
const SWEEP = 270;

/**
 * One three-quarter ring per curated list, outermost first. Solved draws clockwise
 * from twelve o'clock in green; tried-but-not-solved continues in faint green. Each
 * ring is labelled in the open quarter, level with where it starts.
 */
export function ListRings({ lists }: { lists: RingList[] }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block w-full max-w-[20rem]"
      role="img"
      aria-label={lists.map((l) => `${l.name}: ${l.solved} of ${l.total} solved`).join(". ")}
    >
      {lists.map((l, i) => {
        const r = CY - STROKE / 2 - 2 - i * (STROKE + GAP);
        const solvedDeg = (l.solved / l.total) * SWEEP;
        const triedDeg = (Math.max(l.attempted, l.solved) / l.total) * SWEEP;
        return (
          <g key={l.name}>
            <path
              d={arcPath(CX, CY, r, 0, SWEEP)}
              className="fill-none stroke-secondary"
              strokeWidth={STROKE}
              strokeLinecap="round"
            />
            {triedDeg > solvedDeg && (
              <path
                d={arcPath(CX, CY, r, 0, triedDeg)}
                className="fill-none stroke-remembered/30"
                strokeWidth={STROKE}
                strokeLinecap="round"
              />
            )}
            {l.solved > 0 && (
              <path
                d={arcPath(CX, CY, r, 0, Math.max(solvedDeg, 3))}
                className="fill-none stroke-remembered"
                strokeWidth={STROKE}
                strokeLinecap="round"
              />
            )}
            <text x={CX - 12} y={CY - r} dominantBaseline="middle" textAnchor="end" className="text-[11px]">
              <tspan className="fill-foreground font-semibold">{l.name}</tspan>
              <tspan className="num fill-muted-foreground" dx={6}>
                {l.solved}/{l.total}
              </tspan>
            </text>
          </g>
        );
      })}
    </svg>
  );
}
