import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { BLIND_75, GRIND_75, NEETCODE_150_IDS } from "../src/lib/data/problem-lists";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  console.log("Seeding problems...");

  const allProblems = new Map<
    number,
    {
      title: string;
      difficulty: "easy" | "medium" | "hard";
      category: string;
      lists: string[];
    }
  >();

  for (const p of BLIND_75) {
    allProblems.set(p.leetcodeId, {
      title: p.title,
      difficulty: p.difficulty,
      category: p.category,
      lists: ["blind75"],
    });
  }

  for (const p of GRIND_75) {
    const existing = allProblems.get(p.leetcodeId);
    if (existing) {
      if (!existing.lists.includes("grind75")) existing.lists.push("grind75");
    } else {
      allProblems.set(p.leetcodeId, {
        title: p.title,
        difficulty: p.difficulty,
        category: p.category,
        lists: ["grind75"],
      });
    }
  }

  const neetcode150Set = new Set(NEETCODE_150_IDS);
  for (const [id, data] of allProblems) {
    if (neetcode150Set.has(id) && !data.lists.includes("neetcode150")) {
      data.lists.push("neetcode150");
    }
  }

  for (const id of NEETCODE_150_IDS) {
    if (!allProblems.has(id)) {
      allProblems.set(id, {
        title: `LeetCode ${id}`,
        difficulty: "medium",
        category: "Unknown",
        lists: ["neetcode150"],
      });
    }
  }

  let created = 0;
  let skipped = 0;

  for (const [leetcodeId, data] of allProblems) {
    const slug = toSlug(data.title);
    try {
      await prisma.problem.upsert({
        where: { slug },
        create: {
          leetcodeId,
          title: data.title,
          slug,
          difficulty: data.difficulty,
          url: `https://leetcode.com/problems/${slug}/`,
          platform: "leetcode",
          topics: [data.category],
          lists: data.lists,
        },
        update: {
          lists: data.lists,
          topics: [data.category],
        },
      });
      created++;
    } catch {
      skipped++;
    }
  }

  console.log(`Seeded ${created} problems (${skipped} skipped)`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
