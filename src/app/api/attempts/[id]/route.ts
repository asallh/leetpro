import { replayAttempts } from "@/lib/attempt-replay";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { lockUserProblem } from "@/lib/problem-lock";
import { limitUser } from "@/lib/rate-limit";
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
  const limited = await limitUser(session.user.id, "apiWrite");
  if (limited) return limited;

  const { id } = await ctx.params;
  const parsed = updateAttemptSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  const userId = session.user.id;

  const found = await prisma.attempt.findFirst({ where: { id, userId }, select: { problemId: true } });
  if (!found) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { problemId } = found;

  const result = await prisma.$transaction(async (tx) => {
    // Same lock a remove takes: a remove rewrites this attempt's snapshot and
    // the problem's schedule, so read both only once it has finished.
    await lockUserProblem(tx, userId, problemId);
    const attempt = await tx.attempt.findFirst({ where: { id, userId } });
    if (!attempt) return null;

    const updated = await tx.attempt.update({ where: { id }, data });

    // Only the latest attempt drives the schedule, and only if we know the
    // schedule it started from.
    const latest = await tx.attempt.findFirst({
      where: { userId, problemId },
      // Same order the replay on remove uses, so both agree which is latest.
      orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      select: { id: true },
    });
    const canReschedule =
      latest?.id === id && attempt.prevInterval !== null && attempt.prevStatus !== null;

    if (!canReschedule) return updated;

    const review = calculateNextReview({
      confidence: updated.confidence,
      currentInterval: attempt.prevInterval!,
      currentStatus: attempt.prevStatus!,
      from: attempt.date,
    });
    const best = await tx.attempt.aggregate({
      where: { userId, problemId },
      _max: { confidence: true },
    });

    await tx.userProblem.update({
      where: { userId_problemId: { userId, problemId } },
      data: {
        status: review.newStatus,
        nextReviewDate: review.nextReviewDate,
        reviewInterval: review.newInterval,
        bestConfidence: best._max.confidence ?? updated.confidence,
      },
    });

    return {
      ...updated,
      nextReviewDate: review.nextReviewDate,
      reviewInterval: review.newInterval,
    };
  });

  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(result);
}

// Remove an attempt logged by mistake (a double submit, say). The problem's
// schedule, attempt numbers and stats are rebuilt from the attempts left, so
// it reads as if the removed one was never logged.
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/attempts/[id]">
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limited = await limitUser(session.user.id, "apiWrite");
  if (limited) return limited;

  const { id } = await ctx.params;
  const userId = session.user.id;

  const result = await prisma.$transaction(async (tx) => {
    const attempt = await tx.attempt.findFirst({ where: { id, userId }, select: { problemId: true } });
    if (!attempt) return null;
    const { problemId } = attempt;

    await lockUserProblem(tx, userId, problemId);
    // A remove that ran while we waited for the lock may have taken it already.
    const { count } = await tx.attempt.deleteMany({ where: { id, userId } });
    if (count === 0) return null;

    const remaining = await tx.attempt.findMany({
      where: { userId, problemId },
      select: {
        id: true,
        date: true,
        createdAt: true,
        confidence: true,
        attemptNumber: true,
        prevInterval: true,
        prevStatus: true,
      },
    });
    const replay = replayAttempts(remaining);
    const before = new Map(remaining.map((a) => [a.id, a]));

    // Usually only the attempts after the removed one change.
    for (const a of replay.attempts) {
      const old = before.get(a.id);
      if (
        old?.attemptNumber === a.attemptNumber &&
        old.prevInterval === a.prevInterval &&
        old.prevStatus === a.prevStatus
      ) {
        continue;
      }
      await tx.attempt.update({
        where: { id: a.id },
        data: { attemptNumber: a.attemptNumber, prevInterval: a.prevInterval, prevStatus: a.prevStatus },
      });
    }

    if (replay.problem) {
      await tx.userProblem.update({
        where: { userId_problemId: { userId, problemId } },
        data: replay.problem,
      });
    } else {
      // Nothing left: the problem goes back to untracked.
      await tx.userProblem.deleteMany({ where: { userId, problemId } });
    }

    return { problemId, remaining: replay.attempts.length };
  });

  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(result);
}
