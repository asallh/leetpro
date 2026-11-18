import { getRequiredSession } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { PageHeader } from "@/components/page-header";
import { RecallMeter } from "@/components/recall-meter";
import { buttonVariants } from "@/components/ui/button";
import { estimateRecall } from "@/lib/recall";
import { topicOf } from "@/lib/dashboard-insights";
import { cn } from "@/lib/utils";
import { ReviewAttemptDialog } from "./review-attempt-dialog";
import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { Suspense } from "react";
import Loading from "../loading";

export default function ReviewPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ReviewContent />
    </Suspense>
  );
}

async function ReviewContent() {
  const session = await getRequiredSession();
  const now = new Date();

  const due = await prisma.userProblem.findMany({
    where: { userId: session.user.id, nextReviewDate: { lte: now } },
    include: { problem: true },
    orderBy: { nextReviewDate: "asc" },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Review"
        description={
          due.length > 0
            ? `${due.length} ${due.length === 1 ? "problem is" : "problems are"} due, most overdue first. Solve each one again, then log how it went so the next review date adjusts.`
            : undefined
        }
      />

      {due.length === 0 ? (
        <div className="rounded-2xl border bg-card px-6 py-12 text-center">
          <p className="marker text-2xl font-bold">All caught up.</p>
          <p className="mx-auto mt-2 max-w-[48ch] text-muted-foreground">
            Problems come back here when their estimated recall drops below 70%. Today shows when the next ones are due.
          </p>
          <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-6 rounded-lg")}>
            Back to today
          </Link>
        </div>
      ) : (
        <ol className="divide-y rounded-2xl border bg-card">
          {due.map((up) => {
            const recall = estimateRecall(up.lastAttemptDate, up.reviewInterval, now);
            return (
              <li key={up.id} className="flex flex-wrap items-center gap-x-8 gap-y-4 px-5 py-5 sm:px-6">
                <div className="min-w-0 flex-1 basis-72">
                  <p className="text-[1.0625rem] font-semibold">
                    <span className="highlight">{up.problem.title}</span>
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                    <DifficultyBadge difficulty={up.problem.difficulty} />
                    <span>{topicOf(up.problem)}</span>
                    <span>
                      Tried {up.totalAttempts} {up.totalAttempts === 1 ? "time" : "times"}, best confidence{" "}
                      {up.bestConfidence ?? "—"}/5
                    </span>
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <RecallMeter recall={recall} />
                  {up.nextReviewDate && (
                    <span className="text-xs text-muted-foreground">
                      Due {formatDistanceToNowStrict(new Date(up.nextReviewDate), { addSuffix: true })}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <a
                    href={up.problem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ variant: "outline", size: "lg" }), "rounded-lg")}
                  >
                    Open on LeetCode
                  </a>
                  <ReviewAttemptDialog problemId={up.problemId} problemTitle={up.problem.title} />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
