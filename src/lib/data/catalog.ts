import { BLIND_75, GRIND_75, NEETCODE_150_IDS } from "@/lib/data/problem-lists";

export type CatalogProblem = {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  url: string;
  leetcodeId: number;
  /** Roadmap category, e.g. "Arrays & Hashing". */
  topics: string[];
  lists: string[];
};

// Same slug rule as prisma/seed.ts.
function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function build(): CatalogProblem[] {
  const byId = new Map<number, CatalogProblem>();
  const neetcode = new Set(NEETCODE_150_IDS);

  for (const [list, problems] of [
    ["blind75", BLIND_75],
    ["grind75", GRIND_75],
  ] as const) {
    for (const p of problems) {
      const existing = byId.get(p.leetcodeId);
      if (existing) {
        existing.lists.push(list);
        continue;
      }
      byId.set(p.leetcodeId, {
        id: `lc-${p.leetcodeId}`,
        title: p.title,
        difficulty: p.difficulty,
        url: `https://leetcode.com/problems/${toSlug(p.title)}/`,
        leetcodeId: p.leetcodeId,
        topics: [p.category],
        lists: [list, ...(neetcode.has(p.leetcodeId) ? ["neetcode150"] : [])],
      });
    }
  }

  return Array.from(byId.values());
}

/**
 * Curated problems with their roadmap category. Static, so recommendations
 * work whether or not the database has been seeded.
 */
export const CATALOG: CatalogProblem[] = build();

const CATEGORY_BY_ID = new Map(CATALOG.map((p) => [p.leetcodeId, p.topics[0]]));

/**
 * Roadmap category for a problem. Problems the extension creates carry
 * LeetCode's own tags ("Array", "Hash Table"), so look up the curated category
 * by LeetCode id first.
 */
export function roadmapTopic(problem: { leetcodeId: number | null; topics: string[] }): string {
  return (
    (problem.leetcodeId != null ? CATEGORY_BY_ID.get(problem.leetcodeId) : undefined) ??
    problem.topics[0] ??
    "Uncategorized"
  );
}
