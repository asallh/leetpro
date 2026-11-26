import type { Prisma } from "@/generated/prisma/client";

/**
 * Makes logging, editing and removing attempts on the same problem take
 * turns until the transaction ends. Each derives the problem's schedule and
 * counts from the attempts it reads; without the lock one can overwrite the
 * other's result with stale numbers, or two first submits can both become
 * attempt 1.
 *
 * An advisory lock on (user, problem) rather than a row lock, because the
 * user_problem row doesn't exist before the first attempt and is deleted when
 * the last one is removed. Transaction-scoped, so it is released on commit or
 * rollback and is safe behind Neon's transaction-mode pooler.
 */
export async function lockUserProblem(tx: Prisma.TransactionClient, userId: string, problemId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId} || ':' || ${problemId}))`;
}
