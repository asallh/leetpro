"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ShotSize = { w: number; h: number };
export type ShotVariant = "desktop" | "phone";

/**
 * Renders its content once at a fixed pixel size and scales it to fit the
 * available width, like a screenshot. Nothing inside ever reflows, so a mock
 * looks identical at every screen size; it only gets smaller.
 *
 * Narrow containers get a separate phone-sized layout instead of a desktop
 * layout shrunk past readability. Content must not use viewport breakpoints
 * (sm:, md:, ...) since the frame, not the viewport, decides the layout.
 */
export function Shot({
  desktop,
  phone,
  breakpoint = 600,
  className,
  onVariant,
  children,
}: {
  desktop: ShotSize;
  phone: ShotSize;
  breakpoint?: number;
  className?: string;
  /** Told whenever the layout switches, for controls that live outside the frame. */
  onVariant?: (variant: ShotVariant) => void;
  children: (variant: ShotVariant) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const variant: ShotVariant = width !== null && width < breakpoint ? "phone" : "desktop";
  const size = variant === "phone" ? phone : desktop;

  const measured = width !== null;
  useEffect(() => {
    if (measured) onVariant?.(variant);
  }, [variant, measured, onVariant]);

  return (
    <div ref={ref} className={cn("relative w-full overflow-hidden", className)} style={{ aspectRatio: `${size.w} / ${size.h}` }}>
      <div
        className={cn("absolute top-0 left-0 origin-top-left", width === null && "invisible")}
        style={{ width: size.w, height: size.h, transform: `scale(${(width ?? size.w) / size.w})` }}
      >
        {children(variant)}
      </div>
    </div>
  );
}
