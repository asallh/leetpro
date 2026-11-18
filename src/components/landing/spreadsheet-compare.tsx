"use client";

import { useRef, useState, type PointerEvent } from "react";
import { GripVertical } from "lucide-react";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { cn } from "@/lib/utils";
import { MockMeter, MockTitle } from "./mock-bits";
import { Shot, type ShotVariant } from "./shot";

/*
 * The same five problems twice, as two fixed "screenshots" whose rows line up:
 * LeetPro on the left, the spreadsheet people actually keep on the right.
 * Dragging the divider only uncovers one or the other; nothing reflows.
 * Example data only.
 */

const ROWS = [
  { title: "Two Sum", d: "easy", r: 0.94, next: "in 12 days", tries: 2, sheet: ["two sum", "9/14", "E", "hashmap, 5 min", ""] },
  { title: "Coin Change", d: "medium", r: 0.67, next: "Tonight", tries: 3, sheet: ["coin change", "9/20", "M", "off by one on the table", "next wk?"] },
  { title: "Course Schedule", d: "medium", r: 0.88, next: "Thursday", tries: 1, sheet: ["course sched", "", "M", "", ""] },
  { title: "Trapping Rain Water", d: "hard", r: 0.58, next: "Tonight", tries: 2, sheet: ["trapping rain h2o", "10/2", "H", "needed hint, max L/R", "sat??"] },
  { title: "Word Search", d: "medium", r: 0.64, next: "Tonight", tries: 1, sheet: ["word search", "10/3", "M", "slow, fix pruning", "maybe"] },
] as const;

// Shared vertical rhythm so rows line up across both panels.
const TOP = "h-10"; // formula bar / summary bar
const LETTERS = "h-8"; // column letters / spacer
const HEAD = "h-10"; // header row
const ROW = "h-14";

// Where the divider starts: just past LeetPro's columns, so the sheet shows its notes and redo guesses.
const DEFAULT_SPLIT: Record<ShotVariant, number> = { desktop: 50, phone: 63 };

