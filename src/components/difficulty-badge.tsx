import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const colors = {
  easy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  hard: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export function DifficultyBadge({ difficulty }: { difficulty: "easy" | "medium" | "hard" }) {
  return (
    <Badge variant="secondary" className={cn("capitalize", colors[difficulty])}>
      {difficulty}
    </Badge>
  );
}
