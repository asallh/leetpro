"use client";

import { format } from "date-fns";
import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * False during the server render and hydration, true once running in the browser.
 * Render something timezone-free while it is false (so server and hydration output
 * match), then the viewer's local value once it is true.
 */
export function useIsClient() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

/** The same instant shifted so date-fns' local formatting prints its UTC wall time. */
export function asUtcWallTime(d: Date): Date {
  return new Date(d.getTime() + d.getTimezoneOffset() * 60_000);
}

/** A date formatted in the viewer's timezone (UTC until hydration, identical on server and client). */
export function LocalDate({ date, pattern, className }: { date: Date | string; pattern: string; className?: string }) {
  const isClient = useIsClient();
  const d = new Date(date);
  return (
    <time dateTime={d.toISOString()} className={className}>
      {format(isClient ? d : asUtcWallTime(d), pattern)}
    </time>
  );
}
