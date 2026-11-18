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
        <h1 className="marker text-[2rem] leading-tight font-bold tracking-[-0.02em] sm:text-[2.5rem]">{title}</h1>
        {description && <p className="mt-2 max-w-[60ch] text-lg text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

const statusLabel: Record<string, string> = {
  new_problem: "New",
  learning: "Learning",
  review: "Reviewing",
  mastered: "Mastered",
};

export function StatusLabel({ status }: { status: string }) {
  return (
    <span className={cn("text-sm", status === "mastered" ? "font-medium text-remembered" : "text-muted-foreground")}>
      {statusLabel[status] ?? status}
    </span>
  );
}
