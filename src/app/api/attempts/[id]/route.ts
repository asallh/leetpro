import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateNextReview } from "@/lib/spaced-repetition";
import { updateAttemptSchema } from "@/lib/validations";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// Fill in or correct an attempt after it was logged. The extension logs an
// accepted submission right away, then sends the user's details here.
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/attempts/[id]">
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const parsed = updateAttemptSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  const userId = session.user.id;

  const attempt = await prisma.attempt.findFirst({ where: { id, userId } });
  if (!attempt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.attempt.update({ where: { id }, data });

  // Only the latest attempt drives the schedule, and only if we know the
  // schedule it started from.
  const latest = await prisma.attempt.findFirst({
    where: { userId, problemId: attempt.problemId },
    orderBy: { date: "desc" },
    select: { id: true },
  });
  const canReschedule =
    latest?.id === id && attempt.prevInterval !== null && attempt.prevStatus !== null;

  if (!canReschedule) {
    return NextResponse.json(updated);
  }

  const review = calculateNextReview({
    confidence: updated.confidence,
    currentInterval: attempt.prevInterval!,
    currentStatus: attempt.prevStatus!,
    from: attempt.date,
  });
  const best = await prisma.attempt.aggregate({
    where: { userId, problemId: attempt.problemId },
    _max: { confidence: true },
  });

  await prisma.userProblem.update({
    where: { userId_problemId: { userId, problemId: attempt.problemId } },
    data: {
      status: review.newStatus,
      nextReviewDate: review.nextReviewDate,
      reviewInterval: review.newInterval,
      bestConfidence: best._max.confidence ?? updated.confidence,
    },
  });

  return NextResponse.json({
    ...updated,
    nextReviewDate: review.nextReviewDate,
    reviewInterval: review.newInterval,
  });
}
