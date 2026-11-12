import { getRequiredSession } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { RecallMeter } from "@/components/recall-meter";
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
import { cn } from "cn";
import Link from "next/link";
import { addDays, format, formatDistanceToNow, startOfDay } from "date-fns";

const FORECAST_DAYS = 14;

export default async function DashboardPage() {
  const session = await getRequiredSession();
  const userId = session.user.id;

  const [userProblems, recentAttempts, reviewDue] = await Promise.all([
    prisma.userProblem.findMany({
      where: { userId },
      include: { problem: true },
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
        nextReviewDate: { lte: new Date() },
        status: { not: "mastered" },
      },
      include: { problem: true },
      orderBy: { nextReviewDate: "asc" },
      take: 8,
    }),
  ]);

  const now = new Date();
  const byDifficulty = { easy: 0, medium: 0, hard: 0 };
  let holding = 0;
  let mastered = 0;
  for (const up of userProblems) {
    byDifficulty[up.problem.difficulty]++;
    if (up.status === "mastered") mastered++;
    const r = estimateRecall(up.lastAttemptDate, up.reviewInterval, now);
    if (r !== null && r >= 0.9) holding++;
  }

  const attemptDates = new Set(
    recentAttempts.map((a) => startOfDay(new Date(a.date)).getTime())
  );
  let streak = 0;
  const check = startOfDay(now);
  if (!attemptDates.has(check.getTime())) check.setDate(check.getDate() - 1);
  while (attemptDates.has(check.getTime())) {
    streak++;
    check.setDate(check.getDate() - 1);
  }

  // Reviews due per day for the next two weeks; overdue work counts toward today.
  const today = startOfDay(now);
  const forecast = Array.from({ length: FORECAST_DAYS }, (_, i) => ({
    day: addDays(today, i),
    count: 0,
  }));
  let totalReviewDue = 0;
  for (const up of userProblems) {
    if (!up.nextReviewDate || up.status === "mastered") continue;
    const idx = Math.max(
      0,
      Math.round((startOfDay(up.nextReviewDate).getTime() - today.getTime()) / 86_400_000)
    );
    if (up.nextReviewDate <= now) totalReviewDue++;
    if (idx < FORECAST_DAYS) forecast[idx].count++;
  }
  const forecastMax = Math.max(1, ...forecast.map((f) => f.count));
  const tracked = userProblems.length;

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

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-lg border bg-card">
            <h2 className="border-b px-3 py-2.5 text-sm font-semibold">Review queue</h2>
            {reviewDue.length === 0 ? (
              <p className="px-3 py-6 text-sm text-muted-foreground">
                No reviews due. Problems show up here when their estimated recall drops below 70%.
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
                          {isFading(r) && <span className="mr-1 font-mono text-due-text">›</span>}
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
                <Link href="/review" className="font-mono text-xs text-muted-foreground hover:text-foreground">
                  +{totalReviewDue - reviewDue.length} more in the review queue
                </Link>
              </div>
            )}
          </section>

          <section className="rounded-lg border bg-card">
            <h2 className="border-b px-3 py-2.5 text-sm font-semibold">Recent activity</h2>
            {recentAttempts.length === 0 ? (
              <p className="px-3 py-6 text-sm text-muted-foreground">
                No attempts yet. Solve a problem on LeetCode or NeetCode with the extension installed and it will appear here.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">When</TableHead>
                    <TableHead>Problem</TableHead>
                    <TableHead className="w-12">Diff</TableHead>
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
              <span className="text-xs font-normal text-muted-foreground">reviews per day</span>
            </h2>
            <div
              className="grid h-28 grid-cols-14 items-end gap-1"
              role="img"
              aria-label={forecast.map((f) => `${format(f.day, "EEE d")}: ${f.count}`).join(", ")}
            >
              {forecast.map((f, i) => (
                <div key={i} className="grid h-full grid-rows-[auto_1fr_auto] gap-1 text-center">
                  <span className={cn("num self-end text-[10px]", i === 0 ? "font-bold text-foreground" : "text-muted-foreground")}>
                    {f.count}
                  </span>
                  <span
                    className={cn(
                      "min-h-0.5 self-end rounded-t-[2px]",
                      i === 0 ? "bg-due" : "bg-foreground/25"
                    )}
                    style={{ height: `${(f.count / forecastMax) * 100}%` }}
                  />
                  <span className={cn("num text-[9.5px]", i === 0 ? "font-bold text-foreground" : "text-muted-foreground")}>
                    {format(f.day, "EEEEE")}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3 rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold">Your memory</h2>
            <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Problems tracked</dt>
              <dd className="num text-right">{tracked}</dd>
              <dt className="text-muted-foreground">Holding above 90%</dt>
              <dd className="num text-right">{holding}</dd>
              <dt className="text-muted-foreground">Mastered</dt>
              <dd className="num text-right">{mastered}</dd>
              <dt className="text-muted-foreground">Practice streak</dt>
              <dd className="num text-right">
                {streak} day{streak !== 1 ? "s" : ""}
              </dd>
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
