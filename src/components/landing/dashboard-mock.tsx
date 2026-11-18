"use client";

import { LogoMark } from "@/components/logo";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { cn } from "@/lib/utils";
import { MockMeter, MockTitle } from "./mock-bits";
import { Shot } from "./shot";

/*
 * The Today page as a fixed-size "screenshot" for the hero's tilting screen.
 * It mirrors the real dashboard; every row is an example, not user data.
 */

const TONIGHT = [
  { title: "Trapping Rain Water", d: "hard", r: 0.58, action: "Review" },
  { title: "Word Search", d: "medium", r: 0.64, action: "Review" },
  { title: "Coin Change", d: "medium", r: 0.67, action: "Review" },
  { title: "LRU Cache", d: "medium", r: null, action: "Start" },
] as const;

const WEEK = [
  { d: "Today", n: 3 },
  { d: "Thu", n: 1 },
  { d: "Fri", n: 0 },
  { d: "Sat", n: 2 },
  { d: "Sun", n: 0 },
  { d: "Mon", n: 1 },
  { d: "Tue", n: 0 },
];

const TOPICS = [
  { t: "Graphs", c: 2.4 },
  { t: "Dynamic programming", c: 2.7 },
  { t: "Heaps", c: 2.9 },
];

export function DashboardMock() {
  return (
    <Shot desktop={{ w: 1120, h: 700 }} phone={{ w: 390, h: 720 }} className="select-none">
      {(v) => (v === "phone" ? <PhoneToday /> : <DesktopToday />)}
    </Shot>
  );
}

function DesktopToday() {
  return (
    <div className="flex h-full flex-col bg-background text-left" aria-hidden="true">
      <div className="flex h-14 shrink-0 items-center gap-7 border-b px-7 text-[15px]">
        <Wordmark />
        <span className="relative font-semibold">
          Today
          <span className="absolute inset-x-0 -bottom-[19px] h-[3px] rounded-full bg-highlight" />
        </span>
        <span className="text-muted-foreground">Problems</span>
        <span className="text-muted-foreground">Review</span>
        <span className="text-muted-foreground">Problem sets</span>
        <Avatar />
      </div>

      <div className="px-10 pt-8">
        <p className="text-sm text-muted-foreground">Good evening.</p>
        <Headline className="mt-1 max-w-[24ch] text-[40px]" />

        <div className="mt-8 grid grid-cols-[minmax(0,1fr)_300px] gap-12">
          <div>
            <p className="font-semibold">Tonight</p>
            <ul className="mt-3 divide-y rounded-2xl border bg-card shadow-[0_24px_48px_-16px_rgba(0,0,0,0.6)]">
              {TONIGHT.map((p, i) => (
                <li key={p.title} className="flex h-[68px] items-center gap-4 px-5">
                  <div className="min-w-0 flex-1">
                    <MockTitle title={p.title} recall={p.r} />
                    <DifficultyBadge difficulty={p.d} className="text-xs" />
                  </div>
                  <MockMeter recall={p.r} />
                  <ActionButton primary={i === 0}>{p.action}</ActionButton>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-7">
            <div>
              <p className="font-semibold">This week</p>
              <Week className="mt-3" />
            </div>
            <div>
              <p className="font-semibold">Weakest topics</p>
              <ul className="mt-3 space-y-3">
                {TOPICS.map((t) => (
                  <li key={t.t} className="text-sm">
                    <div className="flex justify-between">
                      <span>{t.t}</span>
                      <span className="num text-destructive">{t.c.toFixed(1)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-destructive/80" style={{ width: `${(t.c / 5) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold">Blind 75</p>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="num text-foreground">41 of 75</span>, done around January 12.
              </p>
              <div className="mt-2 h-1.5 rounded-full bg-secondary">
                <div className="h-full w-[55%] rounded-full bg-remembered" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PhoneToday() {
  return (
    <div className="flex h-full flex-col bg-background text-left" aria-hidden="true">
      <div className="flex h-14 shrink-0 items-center border-b px-5">
        <Wordmark />
        <Avatar />
      </div>
      <div className="flex h-11 shrink-0 items-center gap-5 border-b px-5 text-sm">
        <span className="relative font-semibold">
          Today
          <span className="absolute inset-x-0 -bottom-[13px] h-[3px] rounded-full bg-highlight" />
        </span>
        <span className="text-muted-foreground">Problems</span>
        <span className="text-muted-foreground">Review</span>
        <span className="text-muted-foreground">Sets</span>
      </div>

      <div className="px-5 pt-6">
        <p className="text-sm text-muted-foreground">Good evening.</p>
        <Headline className="mt-1 text-[28px]" />

        <p className="mt-7 font-semibold">Tonight</p>
        <ul className="mt-3 divide-y rounded-2xl border bg-card">
          {TONIGHT.map((p, i) => (
            <li key={p.title} className="flex h-[64px] items-center gap-3 px-4">
              <div className="min-w-0 flex-1">
                <MockTitle title={p.title} recall={p.r} className="text-[15px]" />
                <DifficultyBadge difficulty={p.d} className="text-xs" />
              </div>
              <MockMeter recall={p.r} bar={false} />
              <ActionButton primary={i === 0}>{p.action}</ActionButton>
            </li>
          ))}
        </ul>

        <p className="mt-7 font-semibold">This week</p>
        <Week className="mt-3" />
      </div>
    </div>
  );
}

function Wordmark() {
  return (
    <span className="flex items-center gap-2 font-mono text-[15px] font-bold tracking-[-0.04em]">
      <LogoMark className="size-6" />
      <span>
        Leet<span className="text-due-text">Pro</span>
      </span>
    </span>
  );
}

function Avatar() {
  return <span className="ml-auto grid size-8 place-items-center rounded-full bg-secondary text-sm">A</span>;
}

function Headline({ className }: { className?: string }) {
  return (
    <p className={cn("marker leading-[1.1] font-bold", className)}>
      <span className="highlight">3 problems</span> are fading. Clear them before something new.
    </p>
  );
}

function ActionButton({ primary, children }: { primary: boolean; children: string }) {
  return (
    <span
      className={cn(
        "w-[76px] shrink-0 rounded-lg py-1.5 text-center text-sm font-medium",
        primary ? "bg-primary text-primary-foreground" : "border"
      )}
    >
      {children}
    </span>
  );
}

function Week({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-7 gap-1 text-center", className)}>
      {WEEK.map((w, i) => (
        <div key={w.d} className={cn("rounded-lg py-2", i === 0 && "bg-secondary")}>
          <p className="text-[11px] text-muted-foreground">{w.d}</p>
          <p className={cn("num font-mono text-lg", w.n ? "text-foreground" : "text-faint")}>{w.n}</p>
        </div>
      ))}
    </div>
  );
}
