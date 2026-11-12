import { addDays, format, startOfDay, startOfWeek, subDays } from "date-fns";
import { DUE_RECALL, estimateRecall } from "@/lib/recall";

export const ACTIVITY_DAYS = 30;
export const FORECAST_DAYS = 14;
export const WEEK_COUNT = 8;

export type AttemptLike = {
  date: Date;
  confidence: number;
  timeMinutes: number | null;
  result: "solved_independently" | "solved_with_hint" | "needed_solution" | "could_not_solve";
  helpUsed: "none" | "hint" | "solution" | "discussion";
  problem: {
    title: string;
    difficulty: "easy" | "medium" | "hard";
    topics: string[];
    leetcodeId: number | null;
    url: string;
  };
};

export type UserProblemLike = {
  id: string;
  status: "new_problem" | "learning" | "review" | "mastered";
  totalAttempts: number;
  lastAttemptDate: Date | null;
  bestConfidence: number | null;
  nextReviewDate: Date | null;
  reviewInterval: number;
  problem: {
    title: string;
    difficulty: "easy" | "medium" | "hard";
    topics: string[];
    leetcodeId: number | null;
    url: string;
  };
};

export const RESULT_LABELS: Record<AttemptLike["result"], string> = {
  solved_independently: "Independent",
  solved_with_hint: "With hint",
  needed_solution: "Needed solution",
  could_not_solve: "Could not solve",
};

export const HELP_LABELS: Record<AttemptLike["helpUsed"], string> = {
  none: "No help",
  hint: "Hint",
  solution: "Solution",
  discussion: "Discussion",
};

export const STATUS_LABELS: Record<UserProblemLike["status"], string> = {
  new_problem: "new",
  learning: "learning",
  review: "review",
  mastered: "mastered",
};

function dayKey(d: Date): number {
  return startOfDay(d).getTime();
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function pct(part: number, whole: number): number | null {
  if (whole === 0) return null;
  return part / whole;
}

export function computeStreak(attemptDates: Date[], now: Date = new Date()): number {
  const days = new Set(attemptDates.map(dayKey));
  const check = startOfDay(now);
  if (!days.has(check.getTime())) check.setDate(check.getDate() - 1);
  let streak = 0;
  while (days.has(check.getTime())) {
    streak++;
    check.setDate(check.getDate() - 1);
  }
  return streak;
}

export function buildActivitySeries(
  attempts: AttemptLike[],
  now: Date = new Date(),
  days: number = ACTIVITY_DAYS
) {
  const today = startOfDay(now);
  const start = subDays(today, days - 1);
  const byDay = new Map<number, { count: number; confidences: number[] }>();

  for (let i = 0; i < days; i++) {
    byDay.set(addDays(start, i).getTime(), { count: 0, confidences: [] });
  }

  for (const a of attempts) {
    const key = dayKey(new Date(a.date));
    const bucket = byDay.get(key);
    if (!bucket) continue;
    bucket.count++;
    bucket.confidences.push(a.confidence);
  }

  const series = Array.from(byDay.entries()).map(([t, v]) => ({
    day: new Date(t),
    count: v.count,
    avgConfidence: avg(v.confidences),
  }));

  return {
    series,
    max: Math.max(1, ...series.map((s) => s.count)),
    total: series.reduce((n, s) => n + s.count, 0),
    activeDays: series.filter((s) => s.count > 0).length,
  };
}

export function buildWeeklyPerformance(
  attempts: AttemptLike[],
  now: Date = new Date(),
  weeks: number = WEEK_COUNT
) {
  const thisWeek = startOfWeek(now, { weekStartsOn: 1 });
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const weekStart = subDays(thisWeek, (weeks - 1 - i) * 7);
    return {
      weekStart,
      label: format(weekStart, "MMM d"),
      attempts: 0,
      confidences: [] as number[],
      independent: 0,
      times: [] as number[],
    };
  });

  for (const a of attempts) {
    const d = startOfDay(new Date(a.date));
    const idx = buckets.findIndex((b, i) => {
      const next = i < buckets.length - 1 ? buckets[i + 1].weekStart : addDays(thisWeek, 7);
      return d >= b.weekStart && d < next;
    });
    if (idx < 0) continue;
    const b = buckets[idx];
    b.attempts++;
    b.confidences.push(a.confidence);
    if (a.result === "solved_independently") b.independent++;
    if (a.timeMinutes != null) b.times.push(a.timeMinutes);
  }

  return buckets.map((b) => ({
    weekStart: b.weekStart,
    label: b.label,
    attempts: b.attempts,
    avgConfidence: avg(b.confidences),
    independenceRate: pct(b.independent, b.attempts),
    avgTimeMinutes: avg(b.times),
  }));
}

