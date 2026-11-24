import { getRequiredSession } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { ListRings } from "@/components/list-rings";
import { RecallMeter } from "@/components/recall-meter";
import { TopicWheel } from "@/components/topic-wheel";
import { buttonVariants } from "@/components/ui/button";
import { RESULT_LABELS, buildReviewForecast, formatMinutes } from "@/lib/dashboard-metrics";
import { buildMemory, buildProgress, buildTopicMap, type TopicRow } from "@/lib/dashboard-insights";
import {
  STAGE_LABELS,
  STAGE_ORDER,
  buildActivity,
  buildDifficulty,
  buildStages,
  buildStuckProblems,
  buildTopicStats,
  buildTrend,
  pctText,
  struggleScore,
  topicStruggleSentence,
  type Stage,
  type TopicStats,
} from "@/lib/dashboard-mastery";
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

const STAGE_FILL: Record<Stage, string> = {
  mastered: "bg-remembered",
  holding: "bg-remembered/45",
  learning: "bg-muted-foreground/35",
  fading: "bg-highlight",
};

const TOPIC_SHORT: Record<string, string> = {
  "Arrays & Hashing": "Arrays",
  "Two Pointers": "Two pointers",
  "Sliding Window": "Sliding window",
  "Binary Search": "Binary search",
  "Linked List": "Linked list",
  "Heap / Priority Queue": "Heap",
  "Advanced Graphs": "Adv. graphs",
  "1-D Dynamic Programming": "1-D DP",
  "2-D Dynamic Programming": "2-D DP",
  "Math & Geometry": "Math",
  "Bit Manipulation": "Bits",
};

const CELL_FILL: Record<TopicRow["cells"][number]["state"], string> = {
  solved: "bg-remembered",
  attempted: "bg-remembered/30",
  fading: "bg-highlight",
  untouched: "bg-secondary",
};

const CELL_WORD: Record<TopicRow["cells"][number]["state"], string> = {
  solved: "solved",
  attempted: "tried, not solved yet",
  fading: "fading",
  untouched: "not tried",
};

