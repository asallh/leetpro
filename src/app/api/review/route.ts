import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dueProblems = await prisma.userProblem.findMany({
    where: {
      userId: session.user.id,
      nextReviewDate: { lte: new Date() },
      status: { not: "mastered" },
    },
    include: { problem: true },
    orderBy: { nextReviewDate: "asc" },
  });

  return NextResponse.json(dueProblems);
}
