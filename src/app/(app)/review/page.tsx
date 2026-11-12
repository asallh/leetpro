import { getRequiredSession } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { PageHeader } from "@/components/page-header";
import { RecallMeter } from "@/components/recall-meter";
import { buttonVariants } from "@/components/ui/button";
import { estimateRecall } from "@/lib/recall";
import { cn } from "cn";
import { ReviewAttemptDialog } from "./review-attempt-dialog";
import { formatDistanceToNow } from "date-fns";

export default async function ReviewPage() {
  const session = await getRequiredSession();
  const now = new Date();

  const dueProblems = await prisma.userProblem.findMany({
    where: {
      userId: session.user.id,
      nextReviewDate: { lte: now },
      status: { not: "mastered" },
    },
    include: { problem: true },
    orderBy: { nextReviewDate: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review queue"
        description={
          dueProblems.length > 0 ? (
            <>
              <span className="num text-due-text">{dueProblems.length}</span> problem
              {dueProblems.length !== 1 ? "s" : ""} due, most overdue first
            </>
          ) : (
            "Nothing due right now"
          )
        }
      />

      {dueProblems.length === 0 ? (
        <div className="rounded-lg border bg-card px-4 py-10 text-muted-foreground">
          <p className="font-medium text-foreground">All caught up</p>
          <p className="mt-1 text-sm">
            Problems come back here when their estimated recall drops below 70%. The
            dashboard forecast shows when the next ones are due.
          </p>
        </div>
      ) : (
        <ol className="divide-y rounded-lg border bg-card">
          {dueProblems.map((up) => (
            <li
              key={up.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3"
            >
              <DifficultyBadge difficulty={up.problem.difficulty} />
              <div className="min-w-0 flex-1 basis-56">
                <p className="font-medium">
                  <span className="mr-1 font-mono text-due-text">›</span>
                  {up.problem.leetcodeId && (
                    <span className="num mr-1.5 text-muted-foreground">
                      {up.problem.leetcodeId}.
                    </span>
                  )}
                  {up.problem.title}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {up.problem.topics.slice(0, 4).join(" · ")}
                  {up.problem.topics.length > 0 && " · "}
                  <span className="num">
                    {up.totalAttempts} attempt{up.totalAttempts !== 1 ? "s" : ""} · best{" "}
                    {up.bestConfidence ?? "—"}/5
                  </span>
                </p>
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <RecallMeter recall={estimateRecall(up.lastAttemptDate, up.reviewInterval, now)} />
                <span className="num text-[11px] text-muted-foreground">
                  due{" "}
                  {up.nextReviewDate
                    ? formatDistanceToNow(new Date(up.nextReviewDate), { addSuffix: true })
                    : "now"}
                </span>
              </div>
              <div className="flex gap-2">
                <a
                  href={up.problem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  Open problem
                </a>
                <ReviewAttemptDialog problemId={up.problemId} problemTitle={up.problem.title} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