export function SpreadsheetCompare() {
  const [variant, setVariant] = useState<ShotVariant>("desktop");
  const [dragged, setDragged] = useState<number | null>(null);
  const split = dragged ?? DEFAULT_SPLIT[variant];
  const setSplit = setDragged;
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    setSplit(Math.min(97, Math.max(3, ((e.clientX - r.left) / r.width) * 100)));
  };

  return (
    <div>
      <div
        ref={box}
        className="relative cursor-ew-resize touch-pan-y overflow-hidden rounded-3xl border select-none"
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          move(e);
        }}
        onPointerMove={(e) => dragging.current && move(e)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        <Shot desktop={{ w: 1100, h: 420 }} phone={{ w: 380, h: 420 }} breakpoint={560} onVariant={setVariant}>
          {(v) => (
            <div className="relative h-full w-full" aria-hidden="true">
              <Ledger variant={v} />
              <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${split}%)` }}>
                <Sheet variant={v} />
              </div>
            </div>
          )}
        </Shot>

        <div className="pointer-events-none absolute inset-y-0 w-px bg-foreground/80" style={{ left: `${split}%` }}>
          <span className="absolute top-1/2 left-1/2 grid h-10 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border bg-card shadow-lg">
            <GripVertical className="size-4" aria-hidden="true" />
          </span>
        </div>
        <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-background/85 px-3 py-1 text-xs backdrop-blur">
          LeetPro
        </span>
        <span className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-background/85 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          Your spreadsheet
        </span>
      </div>

      <label className="sr-only">
        Compare LeetPro and a tracking spreadsheet
        <input type="range" min={3} max={97} value={Math.round(split)} onChange={(e) => setSplit(Number(e.target.value))} />
      </label>
    </div>
  );
}

function Ledger({ variant }: { variant: ShotVariant }) {
  const phone = variant === "phone";
  // Columns kept on the left so they stay visible however far the sheet covers.
  const cols = phone ? "grid-cols-[148px_44px]" : "grid-cols-[250px_116px_104px]";
  const pad = phone ? "px-4" : "px-5";
  return (
    <div className="absolute inset-0 bg-card">
      <div className={cn(TOP, pad, "flex items-center border-b text-xs text-muted-foreground")}>5 tracked, 3 due tonight</div>
      <div className={LETTERS} />
      <div className={cn(HEAD, pad, "grid items-center gap-3 border-b text-xs text-muted-foreground", cols)}>
        <span>Problem</span>
        <span>Recall</span>
        {!phone && <span>Next review</span>}
      </div>
      {ROWS.map((p) => (
        <div key={p.title} className={cn(ROW, pad, "grid items-center gap-3 border-b", cols)}>
          <div className="min-w-0">
            <MockTitle title={p.title} recall={p.r} className={phone ? "text-[14px]" : "text-[15px]"} />
            <p className="text-xs whitespace-nowrap text-muted-foreground">
              <DifficultyBadge difficulty={p.d} className="text-xs" />
              {phone ? null : `, ${p.tries} ${p.tries === 1 ? "try" : "tries"}`}
            </p>
          </div>
          <MockMeter recall={p.r} bar={!phone} />
          {!phone && (
            <span className={cn("text-sm", p.next === "Tonight" ? "text-due-text" : "text-muted-foreground")}>{p.next}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function Sheet({ variant }: { variant: ShotVariant }) {
  const phone = variant === "phone";
  // Column index into each row's `sheet` cells, header text, and width.
  const cols = phone
    ? [
        { i: 0, h: "problem", w: 208 },
        { i: 4, h: "redo?", w: 140 },
      ]
    : [
        { i: 0, h: "problem", w: 300 },
        { i: 1, h: "date", w: 124 },
        { i: 2, h: "diff", w: 80 },
        { i: 3, h: "notes", w: 400 },
        { i: 4, h: "redo?", w: 152 },
      ];
  // Columns are sized so notes and redo? start right where the divider sits by default.
  const rowNum = phone ? 32 : 44;
  const letters = "ABCDE";

  return (
    <div className="absolute inset-0 bg-[#1A1B1E] font-mono text-[13px] text-muted-foreground">
      <div className={cn(TOP, "flex items-center justify-end gap-3 border-b px-3")}>
        <span className="rounded border px-1.5 text-faint">fx</span>
        <span className="truncate">=IF(TODAY()-B3&gt;7,&quot;redo&quot;,&quot;&quot;)</span>
      </div>
      <Row height={LETTERS} rowNum={rowNum} label="" className="bg-card/50 text-faint">
        {cols.map((c, j) => (
          <Cell key={c.h} w={c.w} className="justify-center">
            {letters[j]}
          </Cell>
        ))}
      </Row>
      <Row height={HEAD} rowNum={rowNum} label="1">
        {cols.map((c) => (
          <Cell key={c.h} w={c.w} className="font-bold text-foreground/70">
            {c.h}
          </Cell>
        ))}
      </Row>
      {ROWS.map((r, n) => (
        <Row key={r.title} height={ROW} rowNum={rowNum} label={String(n + 2)} className={cn(n === 2 && "bg-destructive/5")}>
          {cols.map((c) => (
            <Cell key={c.h} w={c.w}>
              {r.sheet[c.i]}
            </Cell>
          ))}
        </Row>
      ))}
      <Row height={ROW} rowNum={rowNum} label="8">
        {cols.map((c) => (
          <Cell key={c.h} w={c.w} />
        ))}
      </Row>
    </div>
  );
}

function Row({
  height,
  rowNum,
  label,
  className,
  children,
}: {
  height: string;
  rowNum: number;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(height, "flex border-b", className)}>
      <span className="grid shrink-0 place-items-center border-r text-faint" style={{ width: rowNum }}>
        {label}
      </span>
      {children}
    </div>
  );
}

function Cell({ w, className, children }: { w: number; className?: string; children?: React.ReactNode }) {
  return (
    <span className={cn("flex shrink-0 items-center truncate border-r px-2.5", className)} style={{ width: w }}>
      {children}
    </span>
  );
}