export function buildResultBreakdown(attempts: AttemptLike[]) {
  const counts: Record<AttemptLike["result"], number> = {
    solved_independently: 0,
    solved_with_hint: 0,
    needed_solution: 0,
    could_not_solve: 0,
  };
  for (const a of attempts) counts[a.result]++;
  const total = attempts.length;
  return (Object.keys(counts) as AttemptLike["result"][]).map((key) => ({
    key,
    label: RESULT_LABELS[key],
    count: counts[key],
    share: pct(counts[key], total),
  }));
}

export function buildHelpBreakdown(attempts: AttemptLike[]) {
  const counts: Record<AttemptLike["helpUsed"], number> = {
    none: 0,
    hint: 0,
    solution: 0,
    discussion: 0,
  };
  for (const a of attempts) counts[a.helpUsed]++;
  const total = attempts.length;
  return (Object.keys(counts) as AttemptLike["helpUsed"][]).map((key) => ({
    key,
    label: HELP_LABELS[key],
    count: counts[key],
    share: pct(counts[key], total),
  }));
}

export function buildRecallBands(userProblems: UserProblemLike[], now: Date = new Date()) {
  const bands = {
    fading: 0,
    soft: 0,
    holding: 0,
    mastered: 0,
    unknown: 0,
  };

  for (const up of userProblems) {
    if (up.status === "mastered") {
      bands.mastered++;
      continue;
    }
    const r = estimateRecall(up.lastAttemptDate, up.reviewInterval, now);
    if (r === null) bands.unknown++;
    else if (r < DUE_RECALL) bands.fading++;
    else if (r < 0.9) bands.soft++;
    else bands.holding++;
  }

  const tracked = userProblems.length;
  return [
    { key: "fading", label: "Fading (<70%)", count: bands.fading, due: true },
    { key: "soft", label: "Soft (70–90%)", count: bands.soft, due: false },
    { key: "holding", label: "Holding (≥90%)", count: bands.holding, due: false },
    { key: "mastered", label: "Mastered", count: bands.mastered, due: false },
    { key: "unknown", label: "No attempt yet", count: bands.unknown, due: false },
  ].map((b) => ({ ...b, share: pct(b.count, tracked) }));
}

export function buildStatusCounts(userProblems: UserProblemLike[]) {
  const counts: Record<UserProblemLike["status"], number> = {
    new_problem: 0,
    learning: 0,
    review: 0,
    mastered: 0,
  };
  for (const up of userProblems) counts[up.status]++;
  const total = userProblems.length;
  return (Object.keys(counts) as UserProblemLike["status"][]).map((key) => ({
    key,
    label: STATUS_LABELS[key],
    count: counts[key],
    share: pct(counts[key], total),
  }));
}

export function buildDifficultyCounts(userProblems: UserProblemLike[]) {
  const counts = { easy: 0, medium: 0, hard: 0 };
  for (const up of userProblems) counts[up.problem.difficulty]++;
  return counts;
}

