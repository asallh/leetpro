import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const difficulty = searchParams.get("difficulty");
  const status = searchParams.get("status");
  const topic = searchParams.get("topic");
  const list = searchParams.get("list");

  const userProblems = await prisma.userProblem.findMany({
    where: {
      userId: session.user.id,
      ...(status && { status: status as "new_problem" | "learning" | "review" | "mastered" }),
      problem: {
        ...(difficulty && { difficulty: difficulty as "easy" | "medium" | "hard" }),
        ...(topic && { topics: { has: topic } }),
        ...(list && { lists: { has: list } }),
      },
    },
    include: { problem: true },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(userProblems);
}
