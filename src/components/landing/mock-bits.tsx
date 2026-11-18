import { cn } from "@/lib/utils";
import { DUE_RECALL } from "@/lib/recall";

/*
 * Small pieces for the fixed-size landing mocks. These mirror RecallMeter and
 * friends but never respond to the viewport, so a mock renders the same at
 * every screen size.
 */

export const isFadingRecall = (r: number) => r < DUE_RECALL;

export function MockTitle({ title, recall, className }: { title: string; recall: number | null; className?: string }) {
  return (
    <p className={cn("truncate font-semibold", className)}>
      <span className={recall !== null && isFadingRecall(recall) ? "highlight" : undefined}>{title}</span>
    </p>
  );
}

export function MockMeter({ recall, bar = true }: { recall: number | null; bar?: boolean }) {
  if (recall === null) return <span className="text-sm text-muted-foreground">Not tried</span>;
  const fading = isFadingRecall(recall);
  const pct = Math.round(recall * 100);
  return (
    <span className="inline-flex shrink-0 items-center gap-2">
      {bar && (
        <span className="block h-1.5 w-12 overflow-hidden rounded-full bg-secondary">
          <span className={cn("block h-full rounded-full", fading ? "bg-highlight" : "bg-remembered")} style={{ width: `${pct}%` }} />
        </span>
      )}
      <span className={cn("num w-10 text-sm", fading ? "highlight font-medium" : "text-muted-foreground")}>{pct}%</span>
    </span>
  );
}
