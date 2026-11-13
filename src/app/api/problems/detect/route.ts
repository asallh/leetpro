import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { detectProblemSchema } from "@/lib/validations";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = detectProblemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // Problem rows are shared by every user, so a client may only create a
  // missing problem, never rewrite an existing one. The link is built here
  // from the slug so no one can point a problem at another site.
  const url =
    data.platform === "neetcode"
      ? `https://neetcode.io/problems/${data.slug}`
      : `https://leetcode.com/problems/${data.slug}/`;

  const problem = await prisma.problem.upsert({
    where: { slug: data.slug },
    update: {},
    create: {
      title: data.title,
      slug: data.slug,
      difficulty: data.difficulty,
      url,
      platform: data.platform,
      topics: data.topics ?? [],
      lists: data.lists ?? [],
      leetcodeId: data.leetcodeId,
      neetcodeId: data.neetcodeId,
    },
  });

  return NextResponse.json(problem);
}
