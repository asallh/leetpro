import { cn } from "@/lib/utils";

/**
 * LeetPro mark: three ledger entries fading top to bottom, the amber one due.
 * Source of truth is brand/leetpro-mark.svg; keep these paths in sync with it
 * and with extension/popup/popup.html.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("size-6 shrink-0 rounded-[22%] ring-1 ring-border", className)}
    >
      <rect width="32" height="32" rx="7" fill="#16171A" />
      <rect x="8" y="8" width="16" height="4" rx="1" fill="#E9E6DF" />
      <rect x="8" y="14" width="12" height="4" rx="1" fill="#8F8C85" />
      <rect x="8" y="20" width="8" height="4" rx="1" fill="#F0B429" />
    </svg>
  );
}

export function Logo({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={markClassName} />
      <span className="font-heading font-bold tracking-[-0.04em]">
        Leet<span className="text-due-text">Pro</span>
      </span>
    </span>
  );
}
