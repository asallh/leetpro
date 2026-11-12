import { cn } from "@/lib/utils";

type Difficulty = "easy" | "medium" | "hard";

const glyph: Record<Difficulty, string> = { easy: "E", medium: "M", hard: "H" };

const styles: Record<Difficulty, string> = {
  easy: "border-border text-foreground",
  medium: "border-foreground text-foreground",
  hard: "border-foreground bg-foreground text-background",
};

export function DifficultyBadge({
  difficulty,
  className,
}: {
  difficulty: Difficulty;
  className?: string;
}) {
  return (
    <span
      title={difficulty[0].toUpperCase() + difficulty.slice(1)}
      aria-label={difficulty}
      className={cn(
        "inline-grid size-[22px] shrink-0 place-items-center rounded-sm border font-mono text-[11px] font-bold",
        styles[difficulty],
        className
      )}
    >
      {glyph[difficulty]}
    </span>
  );
}
