import { getRequiredSession } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { StatusLabel } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { estimateRecall, isFading } from "@/lib/recall";
import { topicOf } from "@/lib/dashboard-insights";
import { HELP_LABELS, RESULT_LABELS } from "@/lib/dashboard-metrics";
import { cn } from "@/lib/utils";
import { ReviewAttemptDialog } from "../../review/review-attempt-dialog";
import { MemoryTrace } from "./memory-trace";
import { RemoveAttempt } from "./remove-attempt";
import { ProblemVerdict } from "./verdict";
import { LocalDate } from "@/components/local-date";
import type { AttemptResult } from "@/generated/prisma/enums";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Loading from "../../loading";

export default function ProblemDetailPage(props: PageProps<"/problems/[slug]">) {
  return (
    <Suspense fallback={<Loading />}>
      <ProblemDetail params={props.params} />
    </Suspense>
  );
}

const resultTone: Record<AttemptResult, string> = {
  solved_independently: "text-remembered",
  solved_with_hint: "text-foreground",
  needed_solution: "text-foreground",
  could_not_solve: "text-destructive",
};

const resultDot: Record<AttemptResult, string> = {
  solved_independently: "bg-remembered",
  solved_with_hint: "bg-foreground",
  needed_solution: "bg-foreground",
  could_not_solve: "bg-destructive",
};

