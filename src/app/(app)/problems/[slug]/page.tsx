import { getRequiredSession } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { PageHeader, StatusLabel } from "@/components/page-header";
import { RecallMeter } from "@/components/recall-meter";
import { estimateRecall } from "@/lib/recall";
import { topicOf } from "@/lib/dashboard-insights";
import { HELP_LABELS, RESULT_LABELS } from "@/lib/dashboard-metrics";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Suspense } from "react";
import Loading from "../../loading";

export default function ProblemDetailPage(props: PageProps<"/problems/[slug]">) {
  return (
    <Suspense fallback={<Loading />}>
      <ProblemDetail params={props.params} />
    </Suspense>
  );
}

async function ProblemDetail({ params }: { params: PageProps<"/problems/[slug]">["params"] }) {
  const session = await getRequiredSession();
  const { slug } = await params;
  const userId = session.user.id;

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

  const recall = userProblem ? estimateRecall(userProblem.lastAttemptDate, userProblem.reviewInterval, new Date()) : null;

  return (
    <div className="space-y-8">
      <Link href="/problems" className="text-sm text-muted-foreground hover:text-foreground">
        ← All problems
      </Link>
      <PageHeader
        title={problem.title}
        description={
          <span className="flex flex-wrap items-center gap-3 text-base">
            <DifficultyBadge difficulty={problem.difficulty} />
            {problem.leetcodeId != null && <span className="num">#{problem.leetcodeId}</span>}
            <span>{topicOf(problem)}</span>
          </span>
        }
        action={
          <a
            href={problem.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            Open on LeetCode
          </a>
        }
      />

      {userProblem && (
        <dl className="flex flex-wrap gap-x-10 gap-y-4">
          <Stat label="Stage">
            <StatusLabel status={userProblem.status} />
          </Stat>
          <Stat label="Recall">
            <RecallMeter recall={recall} />
          </Stat>
          <Stat label="Tries">
            <span className="num">{userProblem.totalAttempts}</span>
          </Stat>
          <Stat label="Best">
            <span className="num">{userProblem.bestConfidence ? `${userProblem.bestConfidence}/5` : "—"}</span>
          </Stat>
          <Stat label="Next review">
            <span className="num">
              {userProblem.nextReviewDate ? format(new Date(userProblem.nextReviewDate), "MMM d, yyyy") : "—"}
            </span>
          </Stat>
        </dl>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Attempts</h2>
        {attempts.length === 0 ? (
          <p className="rounded-2xl border border-dashed bg-card px-6 py-10 text-center text-muted-foreground">
            No attempts logged for this problem yet.
          </p>
        ) : (
          <ol className="space-y-4">
            {attempts.map((a) => (
              <li key={a.id} className="rounded-2xl border bg-card p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold">
                    Attempt <span className="num">{a.attemptNumber}</span>
                    <span className="ml-3 font-normal text-muted-foreground">
                      {format(new Date(a.date), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </p>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      a.result === "solved_independently"
                        ? "text-remembered"
                        : a.result === "could_not_solve"
                          ? "text-destructive"
                          : "text-muted-foreground"
                    )}
                  >
                    {RESULT_LABELS[a.result]}
                  </span>
                </div>

                <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                  <Detail label="Confidence">
                    <span className="num">{a.confidence}/5</span>
                  </Detail>
                  <Detail label="Time">
                    <span className="num">{a.timeMinutes != null ? `${a.timeMinutes} min` : "—"}</span>
                  </Detail>
                  <Detail label="Help">{HELP_LABELS[a.helpUsed]}</Detail>
                  {a.language && <Detail label="Language">{a.language}</Detail>}
                  {a.patterns.length > 0 && <Detail label="Patterns">{a.patterns.join(", ")}</Detail>}
                </dl>

                {a.approach && <Block label="Approach">{a.approach}</Block>}
                {a.notes && <Block label="Notes">{a.notes}</Block>}
                {a.solution && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">Solution</p>
                    <pre className="mt-1 overflow-x-auto rounded-lg bg-secondary p-4 font-mono text-sm leading-relaxed">
                      <code>{a.solution}</code>
                    </pre>
                  </div>
                )}
                {!a.approach && !a.notes && !a.solution && (
                  <p className="mt-4 text-sm text-muted-foreground">No notes for this attempt.</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{children}</dd>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap">{children}</p>
    </div>
  );
}
