import { getRequiredSession } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { RecallMeter } from "@/components/recall-meter";
import { buttonVariants } from "@/components/ui/button";
import { buildReviewForecast } from "@/lib/dashboard-metrics";
import { buildMemory, buildProgress, buildTopicMap } from "@/lib/dashboard-insights";
import { recommendNextAction } from "@/lib/recommendations";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format, isToday, subDays } from "date-fns";
import { Suspense } from "react";
import Loading from "../loading";

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <TodayContent />
    </Suspense>
  );
}

async function TodayContent() {
  const session = await getRequiredSession();
  const userId = session.user.id;
  const now = new Date();

  const [userProblems, attempts90, allAttempts] = await Promise.all([
    prisma.userProblem.findMany({ where: { userId }, include: { problem: true } }),
    prisma.attempt.findMany({
      where: { userId, date: { gte: subDays(now, 90) } },
      include: { problem: true },
      orderBy: { date: "asc" },
    }),
    prisma.attempt.findMany({
      where: { userId },
      select: { problemId: true, date: true, confidence: true, timeMinutes: true },
      orderBy: { date: "asc" },
    }),
  ]);

  const rec = recommendNextAction({ userProblems, attempts: attempts90, now });
  const memory = buildMemory(userProblems, now);
  const progress = buildProgress(userProblems, allAttempts, now);
  const topics = buildTopicMap(userProblems, allAttempts, now).filter(
    (t) => t.attempted > 0 && t.avgConfidence != null
  );
  const week = buildReviewForecast(userProblems, now).forecast.slice(0, 7);
  const firstName = session.user.name?.split(" ")[0];

  const tonight = [
    ...rec.reviews.map((r) => ({
      key: r.userProblemId,
      action: "Review" as const,
      title: r.problem.title,
      url: r.problem.url,
      difficulty: r.problem.difficulty,
      recall: r.recall as number | null,
      note: r.problem.topics[0] ?? "",
    })),
    ...rec.newProblems.slice(0, rec.reviews.length > 0 ? 1 : 3).map((n) => ({
      key: n.problem.id,
      action: "Start" as const,
      title: n.problem.title,
      url: n.problem.url,
      difficulty: n.problem.difficulty,
      recall: null,
      note: `${n.topic}. ${n.reason}`,
    })),
  ];

  const byConfidence = [...topics].sort((a, b) => (a.avgConfidence ?? 0) - (b.avgConfidence ?? 0));
  const weakest = byConfidence.slice(0, 3);
  // Never list a topic in both groups: strongest takes from what weakest left.
  const strongest = byConfidence.slice(Math.max(3, byConfidence.length - 3)).reverse();

  return (
    <div className="space-y-14">
      <header>
        <p className="text-lg text-muted-foreground">{firstName ? `Hi ${firstName}.` : "Hi."}</p>
        <h1 className="marker mt-1 max-w-[22ch] text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.08] font-bold tracking-[-0.02em] text-balance">
          {memory.fading > 0 ? (
            <>
              <span className="highlight highlight-draw">
                {memory.fading} {memory.fading === 1 ? "problem is" : "problems are"} fading.
              </span>{" "}
              Review {memory.fading === 1 ? "it" : "them"} first.
            </>
          ) : memory.items.length === 0 ? (
            "Solve your first problem tonight."
          ) : (
            "Nothing is fading. Time for something new."
          )}
        </h1>
        <p className="mt-4 max-w-[60ch] text-lg text-muted-foreground">{rec.detail.replace(/^Nothing is fading\.\s*/, "")}</p>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-12 gap-y-14 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Tonight */}
        <section aria-labelledby="tonight">
          <h2 id="tonight" className="mb-4 text-xl font-semibold">
            Tonight
          </h2>
          {tonight.length === 0 ? (
            <p className="text-muted-foreground">
              You&apos;ve tracked every problem in the catalog. Keep up with reviews as they come due.
            </p>
          ) : (
            <ul className="divide-y rounded-2xl border bg-card shadow-[0_16px_36px_-16px_rgba(0,0,0,0.55)]">
              {tonight.map((t, i) => (
                <li key={t.key} className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 sm:px-6">
                  <div className="min-w-0 flex-1 basis-64">
                    <p className="text-[1.0625rem] font-semibold">
                      <span className={t.action === "Review" ? "highlight" : undefined}>{t.title}</span>
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                      <DifficultyBadge difficulty={t.difficulty} />
                      <span className="truncate">{t.note}</span>
                    </p>
                  </div>
                  {t.recall != null ? (
                    <RecallMeter recall={t.recall} />
                  ) : (
                    <span className="text-sm text-muted-foreground">New problem</span>
                  )}
                  <a
                    href={t.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      buttonVariants({ variant: i === 0 ? "default" : "outline", size: "lg" }),
                      "w-24 rounded-lg"
                    )}
                  >
                    {t.action}
                    <span className="sr-only"> {t.title} on LeetCode</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          {rec.reviewsRemaining > 0 && (
            <Link href="/review" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
              {rec.reviewsRemaining} more {rec.reviewsRemaining === 1 ? "review" : "reviews"} waiting
            </Link>
          )}
        </section>

        {/* This week */}
        <section aria-labelledby="week">
          <h2 id="week" className="mb-1 text-xl font-semibold">
            This week
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">Reviews coming due each day.</p>
          <ol className="grid grid-cols-7 gap-1.5">
            {week.map((d) => {
              const today = isToday(d.day);
              return (
                <li
                  key={d.day.toISOString()}
                  className={cn(
                    "flex flex-col items-center rounded-xl py-3",
                    today ? "bg-card ring-1 ring-border" : ""
                  )}
                  aria-label={`${format(d.day, "EEEE")}: ${d.count} ${d.count === 1 ? "review" : "reviews"}`}
                >
                  <span className={cn("text-xs", today ? "font-semibold text-foreground" : "text-muted-foreground")}>
                    {today ? "Today" : format(d.day, "EEE")}
                  </span>
                  <span
                    className={cn(
                      "marker num mt-1.5 text-2xl font-bold",
                      d.count === 0 && "text-faint",
                      d.count > 0 && today && "highlight"
                    )}
                  >
                    {d.count}
                  </span>
                </li>
              );
            })}
          </ol>
          {memory.items.length > 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              Average recall across your problems is{" "}
              <span className="font-semibold text-foreground">{Math.round((memory.averageRecall ?? 0) * 100)}%</span>.
            </p>
          )}
        </section>

        {/* Progress */}
        <section aria-labelledby="progress">
          <h2 id="progress" className="mb-1 text-xl font-semibold">
            Progress
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            {progress.solved} solved out of {progress.attempted} tried
            {progress.perWeek > 0 ? `, about ${progress.perWeek.toFixed(1)} new problems a week lately` : ""}.
          </p>
          <ul className="space-y-6">
            {progress.lists.map((l) => (
              <li key={l.name}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-semibold">{l.name}</span>
                  <span className="num text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{l.solved}</span> of {l.total}
                  </span>
                </div>
                <div
                  className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-secondary"
                  role="img"
                  aria-label={`${l.solved} of ${l.total} solved, ${l.attempted - l.solved} more tried`}
                >
                  <span className="bg-remembered" style={{ width: `${(l.solved / l.total) * 100}%` }} />
                  <span className="bg-remembered/30" style={{ width: `${((l.attempted - l.solved) / l.total) * 100}%` }} />
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {l.solved >= l.total
                    ? "Finished."
                    : l.finishDate
                      ? `At your pace you'll finish around ${format(l.finishDate, "MMMM d")}.`
                      : "Solve a few new problems to see a finish date."}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Topics */}
        <section aria-labelledby="topics">
          <h2 id="topics" className="mb-1 text-xl font-semibold">
            Topics
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">Average confidence across your attempts, out of 5.</p>
          {topics.length === 0 ? (
            <p className="text-sm text-muted-foreground">Your strongest and weakest topics show up after a few attempts.</p>
          ) : (
            <div className="space-y-6">
              {topics.length > 3 ? (
                <>
                  <TopicGroup title="Needs work" rows={weakest} />
                  <TopicGroup title="Strongest" rows={strongest} />
                </>
              ) : (
                <TopicGroup title="Started so far" rows={weakest} />
              )}
            </div>
          )}
          <Link href="/problem-sets" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">
            See every topic
          </Link>
        </section>
      </div>
    </div>
  );
}

function TopicGroup({
  title,
  rows,
}: {
  title: string;
  rows: { topic: string; avgConfidence: number | null; solved: number; cells: unknown[]; fading: number }[];
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-muted-foreground">{title}</h3>
      <ul className="space-y-2.5">
        {rows.map((t) => (
          <li key={t.topic} className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate">
              <span className={t.fading > 0 ? "highlight" : undefined}>{t.topic}</span>
            </span>
            <span className="num shrink-0 text-sm">
              <span className={cn("font-semibold", (t.avgConfidence ?? 0) < 3 ? "text-destructive" : "text-foreground")}>
                {t.avgConfidence?.toFixed(1)}
              </span>
              <span className="text-muted-foreground">, {t.solved} of {t.cells.length} solved</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