async function ProblemDetail({ params }: { params: PageProps<"/problems/[slug]">["params"] }) {
  const session = await getRequiredSession();
  const { slug } = await params;
  const userId = session.user.id;
  const now = new Date();

  const problem = await prisma.problem.findUnique({ where: { slug } });
  if (!problem) notFound();

  const [userProblem, attempts] = await Promise.all([
    prisma.userProblem.findUnique({ where: { userId_problemId: { userId, problemId: problem.id } } }),
    prisma.attempt.findMany({
      where: { userId, problemId: problem.id },
      orderBy: { date: "desc" },
    }),
  ]);
  if (!userProblem && attempts.length === 0) notFound();

  const recall = userProblem ? estimateRecall(userProblem.lastAttemptDate, userProblem.reviewInterval, now) : null;
  const fading = isFading(recall);
  const oldestFirst = [...attempts].reverse();

  return (
    <div className="space-y-12">
      <Link href="/problems" className="inline-block text-sm text-muted-foreground hover:text-foreground">
        ← All problems
      </Link>

      <header className="-mt-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
        <div className="min-w-0 max-w-[44rem]">
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <DifficultyBadge difficulty={problem.difficulty} />
            {problem.leetcodeId != null && <span className="num">LeetCode {problem.leetcodeId}</span>}
            <span>{topicOf(problem)}</span>
          </p>
          <h1 className="marker mt-3 text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.05] font-bold tracking-[-0.02em]">
            {fading ? <span className="highlight">{problem.title}</span> : problem.title}
          </h1>
          <p className="mt-4 max-w-[58ch] text-lg text-muted-foreground">
            <ProblemVerdict
              problem={userProblem}
              serverRecall={recall}
              lastAttemptDate={userProblem?.lastAttemptDate ?? null}
              reviewInterval={userProblem?.reviewInterval ?? 1}
            />
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={problem.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "rounded-lg")}
          >
            Open on LeetCode
          </a>
          <ReviewAttemptDialog problemId={problem.id} problemTitle={problem.title} />
        </div>
      </header>

      {attempts.length > 0 && (
        <section
          aria-labelledby="memory-heading"
          className="rounded-2xl border bg-card px-5 pt-6 pb-5 sm:px-8 sm:pt-7"
        >
          <h2 id="memory-heading" className="text-xl font-semibold">
            Memory
          </h2>
          <p className="mt-1 max-w-[62ch] text-muted-foreground">
            Each attempt puts recall back at 100%. The better it went, the slower it fades before the next review.
          </p>
          <div className="mt-8">
            <MemoryTrace
              attempts={oldestFirst}
              currentInterval={userProblem?.reviewInterval ?? 1}
              nextReviewDate={userProblem?.nextReviewDate ?? null}
              now={now}
            />
          </div>

          {userProblem && (
            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t pt-5 sm:grid-cols-5">
              <Fact label="Stage">
                <StatusLabel status={userProblem.status} />
              </Fact>
              <Fact label="Recall now">
                <span className={cn("num", fading && "highlight")}>
                  {recall != null ? `${Math.round(recall * 100)}%` : "—"}
                </span>
              </Fact>
              <Fact label="Tries">
                <span className="num">{userProblem.totalAttempts}</span>
              </Fact>
              <Fact label="Best confidence">
                <span className="num">{userProblem.bestConfidence ? `${userProblem.bestConfidence}/5` : "—"}</span>
              </Fact>
              <Fact label="Next review">
                <span className="num">
                  {userProblem.nextReviewDate ? <LocalDate date={userProblem.nextReviewDate} pattern="MMM d, yyyy" /> : "—"}
                </span>
              </Fact>
            </dl>
          )}
        </section>
      )}

      <section aria-labelledby="attempts-heading">
        <h2 id="attempts-heading" className="text-xl font-semibold">
          Attempts
        </h2>

        {attempts.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed px-6 py-10">
            <p className="marker text-xl font-bold">Nothing logged yet.</p>
            <p className="mt-2 max-w-[52ch] text-muted-foreground">
              Solve it on LeetCode, then log the attempt here. Its first review date is set from how confident you felt.
            </p>
          </div>
        ) : (
          <ol className="mt-8">
            {attempts.map((a, i) => (
              <li
                key={a.id}
                className="grid grid-cols-[1.25rem_1fr] gap-x-5 sm:grid-cols-[7.5rem_1.25rem_1fr] sm:gap-x-6"
              >
                <div className="hidden pt-0.5 text-right sm:block">
                  <p className="marker num text-lg leading-tight font-bold"><LocalDate date={a.date} pattern="MMM d" /></p>
                  <p className="num text-sm text-muted-foreground"><LocalDate date={a.date} pattern="yyyy, h:mm a" /></p>
                </div>

                {/* the rail */}
                <div className="relative flex justify-center" aria-hidden="true">
                  <span className={cn("relative z-10 mt-1.5 size-3 rounded-full ring-4 ring-background", resultDot[a.result])} />
                  {i < attempts.length - 1 && <span className="absolute top-5 bottom-0 w-px bg-border" />}
                </div>

                <article className={cn("min-w-0", i < attempts.length - 1 && "pb-10")}>
                  <p className="num text-sm text-muted-foreground sm:hidden">
                    <LocalDate date={a.date} pattern="MMM d, yyyy 'at' h:mm a" />
                  </p>
                  <h3 className="flex flex-wrap items-baseline gap-x-3 text-[1.0625rem] font-semibold">
                    <span>
                      Attempt <span className="num">{a.attemptNumber}</span>
                    </span>
                    <span className={cn("text-base font-medium", resultTone[a.result])}>
                      {RESULT_LABELS[a.result]}
                    </span>
                    <RemoveAttempt attemptId={a.id} attemptNumber={a.attemptNumber} isOnly={attempts.length === 1} />
                  </h3>

                  <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <Detail label="Confidence">
                      <ConfidencePips value={a.confidence} />
                    </Detail>
                    <Detail label="Time">
                      <span className="num">{a.timeMinutes != null ? `${a.timeMinutes} min` : "—"}</span>
                    </Detail>
                    <Detail label="Help">{HELP_LABELS[a.helpUsed]}</Detail>
                    {a.language && <Detail label="Language">{a.language}</Detail>}
                  </dl>

                  {a.patterns.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Patterns">
                      {a.patterns.map((p) => (
                        <li key={p} className="rounded-full bg-secondary px-2.5 py-0.5 text-sm">
                          {p}
                        </li>
                      ))}
                    </ul>
                  )}

                  {a.approach && <Note label="Approach">{a.approach}</Note>}
                  {a.notes && <Note label="Notes">{a.notes}</Note>}
                  {a.solution && (
                    <details className="group mt-4">
                      <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                        <span
                          aria-hidden="true"
                          className="inline-block transition-transform duration-150 group-open:rotate-90 motion-reduce:transition-none"
                        >
                          ›
                        </span>
                        <span className="group-open:hidden">Show solution</span>
                        <span className="hidden group-open:inline">Hide solution</span>
                      </summary>
                      <pre className="mt-3 overflow-x-auto rounded-lg border bg-background p-4 font-mono text-sm leading-relaxed">
                        <code>{a.solution}</code>
                      </pre>
                    </details>
                  )}
                  {!a.approach && !a.notes && !a.solution && (
                    <p className="mt-3 text-sm text-muted-foreground">No notes for this attempt.</p>
                  )}
                </article>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-[1.0625rem] font-medium">{children}</dd>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function ConfidencePips({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={cn("h-2.5 w-1.5 rounded-[1px]", n <= value ? "bg-foreground" : "bg-secondary")} />
        ))}
      </span>
      <span className="num">{value}/5</span>
    </span>
  );
}

function Note({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 max-w-[68ch]">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 leading-relaxed whitespace-pre-wrap">{children}</p>
    </div>
  );
}
