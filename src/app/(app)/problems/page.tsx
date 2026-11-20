import { getRequiredSession } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { PageHeader, StatusLabel } from "@/components/page-header";
import { RecallMeter } from "@/components/recall-meter";
import { estimateRecall, isFading } from "@/lib/recall";
import { topicOf } from "@/lib/dashboard-insights";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format, isToday, isTomorrow } from "date-fns";
import { Suspense } from "react";
import Loading from "../loading";
import { TOPICS } from "@/lib/data/topics";
import { Fragment } from "react";
import { SortSelect, TopicFilter } from "./topic-filter";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "review", label: "Needs review" },
  { key: "learning", label: "Still learning" },
  { key: "mastered", label: "Mastered" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

const SORTS = [
  { key: "next", label: "Next review" },
  { key: "topic", label: "Problem type" },
  { key: "difficulty", label: "Difficulty" },
  { key: "recent", label: "Last solved" },
  { key: "recall", label: "Recall, lowest first" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

const DIFFICULTY_RANK = { easy: 0, medium: 1, hard: 2 } as const;

/** Roadmap order for topics; anything off the roadmap sorts after, alphabetically. */
function topicRank(topic: string) {
  const i = (TOPICS as readonly string[]).indexOf(topic);
  return i === -1 ? TOPICS.length : i;
}

export default function ProblemsPage(props: PageProps<"/problems">) {
  return (
    <Suspense fallback={<Loading />}>
      <ProblemsContent searchParams={props.searchParams} />
    </Suspense>
  );
}

async function ProblemsContent({ searchParams }: { searchParams: PageProps<"/problems">["searchParams"] }) {
  const session = await getRequiredSession();
  const params = await searchParams;
  const filter: FilterKey = FILTERS.some((f) => f.key === params.show) ? (params.show as FilterKey) : "all";
  const sort: SortKey = SORTS.some((s) => s.key === params.sort) ? (params.sort as SortKey) : "next";
  const now = new Date();

  const userProblems = await prisma.userProblem.findMany({
    where: { userId: session.user.id },
    include: { problem: true },
    orderBy: { nextReviewDate: "asc" },
  });

  const allRows = userProblems.map((up) => {
    const recall = estimateRecall(up.lastAttemptDate, up.reviewInterval, now);
    return { up, recall, fading: isFading(recall), topic: topicOf(up.problem) };
  });
  const topicCounts = new Map<string, number>();
  for (const r of allRows) topicCounts.set(r.topic, (topicCounts.get(r.topic) ?? 0) + 1);
  const topicOptions = [...topicCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const topic = typeof params.topic === "string" && topicCounts.has(params.topic) ? params.topic : "";
  const rows = topic ? allRows.filter((r) => r.topic === topic) : allRows;
  const matches = (key: FilterKey, r: (typeof rows)[number]) =>
    key === "all"
      ? true
      : key === "review"
        ? r.fading || (r.up.nextReviewDate != null && r.up.nextReviewDate <= now)
        : key === "mastered"
          ? r.up.status === "mastered"
          : r.up.status === "learning" || r.up.status === "new_problem";
  const time = (d: Date | null) => (d ? new Date(d).getTime() : null);
  // Rows arrive ordered by next review, and Array.sort is stable, so that stays the tiebreak.
  const compare: Record<SortKey, (a: (typeof rows)[number], b: (typeof rows)[number]) => number> = {
    next: () => 0,
    topic: (a, b) => topicRank(a.topic) - topicRank(b.topic) || a.topic.localeCompare(b.topic),
    difficulty: (a, b) => DIFFICULTY_RANK[a.up.problem.difficulty] - DIFFICULTY_RANK[b.up.problem.difficulty],
    recent: (a, b) => (time(b.up.lastAttemptDate) ?? -Infinity) - (time(a.up.lastAttemptDate) ?? -Infinity),
    recall: (a, b) => (a.recall ?? Infinity) - (b.recall ?? Infinity),
  };
  const shown = rows.filter((r) => matches(filter, r)).sort(compare[sort]);
  const groupCounts = new Map<string, number>();
  for (const r of shown) groupCounts.set(r.topic, (groupCounts.get(r.topic) ?? 0) + 1);
  const grouped = sort === "topic" && !topic;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Problems"
        description="Every problem you've logged, with when you last solved it and when it comes back. Your spreadsheet, kept for you."
      />

      {userProblems.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
          <p className="font-semibold">Nothing logged yet</p>
          <p className="mx-auto mt-1 max-w-[46ch] text-muted-foreground">
            Install the Chrome extension, then solve a problem on LeetCode or NeetCode. It lands here with its review date.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Filter problems" className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const count = rows.filter((r) => matches(f.key, r)).length;
              const active = f.key === filter;
              return (
                <Link
                  key={f.key}
                  href={(() => {
                    const q = new URLSearchParams();
                    if (f.key !== "all") q.set("show", f.key);
                    if (topic) q.set("topic", topic);
                    if (sort !== "next") q.set("sort", sort);
                    const qs = q.toString();
                    return qs ? `/problems?${qs}` : "/problems";
                  })()}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm transition-colors",
                    active ? "border-foreground bg-foreground text-background" : "bg-card hover:bg-secondary"
                  )}
                >
                  {f.label} <span className={cn("num", active ? "opacity-70" : "text-muted-foreground")}>{count}</span>
                </Link>
              );
            })}
          </nav>
          <div className="flex flex-wrap items-center gap-3">
            <TopicFilter topics={topicOptions} value={topic} />
            <SortSelect options={SORTS} value={sort} />
          </div>
          </div>

          <div className="overflow-hidden rounded-2xl border bg-card">
            {shown.length === 0 ? (
              <p className="px-6 py-10 text-center text-muted-foreground">
                No problems match{topic ? ` in ${topic}` : ""} right now.{" "}
                <Link href="/problems" className="font-medium text-primary hover:underline">
                  Show all problems
                </Link>
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">Problem</TableHead>
                    <TableHead className="hidden md:table-cell">Topic</TableHead>
                    <TableHead className="hidden sm:table-cell">Stage</TableHead>
                    <TableHead>Recall</TableHead>
                    <TableHead className="hidden lg:table-cell">Last solved</TableHead>
                    <TableHead className="hidden text-right lg:table-cell">Tries</TableHead>
                    <TableHead className="hidden text-right lg:table-cell">Best</TableHead>
                    <TableHead className="pr-5 text-right">Next review</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown.map(({ up, recall, fading, topic: rowTopic }, i) => {
                    const next = up.nextReviewDate ? new Date(up.nextReviewDate) : null;
                    const dueNow = fading || (next != null && next <= now);
                    const startsGroup = grouped && (i === 0 || shown[i - 1].topic !== rowTopic);
                    return (
                      <Fragment key={up.id}>
                      {startsGroup && (
                        <TableRow className="bg-secondary/60 hover:bg-secondary/60">
                          <TableCell colSpan={8} className="py-2 pl-5">
                            <span className="font-semibold">{rowTopic}</span>{" "}
                            <span className="num text-sm text-muted-foreground">{groupCounts.get(rowTopic)}</span>
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow>
                        <TableCell className="py-3 pl-5">
                          <Link
                            href={`/problems/${up.problem.slug}`}
                            className="font-semibold hover:underline"
                          >
                            <span className={fading ? "highlight" : undefined}>{up.problem.title}</span>
                          </Link>
                          <div className="mt-0.5 flex gap-2 text-sm">
                            <DifficultyBadge difficulty={up.problem.difficulty} />
                            {up.problem.leetcodeId != null && (
                              <span className="num text-muted-foreground">#{up.problem.leetcodeId}</span>
                            )}
                            <a
                              href={up.problem.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground hover:underline"
                            >
                              LeetCode ↗
                            </a>
                          </div>
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground md:table-cell">{topic || topicOf(up.problem)}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <StatusLabel status={up.status} />
                        </TableCell>
                        <TableCell>
                          <RecallMeter recall={recall} />
                        </TableCell>
                        <TableCell className="num hidden text-muted-foreground lg:table-cell">
                          {up.lastAttemptDate ? format(new Date(up.lastAttemptDate), "MMM d") : "—"}
                        </TableCell>
                        <TableCell className="num hidden text-right lg:table-cell">{up.totalAttempts}</TableCell>
                        <TableCell className="num hidden text-right lg:table-cell">
                          {up.bestConfidence ? `${up.bestConfidence}/5` : "—"}
                        </TableCell>
                        <TableCell className={cn("num pr-5 text-right", dueNow ? "font-semibold" : "text-muted-foreground")}>
                          {!next
                            ? "—"
                            : dueNow
                              ? "Now"
                              : isToday(next)
                                ? "Today"
                                : isTomorrow(next)
                                  ? "Tomorrow"
                                  : format(next, "MMM d")}
                        </TableCell>
                      </TableRow>
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Recall is an estimate of how well you&apos;d remember a problem today. Highlighted problems have dropped below 70%
            and are due for review.
          </p>
        </>
      )}
    </div>
  );
}
