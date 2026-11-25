import { addDays, differenceInCalendarDays, startOfDay, startOfWeek, subDays } from "date-fns";
import { estimateRecall, isFading } from "@/lib/recall";
import { SOLVED_CONFIDENCE, topicOf } from "@/lib/dashboard-insights";

/**
 * Mastery and struggle findings for the Today page: where each tracked problem
 * stands, how each difficulty and topic is going, which problems keep beating
 * you, and whether your attempts are getting better week over week.
 */

export type Result = "solved_independently" | "solved_with_hint" | "needed_solution" | "could_not_solve";
type Difficulty = "easy" | "medium" | "hard";

export type MasteryProblem = {
  id: string;
  problemId: string;
  status: "new_problem" | "learning" | "review" | "mastered";
  totalAttempts: number;
  bestConfidence: number | null;
  lastAttemptDate: Date | null;
  reviewInterval: number;
  problem: { title: string; slug: string; difficulty: Difficulty; leetcodeId: number | null; topics: string[] };
};

export type MasteryAttempt = { problemId: string; date: Date; confidence: number; result: Result };

const UNAIDED: Result = "solved_independently";
const FAILED = new Set<Result>(["needed_solution", "could_not_solve"]);

function share(part: number, whole: number): number | null {
  return whole === 0 ? null : part / whole;
}
function avg(nums: number[]): number | null {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}
export function pctText(v: number | null): string {
  return v == null ? "no data" : `${Math.round(v * 100)}%`;
}

/* ------------------------------------------------------------------ Stages */

export type Stage = "mastered" | "holding" | "learning" | "fading";

export const STAGE_ORDER: Stage[] = ["mastered", "holding", "learning", "fading"];

export const STAGE_LABELS: Record<Stage, string> = {
  mastered: "Mastered",
  holding: "Solved and holding",
  learning: "Still learning",
  fading: "Fading",
};

/**
 * One stage per tracked problem. Fading wins over everything (a mastered problem
 * you've forgotten needs review); then mastered by schedule status; then solved
 * at confidence 3+; everything else you've tried is still learning.
 */
export function stageOf(p: MasteryProblem, now: Date): Stage | null {
  if (p.totalAttempts === 0 && !p.lastAttemptDate) return null;
  if (isFading(estimateRecall(p.lastAttemptDate, p.reviewInterval, now))) return "fading";
  if (p.status === "mastered") return "mastered";
  if ((p.bestConfidence ?? 0) >= SOLVED_CONFIDENCE) return "holding";
  return "learning";
}

export function buildStages(tracked: MasteryProblem[], now: Date) {
  const counts: Record<Stage, number> = { mastered: 0, holding: 0, learning: 0, fading: 0 };
  for (const p of tracked) {
    const s = stageOf(p, now);
    if (s) counts[s]++;
  }
  const total = STAGE_ORDER.reduce((n, s) => n + counts[s], 0);
  return { counts, total, sentence: stageSentence(counts, total) };
}

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

export function stageSentence(c: Record<Stage, number>, total: number): string {
  if (total === 0) return "Log a few attempts and this shows how much of what you've solved has stuck.";
  const strong = c.mastered + c.holding;
  const lead =
    c.mastered > 0
      ? `You've mastered ${c.mastered} of ${plural(total, "problem")}`
      : `You've solved ${strong} of ${plural(total, "problem")} with confidence`;
  const rest: string[] = [];
  if (c.mastered > 0 && c.holding > 0)
    rest.push(`${c.holding} more ${c.holding === 1 ? "is" : "are"} solved and holding`);
  if (c.learning > 0) rest.push(`${c.learning} ${c.learning === 1 ? "is" : "are"} still shaky`);
  if (c.fading > 0) rest.push(`${c.fading} ${c.fading === 1 ? "is" : "are"} fading`);
  if (rest.length === 0) return `${lead}.`;
  const tail = rest.length === 1 ? rest[0] : `${rest.slice(0, -1).join(", ")} and ${rest[rest.length - 1]}`;
  return `${lead}. ${tail[0].toUpperCase()}${tail.slice(1)}.`;
}

/* -------------------------------------------------------------- Difficulty */

export type DifficultyRow = {
  difficulty: Difficulty;
  tried: number;
  solved: number;
  attempts: number;
  unaidedRate: number | null;
  avgConfidence: number | null;
};

