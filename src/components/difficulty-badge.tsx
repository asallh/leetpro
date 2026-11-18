import { cn } from "@/lib/utils";

type Difficulty = "easy" | "medium" | "hard";

const label: Record<Difficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };

const styles: Record<Difficulty, string> = {
  easy: "text-remembered",
  medium: "text-medium",
  hard: "text-destructive",
};

/** Difficulty as LeetCode names it, in the marker colour LeetCode users already associate with it. */
export function DifficultyBadge({ difficulty, className }: { difficulty: Difficulty; className?: string }) {
  return <span className={cn("text-sm font-medium", styles[difficulty], className)}>{label[difficulty]}</span>;
}
