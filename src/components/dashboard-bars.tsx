import { cn } from "@/lib/utils";

type Bar = {
  key: string;
  value: number;
  label: string;
  topLabel?: string;
  emphasize?: boolean;
  title?: string;
};

export function DashboardBars({
  bars,
  max,
  heightClass = "h-28",
  className,
  ariaLabel,
}: {
  bars: Bar[];
  max: number;
  heightClass?: string;
  className?: string;
  ariaLabel: string;
}) {
  const safeMax = Math.max(1, max);

  return (
    <div
      className={cn("grid items-end gap-1", heightClass, className)}
      style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}
      role="img"
      aria-label={ariaLabel}
    >
      {bars.map((bar) => (
        <div
          key={bar.key}
          className="grid h-full grid-rows-[auto_1fr_auto] gap-1 text-center"
          title={bar.title ?? `${bar.label}: ${bar.value}`}
        >
          <span
            className={cn(
              "num self-end text-[10px]",
              bar.emphasize ? "font-bold text-foreground" : "text-muted-foreground"
            )}
          >
            {bar.topLabel ?? (bar.value > 0 ? bar.value : "")}
          </span>
          <span
            className={cn(
              "min-h-0.5 self-end rounded-t-[2px]",
              bar.emphasize ? "bg-due" : "bg-foreground/25"
            )}
            style={{ height: `${(bar.value / safeMax) * 100}%` }}
          />
          <span
            className={cn(
              "num text-[9.5px]",
              bar.emphasize ? "font-bold text-foreground" : "text-muted-foreground"
            )}
          >
            {bar.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ShareRow({
  label,
  count,
  share,
  emphasize = false,
}: {
  label: string;
  count: number;
  share: number | null;
  emphasize?: boolean;
}) {
  const width = share == null ? 0 : Math.round(share * 100);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-sm">
      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className={emphasize ? "text-due-text" : "text-muted-foreground"}>
            {label}
          </span>
          <span className="num text-xs text-muted-foreground">
            {share == null ? "—" : `${width}%`}
          </span>
        </div>
        <div className="mt-1 h-1 overflow-hidden rounded-[1px] bg-foreground/10">
          <div
            className={cn("h-full rounded-[1px]", emphasize ? "bg-due" : "bg-foreground/45")}
            style={{ width: `${width}%` }}
          />
        </div>
      </div>
      <span className="num self-center text-right">{count}</span>
    </div>
  );
}
