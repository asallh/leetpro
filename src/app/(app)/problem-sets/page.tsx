import { getRequiredSession } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { BLIND_75, GRIND_75, NEETCODE_150_IDS, type ListProblem } from "@/lib/data/problem-lists";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { PageHeader } from "@/components/page-header";
import { SOLVED_CONFIDENCE, topicOf } from "@/lib/dashboard-insights";
import { estimateRecall, isFading } from "@/lib/recall";
import { cn } from "@/lib/utils";
import { Suspense } from "react";
import Loading from "../loading";

type State = "solved" | "fading" | "tried" | "todo";

export default function ProblemSetsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ListsContent />
    </Suspense>
  );
}

function slug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function ListsContent() {
  const session = await getRequiredSession();
  const now = new Date();
  const userProblems = await prisma.userProblem.findMany({
    where: { userId: session.user.id },
    include: { problem: true },
  });

  const stateById = new Map<number, State>();
  for (const up of userProblems) {
    if (up.problem.leetcodeId == null) continue;
    const fading = isFading(estimateRecall(up.lastAttemptDate, up.reviewInterval, now));
    stateById.set(
      up.problem.leetcodeId,
      fading ? "fading" : (up.bestConfidence ?? 0) >= SOLVED_CONFIDENCE ? "solved" : "tried"
    );
  }
  const stateOf = (id: number): State => stateById.get(id) ?? "todo";

  const lists: { name: string; about: string; ids: number[]; problems: ListProblem[] }[] = [
    {
      name: "Blind 75",
      about: "The classic short list. Good if your interview is a few weeks away.",
      ids: BLIND_75.map((p) => p.leetcodeId),
      problems: BLIND_75,
    },
    {
      name: "Grind 75",
      about: "A modern take on Blind 75 with a suggested order.",
      ids: GRIND_75.map((p) => p.leetcodeId),
      problems: GRIND_75,
    },
    {
      name: "NeetCode 150",
      about: "Blind 75 plus 75 more, grouped by the NeetCode roadmap.",
      ids: NEETCODE_150_IDS,
      problems: [],
    },
  ];

  return (
    <div className="space-y-10">
      <PageHeader
        title="Problem Sets"
        description="How far you are through the lists most people prepare with. A problem counts as solved once you've logged it at confidence 3 or higher."
      />

      {lists.map((list) => {
        const solved = list.ids.filter((id) => ["solved", "fading"].includes(stateOf(id))).length;
        const tried = list.ids.filter((id) => stateOf(id) === "tried").length;
        const fading = list.ids.filter((id) => stateOf(id) === "fading").length;
        const groups = new Map<string, ListProblem[]>();
        for (const p of list.problems) {
          const topic = topicOf({ leetcodeId: p.leetcodeId, topics: [p.category] });
          groups.set(topic, [...(groups.get(topic) ?? []), p]);
        }

        return (
          <section key={list.name} aria-labelledby={slug(list.name)} className="rounded-2xl border bg-card p-5 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
              <div>
                <h2 id={slug(list.name)} className="marker text-2xl font-bold">
                  {list.name}
                </h2>
                <p className="mt-1 text-muted-foreground">{list.about}</p>
              </div>
              <p className="num text-lg">
                <span className="font-bold">{solved}</span>
                <span className="text-muted-foreground"> of {list.ids.length} solved</span>
              </p>
            </div>
            <div
              className="mt-4 flex h-3 overflow-hidden rounded-full bg-secondary"
              role="img"
              aria-label={`${solved} of ${list.ids.length} solved, ${tried} more tried`}
            >
              <span className="bg-remembered" style={{ width: `${(solved / list.ids.length) * 100}%` }} />
              <span className="bg-remembered/30" style={{ width: `${(tried / list.ids.length) * 100}%` }} />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {tried > 0 && `${tried} tried but not solved yet. `}
              {fading > 0 && (
                <>
                  <span className="highlight font-medium text-foreground">
                    {fading} solved {fading === 1 ? "problem is" : "problems are"} fading
                  </span>
                  .
                </>
              )}
            </p>

            {groups.size > 0 && (
              <details className="group mt-6">
                <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-lg text-sm font-semibold text-primary hover:underline [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">Show problems by topic</span>
                  <span className="hidden group-open:inline">Hide problems</span>
                </summary>
                <div className="mt-5 grid gap-x-10 gap-y-8 md:grid-cols-2">
                  {[...groups.entries()].map(([topic, problems]) => {
                    const done = problems.filter((p) => ["solved", "fading"].includes(stateOf(p.leetcodeId))).length;
                    return (
                      <div key={topic}>
                        <h3 className="flex items-baseline justify-between gap-3 border-b pb-2">
                          <span className="font-semibold">{topic}</span>
                          <span className="num text-sm text-muted-foreground">
                            {done} of {problems.length}
                          </span>
                        </h3>
                        <ul className="mt-2 space-y-1">
                          {problems.map((p) => {
                            const st = stateOf(p.leetcodeId);
                            return (
                              <li key={p.leetcodeId} className="flex items-center gap-3 py-1 text-[0.9375rem]">
                                <StateDot state={st} />
                                <a
                                  href={`https://leetcode.com/problems/${slug(p.title)}/`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={cn("min-w-0 flex-1 truncate hover:underline", st === "todo" && "text-muted-foreground")}
                                >
                                  <span className={st === "fading" ? "highlight" : undefined}>{p.title}</span>
                                </a>
                                <DifficultyBadge difficulty={p.difficulty} className="shrink-0 text-xs" />
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
          </section>
        );
      })}
    </div>
  );
}

const DOT: Record<State, { cls: string; label: string }> = {
  solved: { cls: "bg-remembered", label: "Solved" },
  fading: { cls: "bg-highlight-strong", label: "Solved, fading" },
  tried: { cls: "border-2 border-remembered", label: "Tried" },
  todo: { cls: "border border-input", label: "Not started" },
};

function StateDot({ state }: { state: State }) {
  return (
    <span
      className={cn("size-3 shrink-0 rounded-full", DOT[state].cls)}
      role="img"
      aria-label={DOT[state].label}
      title={DOT[state].label}
    />
  );
}
