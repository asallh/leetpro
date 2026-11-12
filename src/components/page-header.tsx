import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="font-heading text-2xl font-bold tracking-[-0.03em]">{title}</h1>
        {description && (
          <p className="mt-1 text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

const statusLabel: Record<string, string> = {
  new_problem: "new",
  learning: "learning",
  review: "review",
  mastered: "mastered",
};

export function StatusLabel({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "font-mono text-xs",
        status === "mastered" ? "text-success" : "text-muted-foreground"
      )}
    >
      {statusLabel[status] ?? status}
    </span>
  );
}