export function buildTopicPerformance(attempts: AttemptLike[], limit = 8) {
  const map = new Map<
    string,
    { attempts: number; confidences: number[]; independent: number; help: number }
  >();

  for (const a of attempts) {
    const topics = a.problem.topics.length > 0 ? a.problem.topics : ["Uncategorized"];
    for (const topic of topics) {
      const row = map.get(topic) ?? {
        attempts: 0,
        confidences: [],
        independent: 0,
        help: 0,
      };
      row.attempts++;
      row.confidences.push(a.confidence);
      if (a.result === "solved_independently") row.independent++;
      if (a.helpUsed !== "none") row.help++;
      map.set(topic, row);
    }
  }

  return Array.from(map.entries())
    .map(([topic, v]) => ({
      topic,
      attempts: v.attempts,
      avgConfidence: avg(v.confidences) ?? 0,
      independenceRate: pct(v.independent, v.attempts) ?? 0,
      helpRate: pct(v.help, v.attempts) ?? 0,
    }))
    .filter((t) => t.attempts >= 2)
    .sort((a, b) => a.avgConfidence - b.avgConfidence || b.helpRate - a.helpRate)
    .slice(0, limit);
}

export function buildReviewForecast(userProblems: UserProblemLike[], now: Date = new Date()) {
  const today = startOfDay(now);
  const forecast = Array.from({ length: FORECAST_DAYS }, (_, i) => ({
    day: addDays(today, i),
    count: 0,
  }));
  let dueNow = 0;

  for (const up of userProblems) {
    if (!up.nextReviewDate || up.status === "mastered") continue;
    const idx = Math.max(
      0,
      Math.round((startOfDay(up.nextReviewDate).getTime() - today.getTime()) / 86_400_000)
    );
    if (up.nextReviewDate <= now) dueNow++;
    if (idx < FORECAST_DAYS) forecast[idx].count++;
  }

  return {
    forecast,
    dueNow,
    max: Math.max(1, ...forecast.map((f) => f.count)),
  };
}

export function summarizeAttempts(attempts: AttemptLike[], windowAttempts: AttemptLike[]) {
  const times = attempts.map((a) => a.timeMinutes).filter((t): t is number => t != null);
  const windowConf = windowAttempts.map((a) => a.confidence);
  const windowIndependent = windowAttempts.filter(
    (a) => a.result === "solved_independently"
  ).length;
  const windowTimes = windowAttempts
    .map((a) => a.timeMinutes)
    .filter((t): t is number => t != null);

  return {
    totalAttempts: attempts.length,
    windowAttempts: windowAttempts.length,
    avgConfidence: avg(windowConf),
    independenceRate: pct(windowIndependent, windowAttempts.length),
    totalTimeMinutes: times.reduce((a, b) => a + b, 0),
    avgTimeMinutes: avg(windowTimes),
  };
}

export function compareWindows(current: AttemptLike[], previous: AttemptLike[]) {
  const curConf = avg(current.map((a) => a.confidence));
  const prevConf = avg(previous.map((a) => a.confidence));
  const curInd = pct(
    current.filter((a) => a.result === "solved_independently").length,
    current.length
  );
  const prevInd = pct(
    previous.filter((a) => a.result === "solved_independently").length,
    previous.length
  );

  return {
    confidenceDelta:
      curConf != null && prevConf != null ? curConf - prevConf : null,
    independenceDelta:
      curInd != null && prevInd != null ? curInd - prevInd : null,
    attemptDelta: current.length - previous.length,
  };
}

export function formatDelta(value: number | null, digits = 1, suffix = ""): string {
  if (value === null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}${suffix}`;
}

export function formatPct(value: number | null): string {
  if (value === null) return "—";
  return `${Math.round(value * 100)}%`;
}

export function formatMinutes(value: number | null): string {
  if (value === null) return "—";
  if (value >= 60) {
    const h = Math.floor(value / 60);
    const m = Math.round(value % 60);
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  return `${Math.round(value)}m`;
}
