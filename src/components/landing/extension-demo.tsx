"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { CometCard } from "@/components/ui/comet-card";
import { calculateNextReview } from "@/lib/spaced-repetition";
import { cn } from "@/lib/utils";

/*
 * The extension overlay, on a card that tilts toward the pointer. Picking a
 * confidence runs the real scheduler so the next-review line is honest.
 */

const RESULTS = ["On my own", "With a hint", "Read the solution"];
const CONFIDENCE_LABEL = ["", "Lost", "Shaky", "Got there", "Solid", "Could teach it"];

export function ExtensionDemo() {
  const [result, setResult] = useState(0);
  const [confidence, setConfidence] = useState(3);
  const [saved, setSaved] = useState(false);

  const { newInterval } = calculateNextReview({ confidence, currentInterval: 0, currentStatus: "new_problem" });
  const when = newInterval === 1 ? "tomorrow" : `in ${newInterval} days`;

  const change = (fn: () => void) => {
    fn();
    setSaved(false);
  };

  return (
    <CometCard rotateDepth={6} translateDepth={6} hoverScale={1.02} className="mx-auto w-full max-w-md">
      <div className="overflow-hidden rounded-2xl border bg-[#1A1B1E]">
        <div className="flex items-center gap-2 border-b px-4 py-2.5">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-border" />
            <span className="size-2.5 rounded-full bg-border" />
            <span className="size-2.5 rounded-full bg-border" />
          </span>
          <span className="ml-2 truncate rounded-md bg-secondary px-2.5 py-0.5 font-mono text-[0.6875rem] text-muted-foreground">
            leetcode.com/problems/course-schedule
          </span>
        </div>
        <div className="px-5 pt-4 pb-6">
          <p className="flex items-center gap-2 text-lg font-semibold text-remembered">
            <Check className="size-5" aria-hidden="true" /> Accepted
          </p>
          <p className="text-xs text-muted-foreground">Runtime 84 ms, beats 91%</p>

          <div className="mt-4 rounded-2xl border bg-card p-4 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.7)]">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Log Course Schedule</p>
              <span className="font-mono text-xs font-bold tracking-[-0.04em]">
                Leet<span className="text-due-text">Pro</span>
              </span>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">How did you solve it?</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {RESULTS.map((r, i) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => change(() => setResult(i))}
                  aria-pressed={result === i}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    result === i ? "border-foreground bg-foreground text-background" : "hover:bg-secondary"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              How confident are you? <span className="text-foreground">{CONFIDENCE_LABEL[confidence]}</span>
            </p>
            <div className="mt-1.5 grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => change(() => setConfidence(c))}
                  aria-pressed={confidence === c}
                  aria-label={`Confidence ${c} of 5, ${CONFIDENCE_LABEL[c]}`}
                  className={cn(
                    "num h-9 rounded-lg border text-sm transition-colors",
                    confidence === c ? "border-foreground bg-foreground text-background" : "hover:bg-secondary"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>

            <p className="mt-4 text-sm" aria-live="polite">
              Comes back <span className="font-semibold">{when}</span>.
            </p>

            <button
              type="button"
              onClick={() => setSaved(true)}
              className={cn(
                "mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors",
                saved ? "bg-remembered-soft text-remembered" : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {saved ? (
                <>
                  <Check className="size-4" aria-hidden="true" /> Logged
                </>
              ) : (
                "Save attempt"
              )}
            </button>
          </div>
        </div>
      </div>
    </CometCard>
  );
}