export function buildDifficulty(tracked: MasteryProblem[], attempts: MasteryAttempt[]): DifficultyRow[] {
  const diffOf = new Map(tracked.map((t) => [t.problemId, t.problem.difficulty]));
  return (["easy", "medium", "hard"] as const).map((d) => {
    const ps = tracked.filter((t) => t.problem.difficulty === d && t.totalAttempts > 0);
    const as = attempts.filter((a) => diffOf.get(a.problemId) === d);
    return {
      difficulty: d,
      tried: ps.length,
      solved: ps.filter((p) => (p.bestConfidence ?? 0) >= SOLVED_CONFIDENCE).length,
      attempts: as.length,
      unaidedRate: share(as.filter((a) => a.result === UNAIDED).length, as.length),
      avgConfidence: avg(as.map((a) => a.confidence)),
    };
  });
}

/* ------------------------------------------------------------------ Topics */

export type TopicStats = { attempts: number; unaidedRate: number | null; failedRate: number | null };

/** Attempt outcomes per roadmap topic, keyed the same way buildTopicMap keys rows. */
export function buildTopicStats(tracked: MasteryProblem[], attempts: MasteryAttempt[]): Map<string, TopicStats> {
  const topicByProblem = new Map(tracked.map((t) => [t.problemId, topicOf(t.problem)]));
  const raw = new Map<string, { n: number; unaided: number; failed: number }>();
  for (const a of attempts) {
    const topic = topicByProblem.get(a.problemId);
    if (!topic) continue;
    const r = raw.get(topic) ?? { n: 0, unaided: 0, failed: 0 };
    r.n++;
    if (a.result === UNAIDED) r.unaided++;
    if (FAILED.has(a.result)) r.failed++;
    raw.set(topic, r);
  }
  return new Map(
    [...raw].map(([k, r]) => [
      k,
      { attempts: r.n, unaidedRate: share(r.unaided, r.n), failedRate: share(r.failed, r.n) },
    ]),
  );
}

/**
 * Lower is worse. Fading problems, low confidence and needing the solution all
 * push a topic up the struggle list; topics with few attempts are damped so one
 * bad night doesn't top the list.
 */
export function struggleScore(row: { avgConfidence: number | null; fading: number }, stats: TopicStats | undefined) {
  const conf = row.avgConfidence ?? 3;
  const failed = stats?.failedRate ?? 0;
  const weight = Math.min(1, (stats?.attempts ?? 0) / 3);
  return conf - weight * (failed * 2 + Math.min(row.fading, 3) * 0.3);
}

export function topicStruggleSentence(
  row: { topic: string; avgConfidence: number | null; fading: number } | undefined,
  stats: TopicStats | undefined,
): string {
  if (!row || row.avgConfidence == null) return "Your weakest topic shows up once you've logged a few attempts.";
  const parts = [`average confidence ${row.avgConfidence.toFixed(1)} out of 5`];
  if (stats && stats.failedRate != null && stats.failedRate > 0) {
    const failed = Math.round(stats.failedRate * stats.attempts);
    parts.push(`you needed the solution or got stuck on ${failed} of ${plural(stats.attempts, "attempt")}`);
  }
  if (row.fading > 0) parts.push(`${plural(row.fading, "problem")} fading`);
  return `${row.topic} needs the most work: ${parts.join(", ")}.`;
}

/* ------------------------------------------------------------ Stuck problems */

export type StuckProblem = {
  id: string;
  title: string;
  slug: string;
  difficulty: Difficulty;
  reason: string;
  score: number;
};

/**
 * Problems that keep beating you: the last attempt failed, or you've tried it
 * twice or more without reaching confidence 3. Most recent failures with the most
 * tries come first.
 */
export function buildStuckProblems(tracked: MasteryProblem[], attempts: MasteryAttempt[], limit = 5): StuckProblem[] {
  const byProblem = new Map<string, MasteryAttempt[]>();
  for (const a of attempts) {
    const list = byProblem.get(a.problemId);
    if (list) list.push(a);
    else byProblem.set(a.problemId, [a]);
  }

  const out: StuckProblem[] = [];
  for (const t of tracked) {
    const as = (byProblem.get(t.problemId) ?? []).sort((a, b) => +new Date(a.date) - +new Date(b.date));
    if (as.length === 0) continue;
    const last = as[as.length - 1];
    const failed = as.filter((a) => FAILED.has(a.result)).length;
    const best = t.bestConfidence ?? Math.max(...as.map((a) => a.confidence));
    const lastFailed = FAILED.has(last.result);
    const stuck = lastFailed || (as.length >= 2 && best < SOLVED_CONFIDENCE);
    if (!stuck) continue;

    let reason: string;
    if (failed >= 2) reason = `Needed the solution or got stuck on ${failed} of ${as.length} tries`;
    else if (last.result === "could_not_solve") reason = "Couldn't solve it last time";
    else if (last.result === "needed_solution") reason = "Needed the solution last time";
    else reason = `Best confidence is ${best} after ${as.length} tries`;

    out.push({
      id: t.id,
      title: t.problem.title,
      slug: t.problem.slug,
      difficulty: t.problem.difficulty,
      reason,
      score: failed * 2 + as.length + (lastFailed ? 2 : 0) + (SOLVED_CONFIDENCE - Math.min(best, SOLVED_CONFIDENCE)),
    });
  }
  return out.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, limit);
}

