import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateNextReview } from "@/lib/spaced-repetition";
import { logAttemptSchema } from "@/lib/validations";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = logAttemptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const userId = session.user.id;

  const existingStatus = await prisma.userProblem.findUnique({
    where: { userId_problemId: { userId, problemId: data.problemId } },
  });

  const attemptCount = await prisma.attempt.count({
    where: { userId, problemId: data.problemId },
  });

  const review = calculateNextReview({
    confidence: data.confidence,
    currentInterval: existingStatus?.reviewInterval ?? 0,
    currentStatus: existingStatus?.status ?? "new_problem",
  });

  const [attempt] = await prisma.$transaction([
    prisma.attempt.create({
      data: {
        userId,
        problemId: data.problemId,
        timeMinutes: data.timeMinutes,
        result: data.result,
        confidence: data.confidence,
        helpUsed: data.helpUsed,
        approach: data.approach,
        notes: data.notes,
        patterns: data.patterns ?? [],
        attemptNumber: attemptCount + 1,
      },
    }),
    prisma.userProblem.upsert({
      where: { userId_problemId: { userId, problemId: data.problemId } },
      update: {
        totalAttempts: attemptCount + 1,
        lastAttemptDate: new Date(),
        bestConfidence: Math.max(
          data.confidence,
          existingStatus?.bestConfidence ?? 0
        ),
        status: review.newStatus,
        nextReviewDate: review.nextReviewDate,
        reviewInterval: review.newInterval,
      },
      create: {
        userId,
        problemId: data.problemId,
        totalAttempts: 1,
        lastAttemptDate: new Date(),
        bestConfidence: data.confidence,
        status: review.newStatus,
        nextReviewDate: review.nextReviewDate,
        reviewInterval: review.newInterval,
      },
    }),
  ]);

  return NextResponse.json(attempt);
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") ?? "20");

  const attempts = await prisma.attempt.findMany({
    where: { userId: session.user.id },
    include: { problem: true },
    orderBy: { date: "desc" },
    take: Math.min(limit, 100),
  });

  return NextResponse.json(attempts);
}
