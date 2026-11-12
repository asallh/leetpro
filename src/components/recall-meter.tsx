import { cn } from "@/lib/utils";
import { isFading } from "@/lib/recall";

const STEPS = 5;

export function RecallMeter({
  recall,
  className,
}: {
  recall: number | null;
  className?: string;
}) {
  if (recall === null) {
    return <span className={cn("num text-xs text-muted-foreground", className)}>—</span>;
  }
  const pct = Math.round(recall * 100);
  const filled = Math.max(1, Math.round(recall * STEPS));
  const fading = isFading(recall);

  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      aria-label={`Estimated recall ${pct}%${fading ? ", due for review" : ""}`}
      title="Estimated recall"
    >
      <span className="inline-flex gap-[3px]" aria-hidden="true">
        {Array.from({ length: STEPS }, (_, i) => (
          <span
            key={i}
            className={cn(
              "size-1.5 rounded-[1px] transition-colors duration-300",
              i < filled
                ? fading
                  ? "bg-due"
                  : "bg-foreground"
                : "bg-foreground/15"
            )}
          />
        ))}
      </span>
      <span
        className={cn(
          "num w-9 text-xs",
          fading ? "text-due-text" : "text-muted-foreground"
        )}
      >
        {pct}%
      </span>
    </span>
  );
}
