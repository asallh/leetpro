import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { estimateRecall } from "@/lib/recall";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const problem = await prisma.problem.findUnique({ where: { slug } });
  if (!problem) {
    return NextResponse.json({ found: false });
  }

  const userProblem = await prisma.userProblem.findUnique({
    where: {
      userId_problemId: {
        userId: session.user.id,
        problemId: problem.id,
      },
    },
  });

  if (!userProblem) {
    return NextResponse.json({
      found: true,
      tracked: false,
      problem: { id: problem.id, title: problem.title, difficulty: problem.difficulty },
    });
  }

  const attempts = await prisma.attempt.findMany({
    where: { userId: session.user.id, problemId: problem.id },
    orderBy: { date: "desc" },
    take: 5,
    select: {
      date: true,
      confidence: true,
      result: true,
      timeMinutes: true,
    },
  });

  const recall = estimateRecall(
    userProblem.lastAttemptDate,
    userProblem.reviewInterval
  );

  return NextResponse.json({
    found: true,
    tracked: true,
    problem: { id: problem.id, title: problem.title, difficulty: problem.difficulty },
    stats: {
      totalAttempts: userProblem.totalAttempts,
      bestConfidence: userProblem.bestConfidence,
      status: userProblem.status,
      recall,
      nextReviewDate: userProblem.nextReviewDate,
      lastAttemptDate: userProblem.lastAttemptDate,
    },
    recentAttempts: attempts,
  });
}