/* ------------------------------------------------------------------- Trend */

export type TrendWeek = { weekStart: Date; attempts: number; avgConfidence: number | null; unaidedRate: number | null };

export function buildTrend(attempts: MasteryAttempt[], now: Date, weeks = 8) {
  const thisWeek = startOfWeek(now, { weekStartsOn: 1 });
  const buckets = Array.from({ length: weeks }, (_, i) => ({
    weekStart: subDays(thisWeek, (weeks - 1 - i) * 7),
    conf: [] as number[],
    unaided: 0,
  }));
  const first = buckets[0].weekStart.getTime();
  const end = addDays(thisWeek, 7).getTime();
  for (const a of attempts) {
    const t = startOfDay(new Date(a.date)).getTime();
    if (t < first || t >= end) continue;
    // Count calendar days, not milliseconds: a week that crosses a DST change is an hour short or long.
    const b = buckets[Math.floor(differenceInCalendarDays(t, first) / 7)];
    if (!b) continue;
    b.conf.push(a.confidence);
    if (a.result === UNAIDED) b.unaided++;
  }
  const series: TrendWeek[] = buckets.map((b) => ({
    weekStart: b.weekStart,
    attempts: b.conf.length,
    avgConfidence: avg(b.conf),
    unaidedRate: share(b.unaided, b.conf.length),
  }));

  const half = Math.floor(weeks / 2);
  const pool = (ws: TrendWeek[]) => {
    const n = ws.reduce((s, w) => s + w.attempts, 0);
    const conf = n ? ws.reduce((s, w) => s + (w.avgConfidence ?? 0) * w.attempts, 0) / n : null;
    const un = n ? ws.reduce((s, w) => s + (w.unaidedRate ?? 0) * w.attempts, 0) / n : null;
    return { n, conf, un };
  };
  const prev = pool(series.slice(0, half));
  const cur = pool(series.slice(half));
  return { series, sentence: trendSentence(prev, cur, half) };
}

export function trendSentence(
  prev: { n: number; conf: number | null; un: number | null },
  cur: { n: number; conf: number | null; un: number | null },
  weeks: number,
): string {
  if (cur.n === 0 && prev.n === 0) return "No attempts in the last two months yet.";
  if (cur.n === 0) return `You haven't logged an attempt in ${weeks} weeks.`;
  if (prev.n < 3 || cur.n < 3 || prev.conf == null || cur.conf == null)
    return `You've logged ${plural(cur.n, "attempt")} in the last ${weeks} weeks. A trend shows once both halves have a few.`;
  const d = cur.conf - prev.conf;
  const du = (cur.un ?? 0) - (prev.un ?? 0);
  const confPart =
    Math.abs(d) < 0.25
      ? `Confidence is steady at ${cur.conf.toFixed(1)}`
      : `Confidence is ${d > 0 ? "up" : "down"} from ${prev.conf.toFixed(1)} to ${cur.conf.toFixed(1)}`;
  const unPart =
    Math.abs(du) < 0.05
      ? `you solve about ${pctText(cur.un)} without help`
      : `you solve ${pctText(cur.un)} without help, ${du > 0 ? "up" : "down"} from ${pctText(prev.un)}`;
  return `${confPart} over the last ${weeks} weeks, and ${unPart}.`;
}

/* ---------------------------------------------------------------- Activity */

export type ActivityDay = { day: Date; count: number };

/** Attempts per calendar day for the last `days` days, oldest first, plus the current streak. */
export function buildActivity(dates: Date[], now: Date, days = 28) {
  const today = startOfDay(now);
  const counts = new Map<number, number>();
  for (const d of dates) {
    const k = startOfDay(new Date(d)).getTime();
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const series: ActivityDay[] = Array.from({ length: days }, (_, i) => {
    const day = subDays(today, days - 1 - i);
    return { day, count: counts.get(day.getTime()) ?? 0 };
  });
  // A streak survives until the end of today: count back from yesterday if today is empty.
  let streak = 0;
  let cursor = counts.has(today.getTime()) ? today : subDays(today, 1);
  while (counts.has(cursor.getTime())) {
    streak++;
    cursor = subDays(cursor, 1);
  }
  return {
    series,
    streak,
    activeDays: series.filter((d) => d.count > 0).length,
    total: series.reduce((n, d) => n + d.count, 0),
  };
}
