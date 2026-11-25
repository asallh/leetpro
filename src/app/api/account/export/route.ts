import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { attemptsToCsv, exportFilename } from "@/lib/account-export";
import { limitUser } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// Downloads everything LeetPro stores for the signed-in user.
//   ?format=json (default): profile, sign-in methods, progress and attempts
//   ?format=csv: one row per attempt, for a spreadsheet
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limited = await limitUser(session.user.id, "apiRead");
  if (limited) return limited;

  const format = new URL(request.url).searchParams.get("format") === "csv" ? "csv" : "json";
  const userId = session.user.id;
  const now = new Date();

  const attempts = await prisma.attempt.findMany({
    where: { userId },
    omit: { id: true, userId: true, problemId: true },
    orderBy: { date: "asc" },
    include: { problem: { select: { title: true, slug: true, difficulty: true, url: true } } },
  });

  if (format === "csv") {
    return new Response(attemptsToCsv(attempts), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${exportFilename("attempts", "csv", now)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const [user, accounts, progress] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true, email: true, image: true, createdAt: true },
    }),
    prisma.account.findMany({ where: { userId }, select: { providerId: true, createdAt: true } }),
    prisma.userProblem.findMany({
      where: { userId },
      omit: { id: true, userId: true, problemId: true },
      include: { problem: { select: { title: true, slug: true, difficulty: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const body = {
    exportedAt: now.toISOString(),
    user,
    signInMethods: accounts,
    progress,
    attempts,
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename("data", "json", now)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
