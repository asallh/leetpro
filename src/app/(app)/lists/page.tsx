import { getRequiredSession } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { BLIND_75, GRIND_75, NEETCODE_150_IDS } from "@/lib/data/problem-lists";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ListSection {
  name: string;
  ids: number[];
  problems: { leetcodeId: number; title: string; difficulty: "easy" | "medium" | "hard"; category: string }[];
}

export default async function ListsPage() {
  const session = await getRequiredSession();

  const userProblems = await prisma.userProblem.findMany({
    where: { userId: session.user.id },
    include: { problem: true },
  });

  const solvedIds = new Set(
    userProblems
      .filter((up) => up.bestConfidence && up.bestConfidence >= 3)
      .map((up) => up.problem.leetcodeId)
      .filter(Boolean)
  );

  const trackedIds = new Set(
    userProblems.map((up) => up.problem.leetcodeId).filter(Boolean)
  );

  const lists: ListSection[] = [
    {
      name: "Blind 75",
      ids: BLIND_75.map((p) => p.leetcodeId),
      problems: BLIND_75,
    },
    {
      name: "NeetCode 150",
      ids: NEETCODE_150_IDS,
      problems: [],
    },
    {
      name: "Grind 75",
      ids: GRIND_75.map((p) => p.leetcodeId),
      problems: GRIND_75,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Curated Lists</h1>
        <p className="text-muted-foreground">
          Track your progress on popular problem lists
        </p>
      </div>

      <div className="grid gap-6">
        {lists.map((list) => {
          const solved = list.ids.filter((id) => solvedIds.has(id)).length;
          const tracked = list.ids.filter((id) => trackedIds.has(id)).length;
          const pct = Math.round((solved / list.ids.length) * 100);

          const categories = new Map<
            string,
            { total: number; solved: number }
          >();
          for (const p of list.problems) {
            const cat = categories.get(p.category) ?? {
              total: 0,
              solved: 0,
            };
            cat.total++;
            if (solvedIds.has(p.leetcodeId)) cat.solved++;
            categories.set(p.category, cat);
          }

          return (
            <Card key={list.name}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{list.name}</CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {solved}/{list.ids.length} solved ({pct}%)
                  </span>
                </div>
                <Progress value={pct} className="mt-2" />
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground mb-4">
                  {tracked} tracked &middot; {solved} solved &middot;{" "}
                  {list.ids.length - tracked} not started
                </div>

                {list.problems.length > 0 && (
                  <div className="space-y-4">
                    {[...categories.entries()].map(([cat, stats]) => (
                      <div key={cat}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{cat}</span>
                          <span className="text-xs text-muted-foreground">
                            {stats.solved}/{stats.total}
                          </span>
                        </div>
                        <Progress
                          value={
                            stats.total > 0
                              ? (stats.solved / stats.total) * 100
                              : 0
                          }
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {list.problems.length > 0 && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                      Show all problems
                    </summary>
                    <div className="mt-2 space-y-1">
                      {list.problems.map((p) => (
                        <div
                          key={p.leetcodeId}
                          className="flex items-center gap-2 py-1 text-sm"
                        >
                          <span
                            className={
                              solvedIds.has(p.leetcodeId)
                                ? "text-green-600"
                                : trackedIds.has(p.leetcodeId)
                                ? "text-yellow-600"
                                : "text-muted-foreground"
                            }
                          >
                            {solvedIds.has(p.leetcodeId)
                              ? "✓"
                              : trackedIds.has(p.leetcodeId)
                              ? "○"
                              : "·"}
                          </span>
                          <span className="text-muted-foreground font-mono w-8">
                            {p.leetcodeId}
                          </span>
                          <span>{p.title}</span>
                          <DifficultyBadge difficulty={p.difficulty} />
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
