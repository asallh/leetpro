import { getRequiredSession } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { RecallMeter } from "@/components/recall-meter";
import { DashboardBars, ShareRow } from "@/components/dashboard-bars";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { estimateRecall, isFading } from "@/lib/recall";
import {
  ACTIVITY_DAYS,
  buildActivitySeries,
  buildDifficultyCounts,
  buildHelpBreakdown,
  buildRecallBands,
  buildResultBreakdown,
  buildReviewForecast,
  buildStatusCounts,
  buildTopicPerformance,
  buildWeeklyPerformance,
  compareWindows,
  computeStreak,
  formatDelta,
  formatMinutes,
  formatPct,
  summarizeAttempts,
} from "@/lib/dashboard-metrics";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format, formatDistanceToNow, subDays } from "date-fns";

export default async function DashboardPage() {
  const session = await getRequiredSession();
  const userId = session.user.id;
  const now = new Date();
  const since90 = subDays(now, 90);
  const since30 = subDays(now, ACTIVITY_DAYS);
  const since14 = subDays(now, 14);
  const since28 = subDays(now, 28);

  const [userProblems, attempts90, recentAttempts, reviewDue, attemptDayRows] =
    await Promise.all([
      prisma.userProblem.findMany({
        where: { userId },
        include: { problem: true },
      }),
      prisma.attempt.findMany({
        where: { userId, date: { gte: since90 } },
        include: { problem: true },
        orderBy: { date: "asc" },
      }),
      prisma.attempt.findMany({
        where: { userId },
        include: { problem: true },
        orderBy: { date: "desc" },
        take: 10,
      }),
      prisma.userProblem.findMany({
        where: {
          userId,
          nextReviewDate: { lte: now },
          status: { not: "mastered" },
        },
        include: { problem: true },
        orderBy: { nextReviewDate: "asc" },
        take: 8,
      }),
      prisma.attempt.findMany({
        where: { userId },
        select: { date: true },
        orderBy: { date: "desc" },
      }),
    ]);

  const attempts30 = attempts90.filter((a) => new Date(a.date) >= since30);
  const attempts14 = attempts90.filter((a) => new Date(a.date) >= since14);
  const attemptsPrev14 = attempts90.filter((a) => {
    const d = new Date(a.date);
    return d >= since28 && d < since14;
  });

  const activity = buildActivitySeries(attempts30, now);
  const weekly = buildWeeklyPerformance(attempts90, now);
  const results = buildResultBreakdown(attempts30);
  const help = buildHelpBreakdown(attempts30);
  const recallBands = buildRecallBands(userProblems, now);
  const statuses = buildStatusCounts(userProblems);
  const byDifficulty = buildDifficultyCounts(userProblems);
  const weakTopics = buildTopicPerformance(attempts90);
  const { forecast, dueNow: totalReviewDue, max: forecastMax } = buildReviewForecast(
    userProblems,
    now
  );
  const streak = computeStreak(attemptDayRows.map((a) => a.date), now);
  const summary = summarizeAttempts(attempts90, attempts30);
  const deltas = compareWindows(attempts14, attemptsPrev14);
  const tracked = userProblems.length;
  const holding = recallBands.find((b) => b.key === "holding")?.count ?? 0;
  const mastered = recallBands.find((b) => b.key === "mastered")?.count ?? 0;
  const weeklyConfMax = Math.max(
    1,
    ...weekly.map((w) => (w.avgConfidence == null ? 0 : w.avgConfidence))
  );
  const weeklyAttemptMax = Math.max(1, ...weekly.map((w) => w.attempts));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-[clamp(1.75rem,3.6vw,2.75rem)] font-bold leading-[1.05] tracking-[-0.04em]">
            {totalReviewDue > 0 ? (
              <>
                <span className="text-due-text">{totalReviewDue}</span>{" "}
                {totalReviewDue === 1 ? "problem is fading" : "problems are fading"}
              </>
            ) : (
              "Nothing is fading"
            )}
          </h1>
          <p className="mt-2 max-w-[60ch] text-muted-foreground">
            {totalReviewDue > 0
              ? `Welcome back, ${session.user.name}. Estimated recall on these has dropped below 70% since you last solved them.`
              : `Welcome back, ${session.user.name}. Everything you've tracked is holding. Solve something new or check the forecast.`}
          </p>
        </div>
        {totalReviewDue > 0 && (
          <Link href="/review" className={cn(buttonVariants({ size: "lg" }), "px-4")}>
            Start review
          </Link>
        )}
      </div>

      <section className="rounded-lg border bg-card">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b px-3 py-2.5">
          <h2 className="text-sm font-semibold">Last 30 days</h2>
          <p className="font-mono text-xs text-muted-foreground">
            {activity.total} attempt{activity.total !== 1 ? "s" : ""} · {activity.activeDays}{" "}
            active day{activity.activeDays !== 1 ? "s" : ""} · streak {streak}
          </p>
        </div>
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-3 border-b p-4 lg:border-b-0 lg:border-r">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-xs font-medium text-muted-foreground">Attempts per day</h3>
              <span className="font-mono text-[10px] text-muted-foreground">
                vs prior 14d {formatDelta(deltas.attemptDelta, 0)}
              </span>
            </div>
            {activity.total === 0 ? (
              <p className="py-8 text-sm text-muted-foreground">
                No attempts in the last 30 days. Solve with the extension installed and the
                series fills in.
              </p>
            ) : (
              <DashboardBars
                heightClass="h-32"
                max={activity.max}
                ariaLabel={activity.series
                  .map((s) => `${format(s.day, "MMM d")}: ${s.count}`)
                  .join(", ")}
                bars={activity.series.map((s, i) => ({
                  key: String(s.day.getTime()),
                  value: s.count,
                  label:
                    i === 0 || i === activity.series.length - 1 || s.day.getDate() === 1
                      ? format(s.day, "d")
                      : "",
                  emphasize: i === activity.series.length - 1,
                  title: `${format(s.day, "EEE MMM d")}: ${s.count} attempt${
                    s.count !== 1 ? "s" : ""
                  }${
                    s.avgConfidence != null
                      ? ` · avg confidence ${s.avgConfidence.toFixed(1)}`
                      : ""
                  }`,
                }))}
              />
            )}
          </div>
          <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2.5 p-4 text-sm content-start">
            <dt className="text-muted-foreground">Avg confidence</dt>
            <dd className="num text-right">
              {summary.avgConfidence == null ? "—" : summary.avgConfidence.toFixed(1)}
              <span className="ml-2 text-xs text-muted-foreground">
                {formatDelta(deltas.confidenceDelta, 1)}
              </span>
            </dd>
            <dt className="text-muted-foreground">Independence</dt>
            <dd className="num text-right">
              {formatPct(summary.independenceRate)}
              <span className="ml-2 text-xs text-muted-foreground">
                {deltas.independenceDelta == null
                  ? "—"
                  : formatDelta(deltas.independenceDelta * 100, 0, "pp")}
              </span>
            </dd>
            <dt className="text-muted-foreground">Avg time / attempt</dt>
            <dd className="num text-right">{formatMinutes(summary.avgTimeMinutes)}</dd>
            <dt className="text-muted-foreground">Time logged (90d)</dt>
            <dd className="num text-right">{formatMinutes(summary.totalTimeMinutes)}</dd>
            <dt className="text-muted-foreground">Tracked · holding</dt>
            <dd className="num text-right">
              {tracked} · {holding}
            </dd>
            <dt className="text-muted-foreground">Mastered</dt>
            <dd className="num text-right">{mastered}</dd>
            <dt className="text-muted-foreground">Practice streak</dt>
            <dd className="num text-right">
              {streak} day{streak !== 1 ? "s" : ""}
            </dd>
          </dl>
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-lg border bg-card">
            <h2 className="border-b px-3 py-2.5 text-sm font-semibold">
              Performance by week
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                last 8 weeks
              </span>
            </h2>
            <div className="grid gap-4 border-b p-4 sm:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-xs text-muted-foreground">Attempts</h3>
                <DashboardBars
                  heightClass="h-24"
                  max={weeklyAttemptMax}
                  ariaLabel={weekly
                    .map((w) => `${w.label}: ${w.attempts} attempts`)
                    .join(", ")}
                  bars={weekly.map((w, i) => ({
                    key: w.label,
                    value: w.attempts,
                    label: format(w.weekStart, "M/d"),
                    topLabel: w.attempts > 0 ? String(w.attempts) : "",
                    emphasize: i === weekly.length - 1,
                  }))}
                />
              </div>
              <div className="space-y-2">
                <h3 className="text-xs text-muted-foreground">Avg confidence (1–5)</h3>
                <DashboardBars
                  heightClass="h-24"
                  max={weeklyConfMax}
                  ariaLabel={weekly
                    .map(
                      (w) =>
                        `${w.label}: ${
                          w.avgConfidence == null ? "none" : w.avgConfidence.toFixed(1)
                        }`
                    )
                    .join(", ")}
                  bars={weekly.map((w, i) => ({
                    key: `c-${w.label}`,
                    value: w.avgConfidence ?? 0,
                    label: format(w.weekStart, "M/d"),
                    topLabel:
                      w.avgConfidence == null ? "" : w.avgConfidence.toFixed(1),
                    emphasize: i === weekly.length - 1,
                    title:
                      w.avgConfidence == null
                        ? `${w.label}: no attempts`
                        : `${w.label}: ${w.avgConfidence.toFixed(1)} avg · ${formatPct(
                            w.independenceRate
                          )} independent`,
                  }))}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Week</TableHead>
                    <TableHead className="text-right">Attempts</TableHead>
                    <TableHead className="text-right">Conf</TableHead>
                    <TableHead className="text-right">Indep.</TableHead>
                    <TableHead className="text-right">Avg time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weekly.every((w) => w.attempts === 0) ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground">
                        Weekly averages appear once you log attempts.
                      </TableCell>
                    </TableRow>
                  ) : (
                    [...weekly].reverse().map((w) => (
                      <TableRow key={w.label}>
                        <TableCell className="font-medium">
                          {format(w.weekStart, "MMM d")}
                        </TableCell>
                        <TableCell className="num text-right">{w.attempts}</TableCell>
                        <TableCell className="num text-right">
                          {w.avgConfidence == null ? "—" : w.avgConfidence.toFixed(1)}
                        </TableCell>
                        <TableCell className="num text-right">
                          {formatPct(w.independenceRate)}
                        </TableCell>
                        <TableCell className="num text-right text-muted-foreground">
                          {formatMinutes(w.avgTimeMinutes)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="rounded-lg border bg-card">
            <h2 className="border-b px-3 py-2.5 text-sm font-semibold">
              Weak topics
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                lowest avg confidence · 90 days · ≥2 attempts
              </span>
            </h2>
            {weakTopics.length === 0 ? (
              <p className="px-3 py-6 text-sm text-muted-foreground">
                Topic strength shows up after a few tagged attempts. Keep logging result and
                confidence.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Topic</TableHead>
                    <TableHead className="w-16 text-right">n</TableHead>
                    <TableHead className="w-16 text-right">Conf</TableHead>
                    <TableHead className="w-20 text-right">Indep.</TableHead>
                    <TableHead className="w-20 text-right">Help</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weakTopics.map((t) => (
                    <TableRow key={t.topic}>
                      <TableCell className="font-medium">{t.topic}</TableCell>
                      <TableCell className="num text-right text-muted-foreground">
                        {t.attempts}
                      </TableCell>
                      <TableCell className="num text-right">
                        {t.avgConfidence.toFixed(1)}
                      </TableCell>
                      <TableCell className="num text-right">
                        {formatPct(t.independenceRate)}
                      </TableCell>
                      <TableCell className="num text-right text-muted-foreground">
                        {formatPct(t.helpRate)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>

          <section className="rounded-lg border bg-card">
            <h2 className="border-b px-3 py-2.5 text-sm font-semibold">Review queue</h2>
            {reviewDue.length === 0 ? (
              <p className="px-3 py-6 text-sm text-muted-foreground">
                No reviews due. Problems show up here when their estimated recall drops below
                70%.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">#</TableHead>
                    <TableHead>Problem</TableHead>
                    <TableHead className="w-12">Diff</TableHead>
                    <TableHead className="w-32">Recall</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviewDue.map((up) => {
                    const r = estimateRecall(up.lastAttemptDate, up.reviewInterval, now);
                    return (
                      <TableRow key={up.id}>
                        <TableCell className="num text-muted-foreground">
                          {up.problem.leetcodeId ?? "—"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {isFading(r) && (
                            <span className="mr-1 font-mono text-due-text">›</span>
                          )}
                          {up.problem.title}
                        </TableCell>
                        <TableCell>
                          <DifficultyBadge difficulty={up.problem.difficulty} />
                        </TableCell>
                        <TableCell>
                          <RecallMeter recall={r} />
                        </TableCell>
                        <TableCell className="text-right">
                          <a
                            href={up.problem.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(buttonVariants({ size: "sm", variant: "ghost" }))}
                          >
                            Open
                          </a>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            {totalReviewDue > reviewDue.length && (
              <div className="border-t px-3 py-2 text-right">
                <Link
                  href="/review"
                  className="font-mono text-xs text-muted-foreground hover:text-foreground"
                >
                  +{totalReviewDue - reviewDue.length} more in the review queue
                </Link>
              </div>
            )}
          </section>

          <section className="rounded-lg border bg-card">
            <h2 className="border-b px-3 py-2.5 text-sm font-semibold">Recent activity</h2>
            {recentAttempts.length === 0 ? (
              <p className="px-3 py-6 text-sm text-muted-foreground">
                No attempts yet. Solve a problem on LeetCode or NeetCode with the extension
                installed and it will appear here.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">When</TableHead>
                    <TableHead>Problem</TableHead>
                    <TableHead className="w-12">Diff</TableHead>
                    <TableHead className="w-24">Result</TableHead>
                    <TableHead className="w-16 text-right">Conf</TableHead>
                    <TableHead className="w-16 text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentAttempts.map((attempt) => (
                    <TableRow key={attempt.id}>
                      <TableCell className="num text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(attempt.date), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="font-medium">{attempt.problem.title}</TableCell>
                      <TableCell>
                        <DifficultyBadge difficulty={attempt.problem.difficulty} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {attempt.result === "solved_independently"
                          ? "Independent"
                          : attempt.result === "solved_with_hint"
                            ? "Hint"
                            : attempt.result === "needed_solution"
                              ? "Solution"
                              : "Stuck"}
                      </TableCell>
                      <TableCell className="num text-right">{attempt.confidence}/5</TableCell>
                      <TableCell className="num text-right text-muted-foreground">
                        {attempt.timeMinutes ? `${attempt.timeMinutes}m` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="space-y-3 rounded-lg border bg-card p-4">
            <h2 className="flex items-baseline justify-between text-sm font-semibold">
              Next 14 days
              <span className="text-xs font-normal text-muted-foreground">reviews / day</span>
            </h2>
            <DashboardBars
              max={forecastMax}
              ariaLabel={forecast
                .map((f) => `${format(f.day, "EEE d")}: ${f.count}`)
                .join(", ")}
              bars={forecast.map((f, i) => ({
                key: String(i),
                value: f.count,
                label: format(f.day, "EEEEE"),
                topLabel: String(f.count),
                emphasize: i === 0,
              }))}
            />
          </section>

          <section className="space-y-3 rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold">Memory health</h2>
            <div className="space-y-3">
              {recallBands.map((b) => (
                <ShareRow
                  key={b.key}
                  label={b.label}
                  count={b.count}
                  share={b.share}
                  emphasize={b.due && b.count > 0}
                />
              ))}
            </div>
          </section>

          <section className="space-y-3 rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold">
              How you solved
              <span className="ml-2 text-xs font-normal text-muted-foreground">30d</span>
            </h2>
            <div className="space-y-3">
              {results.map((r) => (
                <ShareRow
                  key={r.key}
                  label={r.label}
                  count={r.count}
                  share={r.share}
                />
              ))}
            </div>
          </section>

          <section className="space-y-3 rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold">
              Help used
              <span className="ml-2 text-xs font-normal text-muted-foreground">30d</span>
            </h2>
            <div className="space-y-3">
              {help.map((h) => (
                <ShareRow key={h.key} label={h.label} count={h.count} share={h.share} />
              ))}
            </div>
          </section>

          <section className="space-y-3 rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold">Scheduler status</h2>
            <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 text-sm">
              {statuses.map((s) => (
                <div key={s.key} className="contents">
                  <dt
                    className={
                      s.key === "mastered" ? "text-success" : "text-muted-foreground"
                    }
                  >
                    {s.label}
                  </dt>
                  <dd className="num text-right">{s.count}</dd>
                </div>
              ))}
            </dl>
            {tracked > 0 && (
              <>
                <div className="flex h-2 gap-0.5 overflow-hidden rounded-sm" aria-hidden="true">
                  <span className="bg-foreground/25" style={{ flex: byDifficulty.easy }} />
                  <span className="bg-foreground/55" style={{ flex: byDifficulty.medium }} />
                  <span className="bg-foreground" style={{ flex: byDifficulty.hard }} />
                </div>
                <p className="font-mono text-xs text-muted-foreground">
                  E {byDifficulty.easy} · M {byDifficulty.medium} · H {byDifficulty.hard}
                </p>
              </>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

