import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [userProblems, attempts, reviewDue] = await Promise.all([
    prisma.userProblem.findMany({
      where: { userId },
      include: { problem: true },
    }),
    prisma.attempt.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      select: { date: true, result: true },
    }),
    prisma.userProblem.count({
      where: {
        userId,
        nextReviewDate: { lte: new Date() },
        status: { not: "mastered" },
      },
    }),
  ]);

  const byDifficulty = { easy: 0, medium: 0, hard: 0 };
  const byStatus = { new_problem: 0, learning: 0, review: 0, mastered: 0 };
  const topicCounts: Record<string, { solved: number; total: number }> = {};

  for (const up of userProblems) {
    byDifficulty[up.problem.difficulty]++;
    byStatus[up.status]++;

    for (const topic of up.problem.topics) {
      if (!topicCounts[topic]) topicCounts[topic] = { solved: 0, total: 0 };
      topicCounts[topic].total++;
      if (up.bestConfidence && up.bestConfidence >= 3) {
        topicCounts[topic].solved++;
      }
    }
  }

  let streak = 0;
  if (attempts.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dates = new Set(
      attempts.map((a) => {
        const d = new Date(a.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    );

    const check = new Date(today);
    if (!dates.has(check.getTime())) {
      check.setDate(check.getDate() - 1);
    }

    while (dates.has(check.getTime())) {
      streak++;
      check.setDate(check.getDate() - 1);
    }
  }

  return NextResponse.json({
    totalProblems: userProblems.length,
    byDifficulty,
    byStatus,
    streak,
    reviewDueCount: reviewDue,
    topicStats: topicCounts,
  });
}
