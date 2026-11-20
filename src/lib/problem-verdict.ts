import { differenceInCalendarDays, format, formatDistanceStrict } from "date-fns";

export type VerdictInput = {
  status: string;
  totalAttempts: number;
  nextReviewDate: Date | null;
} | null;

/**
 * The one-sentence status under a problem's title: estimated recall, then when the
 * next review is. Calendar days are counted in the timezone of whoever calls it, so
 * call it in the browser for the viewer's own "today" and "tomorrow".
 */
export function buildVerdict(up: VerdictInput, recall: number | null, now: Date): string {
  if (!up || recall == null) return "You haven't logged an attempt on this one yet.";
  const r = `Recall is about ${Math.round(recall * 100)}%.`;
  if (!up.nextReviewDate) return r;
  const due = new Date(up.nextReviewDate);
  if (due <= now) {
    return `${r} It came due ${formatDistanceStrict(due, now, { addSuffix: true })}, so solve it again before it slips further.`;
  }
  const days = differenceInCalendarDays(due, now);
  const when = days <= 1 ? (days === 0 ? "later today" : "tomorrow") : `on ${format(due, "MMM d")}, in ${days} days`;
  const mastered = up.status === "mastered" ? ` Mastered after ${up.totalAttempts} tries.` : "";
  return `${r} The next review is ${when}.${mastered}`;
}
