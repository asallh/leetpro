import { cn } from "@/lib/utils";
import { isFading } from "@/lib/recall";

/** Estimated recall as a short bar plus a percentage; fading values sit on the highlighter. */
export function RecallMeter({ recall, className }: { recall: number | null; className?: string }) {
  if (recall === null) {
    return <span className={cn("text-sm text-muted-foreground", className)}>Not tried</span>;
  }
  const pct = Math.round(recall * 100);
  const fading = isFading(recall);
  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      aria-label={`Estimated recall ${pct}%${fading ? ", needs review" : ""}`}
      title="Estimated recall"
    >
      <span className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-secondary sm:block" aria-hidden="true">
        <span
          className={cn("block h-full rounded-full", fading ? "bg-highlight-strong" : "bg-remembered")}
          style={{ width: `${Math.max(4, pct)}%` }}
        />
      </span>
      <span className={cn("num w-10 text-sm", fading ? "highlight font-medium" : "text-muted-foreground")}>{pct}%</span>
    </span>
  );
}
