import { getRequiredSession } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReviewAttemptDialog } from "./review-attempt-dialog";
import { formatDistanceToNow } from "date-fns";

export default async function ReviewPage() {
  const session = await getRequiredSession();

  const dueProblems = await prisma.userProblem.findMany({
    where: {
      userId: session.user.id,
      nextReviewDate: { lte: new Date() },
      status: { not: "mastered" },
    },
    include: { problem: true },
    orderBy: { nextReviewDate: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Review Queue</h1>
        <p className="text-muted-foreground">
          {dueProblems.length} problem{dueProblems.length !== 1 ? "s" : ""} due
          for review
        </p>
      </div>

      {dueProblems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">All caught up!</p>
          <p className="text-sm mt-1">
            No problems due for review right now. Check back later.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dueProblems.map((up) => (
            <Card key={up.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <DifficultyBadge difficulty={up.problem.difficulty} />
                  <span className="text-xs text-muted-foreground">
                    Overdue{" "}
                    {up.nextReviewDate
                      ? formatDistanceToNow(new Date(up.nextReviewDate))
                      : ""}
                  </span>
                </div>
                <CardTitle className="text-base mt-2">
                  {up.problem.leetcodeId && (
                    <span className="text-muted-foreground">
                      {up.problem.leetcodeId}.{" "}
                    </span>
                  )}
                  {up.problem.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-1 flex-wrap">
                  {up.problem.topics.slice(0, 4).map((t) => (
                    <Badge key={t} variant="outline" className="text-xs">
                      {t}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{up.totalAttempts} attempt{up.totalAttempts !== 1 ? "s" : ""}</span>
                  <span>Best: {up.bestConfidence}/5</span>
                </div>
                <div className="flex gap-2">
                  <a
                    href={up.problem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1")}
                  >
                    Open problem
                  </a>
                  <ReviewAttemptDialog
                    problemId={up.problemId}
                    problemTitle={up.problem.title}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
