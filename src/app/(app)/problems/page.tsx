import { getRequiredSession } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";

const statusLabels: Record<string, string> = {
  new_problem: "New",
  learning: "Learning",
  review: "Review",
  mastered: "Mastered",
};

const statusColors: Record<string, string> = {
  new_problem: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  learning: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  review: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  mastered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

export default async function ProblemsPage() {
  const session = await getRequiredSession();

  const userProblems = await prisma.userProblem.findMany({
    where: { userId: session.user.id },
    include: { problem: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Problems</h1>
        <p className="text-muted-foreground">
          All problems you&apos;ve tracked ({userProblems.length})
        </p>
      </div>

      {userProblems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">No problems tracked yet</p>
          <p className="text-sm mt-1">
            Install the Chrome extension and visit a LeetCode or NeetCode
            problem to start tracking.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-[100px]">Difficulty</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[80px]">Best</TableHead>
                <TableHead className="w-[80px]">Attempts</TableHead>
                <TableHead className="w-[120px]">Last attempt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userProblems.map((up) => (
                <TableRow key={up.id}>
                  <TableCell className="font-mono text-muted-foreground">
                    {up.problem.leetcodeId ?? "—"}
                  </TableCell>
                  <TableCell>
                    <a
                      href={up.problem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:underline"
                    >
                      {up.problem.title}
                    </a>
                    {up.problem.topics.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {up.problem.topics.slice(0, 3).map((t) => (
                          <Badge
                            key={t}
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {t}
                          </Badge>
                        ))}
                        {up.problem.topics.length > 3 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                          >
                            +{up.problem.topics.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <DifficultyBadge difficulty={up.problem.difficulty} />
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={statusColors[up.status]}
                    >
                      {statusLabels[up.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {up.bestConfidence ? `${up.bestConfidence}/5` : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {up.totalAttempts}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {up.lastAttemptDate
                      ? formatDistanceToNow(new Date(up.lastAttemptDate), {
                          addSuffix: true,
                        })
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
