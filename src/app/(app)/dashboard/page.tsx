import { getRequiredSession } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { StatsCard } from "@/components/stats-card";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

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
      take: 5,
    }),
  ]);

  const byDifficulty = { easy: 0, medium: 0, hard: 0 };
  for (const up of userProblems) {
    byDifficulty[up.problem.difficulty]++;
  }

  const attemptDates = new Set(
    recentAttempts.map((a) => {
      const d = new Date(a.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
  );

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const check = new Date(today);
  if (!attemptDates.has(check.getTime())) {
    check.setDate(check.getDate() - 1);
  }
  while (attemptDates.has(check.getTime())) {
    streak++;
    check.setDate(check.getDate() - 1);
  }

  const totalReviewDue = await prisma.userProblem.count({
    where: {
      userId,
      nextReviewDate: { lte: new Date() },
      status: { not: "mastered" },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session.user.name}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Problems tracked" value={userProblems.length} />
        <StatsCard
          label="By difficulty"
          value={`${byDifficulty.easy} / ${byDifficulty.medium} / ${byDifficulty.hard}`}
          description="Easy / Medium / Hard"
        />
        <StatsCard label="Current streak" value={`${streak} day${streak !== 1 ? "s" : ""}`} />
        <StatsCard label="Due for review" value={totalReviewDue} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Review queue</CardTitle>
            {totalReviewDue > 0 && (
              <Link href="/review" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                View all
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {reviewDue.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No problems due for review. Keep practicing!
              </p>
            ) : (
              <div className="space-y-3">
                {reviewDue.map((up) => (
                  <div
                    key={up.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <DifficultyBadge difficulty={up.problem.difficulty} />
                      <span className="text-sm font-medium">
                        {up.problem.leetcodeId && `${up.problem.leetcodeId}. `}
                        {up.problem.title}
                      </span>
                    </div>
                    <a
                      href={up.problem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(buttonVariants({ size: "sm", variant: "ghost" }))}
                    >
                      Open
                    </a>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentAttempts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No attempts yet. Start solving problems!
              </p>
            ) : (
              <div className="space-y-3">
                {recentAttempts.map((attempt) => (
                  <div key={attempt.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DifficultyBadge difficulty={attempt.problem.difficulty} />
                      <div>
                        <p className="text-sm font-medium">
                          {attempt.problem.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(attempt.date), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {attempt.confidence}/5
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
