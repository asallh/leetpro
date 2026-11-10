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

  const problem = await prisma.problem.upsert({
    where: { slug: data.slug },
    update: {
      title: data.title,
      difficulty: data.difficulty,
      url: data.url,
      topics: data.topics ?? [],
      lists: data.lists ?? [],
      ...(data.leetcodeId && { leetcodeId: data.leetcodeId }),
      ...(data.neetcodeId && { neetcodeId: data.neetcodeId }),
    },
    create: {
      title: data.title,
      slug: data.slug,
      difficulty: data.difficulty,
      url: data.url,
      platform: data.platform,
      topics: data.topics ?? [],
      lists: data.lists ?? [],
      leetcodeId: data.leetcodeId,
      neetcodeId: data.neetcodeId,
    },
  });

  return NextResponse.json(problem);
}
