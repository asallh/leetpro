import { getRequiredSession } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatusLabel } from "@/components/page-header";
import { RecallMeter } from "@/components/recall-meter";
import { estimateRecall, isFading } from "@/lib/recall";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, formatDistanceToNow, isToday } from "date-fns";

export default async function ProblemsPage() {
  const session = await getRequiredSession();

  const userProblems = await prisma.userProblem.findMany({
    where: { userId: session.user.id },
    include: { problem: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Problems"
        description={<>All problems you&apos;ve tracked (<span className="num">{userProblems.length}</span>)</>}
      />

      {userProblems.length === 0 ? (
        <div className="rounded-lg border bg-card px-4 py-10 text-muted-foreground">
          <p className="font-medium text-foreground">No problems tracked yet</p>
          <p className="text-sm mt-1">
            Install the Chrome extension and visit a LeetCode or NeetCode
            problem to start tracking.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">#</TableHead>
                <TableHead>Problem</TableHead>
                <TableHead className="w-12">Diff</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-32">Recall</TableHead>
                <TableHead className="w-24">Next review</TableHead>
                <TableHead className="w-14 text-right">Best</TableHead>
                <TableHead className="w-14 text-right">Tries</TableHead>
                <TableHead className="w-32">Last attempt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userProblems.map((up) => {
                const recall = estimateRecall(up.lastAttemptDate, up.reviewInterval);
                const fading = up.status !== "mastered" && isFading(recall);
                return (
                <TableRow key={up.id}>
                  <TableCell className="num text-muted-foreground">
                    {up.problem.leetcodeId ?? "—"}
                  </TableCell>
                  <TableCell>
                    <a
                      href={up.problem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:underline"
                    >
                      {fading && <span className="mr-1 font-mono text-due-text">›</span>}
                      {up.problem.title}
                    </a>
                    {up.problem.topics.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {up.problem.topics.slice(0, 3).map((t) => (
                          <Badge
                            key={t}
                            variant="outline"
                            className="px-1.5 py-0 text-[10px] font-normal text-muted-foreground"
                          >
                            {t}
                          </Badge>
                        ))}
                        {up.problem.topics.length > 3 && (
                          <Badge
                            variant="outline"
                            className="px-1.5 py-0 text-[10px] font-normal text-muted-foreground"
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
                    <StatusLabel status={up.status} />
                  </TableCell>
                  <TableCell>
                    <RecallMeter recall={up.status === "mastered" ? null : recall} />
                  </TableCell>
                  <TableCell className={fading ? "num text-xs font-bold text-due-text" : "num text-xs text-muted-foreground"}>
                    {up.status === "mastered" || !up.nextReviewDate
                      ? "—"
                      : fading
                      ? "due"
                      : isToday(up.nextReviewDate)
                      ? "today"
                      : format(up.nextReviewDate, "MMM d")}
                  </TableCell>
                  <TableCell className="num text-right">
                    {up.bestConfidence ? `${up.bestConfidence}/5` : "—"}
                  </TableCell>
                  <TableCell className="num text-right">
                    {up.totalAttempts}
                  </TableCell>
                  <TableCell className="num text-xs text-muted-foreground">
                    {up.lastAttemptDate
                      ? formatDistanceToNow(new Date(up.lastAttemptDate), {
                          addSuffix: true,
                        })
                      : "—"}
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