async function TodayContent() {
  const session = await getRequiredSession();
  const userId = session.user.id;
  const now = new Date();

  const [userProblems, attempts90, allAttempts, recentAttempts] = await Promise.all([
    prisma.userProblem.findMany({
      where: { userId },
      include: { problem: true },
    }),
    prisma.attempt.findMany({
      where: { userId, date: { gte: subDays(now, 90) } },
      include: { problem: true },
      orderBy: { date: "asc" },
    }),
    prisma.attempt.findMany({
      where: { userId },
      select: {
        problemId: true,
        date: true,
        confidence: true,
        timeMinutes: true,
        result: true,
      },
      orderBy: { date: "asc" },
    }),
    prisma.attempt.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 8,
      select: {
        id: true,
        date: true,
        result: true,
        confidence: true,
        timeMinutes: true,
        problem: { select: { title: true, slug: true, difficulty: true } },
      },
    }),
  ]);

  const rec = recommendNextAction({ userProblems, attempts: attempts90, now });
  const memory = buildMemory(userProblems, now);
  const progress = buildProgress(userProblems, allAttempts, now);
  const topicMap = buildTopicMap(userProblems, allAttempts, now);
  const week = buildReviewForecast(userProblems, now).forecast.slice(0, 7);
  const stages = buildStages(userProblems, now);
  const difficulty = buildDifficulty(userProblems, allAttempts);
  const topicStats = buildTopicStats(userProblems, allAttempts);
  const stuck = buildStuckProblems(userProblems, allAttempts);
  const trend = buildTrend(allAttempts, now);
  const activity = buildActivity(
    allAttempts.map((a) => a.date),
    now,
  );
  const firstName = session.user.name?.split(" ")[0];

  const startedTopics = topicMap
    .filter((t) => t.attempted > 0)
    .sort((a, b) => struggleScore(a, topicStats.get(a.topic)) - struggleScore(b, topicStats.get(b.topic)));
  const untouchedTopics = topicMap.filter((t) => t.attempted === 0);
  const worst = startedTopics.find((t) => t.avgConfidence != null);

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

  return (
    <div className="space-y-16">
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
        <p className="mt-4 max-w-[60ch] text-lg text-muted-foreground">
          {rec.detail.replace(/^Nothing is fading\.\s*/, "")}
        </p>
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
                      buttonVariants({
                        variant: i === 0 ? "default" : "outline",
                        size: "lg",
                      }),
                      "w-24 rounded-lg",
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
                    today ? "bg-card ring-1 ring-border" : "",
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
                      d.count > 0 && today && "highlight",
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

          <h3 className="mt-10 mb-1 font-semibold">Practice</h3>
          <p className="mb-3 text-sm text-muted-foreground">
            {activity.streak > 0 ? (
              <>
                <span className="font-semibold text-foreground">{activity.streak}-day streak</span>.{" "}
              </>
            ) : (
              "No streak right now. "
            )}
            {activity.total} {activity.total === 1 ? "attempt" : "attempts"} on {activity.activeDays} of the last 28
            days.
          </p>
          <ol className="grid grid-cols-7 gap-1" aria-label="Attempts per day, last 4 weeks">
            {activity.series.map((d) => (
              <li
                key={d.day.toISOString()}
                title={`${format(d.day, "EEE MMM d")}: ${d.count} ${d.count === 1 ? "attempt" : "attempts"}`}
                aria-label={`${format(d.day, "MMMM d")}: ${d.count} ${d.count === 1 ? "attempt" : "attempts"}`}
                className={cn(
                  "h-5 rounded-[4px]",
                  d.count === 0
                    ? "bg-secondary"
                    : d.count === 1
                      ? "bg-remembered/40"
                      : d.count === 2
                        ? "bg-remembered/70"
                        : "bg-remembered",
                  isToday(d.day) && "ring-1 ring-foreground/60",
                )}
              />
            ))}
          </ol>
        </section>
      </div>

      {/* Where you stand */}
      <section aria-labelledby="stand" className="border-t pt-12">
        <h2 id="stand" className="text-xl font-semibold">
          Where you stand
        </h2>
        <p className="mt-1 max-w-[64ch] text-lg text-muted-foreground">{stages.sentence}</p>

        {stages.total > 0 && (
          <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                Every problem you&apos;ve tried, by stage
              </h3>
              <div
                className="flex h-4 gap-0.5 overflow-hidden rounded-full"
                role="img"
                aria-label={STAGE_ORDER.map((s) => `${STAGE_LABELS[s]}: ${stages.counts[s]}`).join(", ")}
              >
                {STAGE_ORDER.filter((s) => stages.counts[s] > 0).map((s) => (
                  <span key={s} className={STAGE_FILL[s]} style={{ flexGrow: stages.counts[s] }} />
                ))}
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                {STAGE_ORDER.map((s) => (
                  <div key={s}>
                    <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className={cn("size-2.5 rounded-full", STAGE_FILL[s])} aria-hidden="true" />
                      {STAGE_LABELS[s]}
                    </dt>
                    <dd className="marker num mt-0.5 text-3xl font-bold">
                      {s === "fading" && stages.counts[s] > 0 ? (
                        <span className="highlight">{stages.counts[s]}</span>
                      ) : (
                        <span className={stages.counts[s] === 0 ? "text-faint" : undefined}>{stages.counts[s]}</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">By difficulty</h3>
              <ul className="space-y-5">
                {difficulty.map((d) => (
                  <li key={d.difficulty}>
                    <div className="flex items-baseline justify-between gap-4">
                      <DifficultyBadge difficulty={d.difficulty} className="text-base" />
                      <span className="num text-sm text-muted-foreground">
                        {d.tried === 0 ? (
                          "None tried yet"
                        ) : (
                          <>
                            <span className="font-semibold text-foreground">{d.solved}</span> of {d.tried} solved
                            {d.unaidedRate != null && (
                              <>
                                , <span className="font-semibold text-foreground">{pctText(d.unaidedRate)}</span>{" "}
                                without help
                              </>
                            )}
                          </>
                        )}
                      </span>
                    </div>
                    <div
                      className="mt-2 h-2 overflow-hidden rounded-full bg-secondary"
                      role="img"
                      aria-label={`${d.solved} of ${d.tried} ${d.difficulty} problems solved`}
                    >
                      <span
                        className="block h-full rounded-full bg-remembered"
                        style={{
                          width: d.tried ? `${(d.solved / d.tried) * 100}%` : 0,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* Where you're struggling */}
      <section aria-labelledby="struggling" className="border-t pt-12">
        <h2 id="struggling" className="text-xl font-semibold">
          Where you&apos;re struggling
        </h2>
        <p className="mt-1 max-w-[64ch] text-lg text-muted-foreground">
          {topicStruggleSentence(worst, worst ? topicStats.get(worst.topic) : undefined)}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          {(["solved", "fading", "attempted", "untouched"] as const).map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span className={cn("size-2.5 rounded-[3px]", CELL_FILL[s])} aria-hidden="true" />
              {CELL_WORD[s]}
            </span>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] items-start gap-x-12 gap-y-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <TopicWheel
            topics={topicMap.map((t) => ({
              topic: t.topic,
              short: TOPIC_SHORT[t.topic] ?? t.topic,
              total: t.cells.length,
              solved: t.solved,
              fading: t.fading,
              attempted: t.attempted,
              avgConfidence: t.avgConfidence,
              verdict: t.verdict,
            }))}
          />

          <div className="lg:pt-6">
            <h3 className="mb-1 font-semibold">Problems that keep beating you</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Failed last time, or tried twice without reaching confidence 3.
            </p>
            {stuck.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing is beating you right now.</p>
            ) : (
              <ul className="space-y-4">
                {stuck.map((p) => (
                  <li key={p.id}>
                    <Link href={`/problems/${p.slug}`} className="font-medium hover:underline">
                      {p.title}
                    </Link>
                    <p className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                      <DifficultyBadge difficulty={p.difficulty} />
                      <span>{p.reason}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-12">
          <h3 className="mb-1 font-semibold">Every topic you&apos;ve started, weakest first</h3>
          <p className="mb-4 text-sm text-muted-foreground">Each square is one problem in that topic.</p>
          {startedTopics.length === 0 ? (
            <p className="text-muted-foreground">Topics appear here once you&apos;ve logged an attempt in them.</p>
          ) : (
            <ul className="divide-y border-b">
              <li
                aria-hidden="true"
                className="hidden grid-cols-[11rem_minmax(0,1fr)_4.5rem_5.5rem_5rem] gap-x-6 pb-2 text-xs text-muted-foreground md:grid"
              >
                <span>Topic</span>
                <span>Problems</span>
                <span>Confidence</span>
                <span>Solved alone</span>
                <span>Verdict</span>
              </li>
              {startedTopics.map((t) => (
                <TopicLedgerRow key={t.topic} row={t} stats={topicStats.get(t.topic)} />
              ))}
            </ul>
          )}
          {untouchedTopics.length > 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              {untouchedTopics.length} of {topicMap.length} topics not started yet. Next on the roadmap is{" "}
              <span className="font-medium text-foreground">{untouchedTopics[0].topic}</span>.
            </p>
          )}
        </div>
      </section>

      {/* Getting better + Progress */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-12 gap-y-14 border-t pt-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="trend">
          <h2 id="trend" className="text-xl font-semibold">
            Are you getting better?
          </h2>
          <p className="mt-1 max-w-[60ch] text-muted-foreground">{trend.sentence}</p>
          <TrendChart weeks={trend.series} />
          <TrendLegend />
        </section>

        <section aria-labelledby="progress">
          <h2 id="progress" className="mb-1 text-xl font-semibold">
            Progress
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            {progress.solved} solved out of {progress.attempted} tried
            {progress.perWeek > 0 ? `, about ${progress.perWeek.toFixed(1)} new problems a week lately` : ""}.
          </p>
          <ListRings lists={progress.lists} />
          <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
            {progress.lists.map((l) => (
              <li key={l.name}>
                <span className="font-medium text-foreground">{l.name}</span>{" "}
                {l.solved >= l.total
                  ? "is finished."
                  : l.finishDate
                    ? `finishes around ${format(l.finishDate, "MMMM d")} at your pace.`
                    : "needs a few new problems to project a finish date."}
              </li>
            ))}
          </ul>
          <Link href="/problem-sets" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">
            See every list
          </Link>
        </section>
      </div>

      {/* Recently logged */}
      <section aria-labelledby="recent" className="border-t pt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 id="recent" className="text-xl font-semibold">
            Recently logged
          </h2>
          <Link href="/problems" className="text-sm font-medium text-primary hover:underline">
            See every problem
          </Link>
        </div>
        {recentAttempts.length === 0 ? (
          <p className="mt-2 text-muted-foreground">Solve a problem on LeetCode and the extension logs it here.</p>
        ) : (
          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pr-4 font-normal">Date</th>
                <th className="py-2 pr-4 font-normal">Problem</th>
                <th className="hidden py-2 pr-4 font-normal sm:table-cell">Result</th>
                <th className="py-2 pr-4 font-normal">Confidence</th>
                <th className="hidden py-2 font-normal md:table-cell">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentAttempts.map((a) => (
                <tr key={a.id}>
                  <td className="num py-3 pr-4 whitespace-nowrap text-muted-foreground">{format(a.date, "MMM d")}</td>
                  <td className="py-3 pr-4">
                    <Link href={`/problems/${a.problem.slug}`} className="font-medium hover:underline">
                      {a.problem.title}
                    </Link>
                    <DifficultyBadge difficulty={a.problem.difficulty} className="ml-3 text-xs" />
                  </td>
                  <td
                    className={cn(
                      "hidden py-3 pr-4 sm:table-cell",
                      a.result === "solved_independently"
                        ? "text-remembered"
                        : a.result === "solved_with_hint"
                          ? "text-muted-foreground"
                          : "text-destructive",
                    )}
                  >
                    {RESULT_LABELS[a.result]}
                  </td>
                  <td className="num py-3 pr-4">
                    <span className={cn("font-semibold", a.confidence < 3 ? "text-destructive" : "text-foreground")}>
                      {a.confidence}
                    </span>
                    <span className="text-muted-foreground"> of 5</span>
                  </td>
                  <td className="num hidden py-3 text-muted-foreground md:table-cell">
                    {formatMinutes(a.timeMinutes)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

const VERDICT_STYLE: Record<TopicRow["verdict"], string> = {
  Review: "highlight font-semibold",
  Shaky: "text-destructive font-semibold",
  Building: "text-muted-foreground",
  Solid: "text-remembered font-semibold",
  "Not started": "text-faint",
};

function TopicLedgerRow({ row, stats }: { row: TopicRow; stats: TopicStats | undefined }) {
  const conf = row.avgConfidence;
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-2 py-3.5 md:grid-cols-[11rem_minmax(0,1fr)_4.5rem_5.5rem_5rem]">
      <span className="truncate font-medium">{row.topic}</span>
      <span className="justify-self-end md:order-last md:justify-self-start">
        <span className={cn("text-sm", VERDICT_STYLE[row.verdict])}>{row.verdict}</span>
      </span>
      <span
        className="col-span-2 flex flex-wrap gap-[3px] md:col-span-1"
        role="img"
        aria-label={`${row.solved} solved, ${row.attempted - row.solved - row.fading} tried, ${row.fading} fading, ${
          row.cells.length - row.attempted
        } not tried`}
      >
        {row.cells.map((c, i) => (
          <span
            key={`${c.title}-${i}`}
            title={`${c.title}: ${CELL_WORD[c.state]}`}
            className={cn("size-3 rounded-[3px]", CELL_FILL[c.state])}
          />
        ))}
      </span>
      <span className="num text-sm text-muted-foreground">
        <span className={cn("font-semibold", conf != null && conf < 3 ? "text-destructive" : "text-foreground")}>
          {conf != null ? conf.toFixed(1) : "–"}
        </span>
        <span> of 5</span>
      </span>
      <span className="num text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{pctText(stats?.unaidedRate ?? null)}</span>
        <span className="md:sr-only"> solved alone</span>
      </span>
    </li>
  );
}

function TrendChart({ weeks }: { weeks: ReturnType<typeof buildTrend>["series"] }) {
  return (
    <ol className="mt-8 grid h-48 grid-cols-8 items-end gap-2 sm:gap-3">
      {weeks.map((w) => {
        const h = w.avgConfidence != null ? (w.avgConfidence / 5) * 100 : 0;
        const label = format(w.weekStart, "MMM d");
        return (
          <li
            key={w.weekStart.toISOString()}
            className="flex h-full flex-col justify-end"
            aria-label={
              w.attempts === 0
                ? `Week of ${label}: no attempts`
                : `Week of ${label}: ${w.attempts} attempts, confidence ${w.avgConfidence!.toFixed(1)}, ${pctText(w.unaidedRate)} without help`
            }
          >
            <span className="num mb-1 text-center text-xs text-muted-foreground">
              {w.avgConfidence != null ? w.avgConfidence.toFixed(1) : ""}
            </span>
            <span className="relative flex-1">
              <span
                aria-hidden="true"
                className="absolute inset-x-0 z-10 border-t border-dashed border-foreground/45"
                style={{ bottom: "60%" }}
              />
              <span
                className={cn(
                  "absolute inset-x-0 bottom-0 rounded-t-md",
                  w.attempts === 0
                    ? "h-0.5 bg-faint"
                    : (w.avgConfidence ?? 0) < 3
                      ? "bg-destructive/70"
                      : "bg-remembered",
                )}
                style={w.attempts ? { height: `${Math.max(4, h)}%` } : undefined}
              />
            </span>
            <span className="mt-2 border-t pt-1.5 text-center text-xs text-muted-foreground">{label}</span>
            <span className="num text-center text-xs text-faint">{w.attempts ? `${w.attempts} tries` : "–"}</span>
          </li>
        );
      })}
    </ol>
  );
}

function TrendLegend() {
  return (
    <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
      <span className="w-6 border-t border-dashed border-muted-foreground/60" aria-hidden="true" />
      Confidence 3, where a problem counts as solved. Bars show average confidence that week.
    </p>
  );
}
