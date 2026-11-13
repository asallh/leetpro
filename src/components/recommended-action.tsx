import Link from "next/link";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { RecallMeter } from "@/components/recall-meter";
import { buttonVariants } from "@/components/ui/button";
import type { NewPick, Recommendation, ReviewPick } from "@/lib/recommendations";
import { cn } from "@/lib/utils";

const MODE_LABEL: Record<Recommendation["mode"], string> = {
  start: "getting started",
  new: "good standing",
  review_then_new: "small backlog",
  review: "review first",
};

function ReviewRow({ pick, index }: { pick: ReviewPick; index: number }) {
  return (
    <li className="flex min-h-11 items-center gap-3 px-3 py-2">
      <span className="num w-4 shrink-0 text-xs text-muted-foreground">{index + 1}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          <span className="mr-1 font-mono text-due-text">›</span>
          {pick.problem.title}
        </p>
        <p className="font-mono text-xs text-muted-foreground sm:truncate">
          {pick.reasons.join(" · ")}
        </p>
      </div>
      <DifficultyBadge difficulty={pick.problem.difficulty} />
      <RecallMeter recall={pick.recall} className="hidden sm:inline-flex" />
      <a
        href={pick.problem.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(buttonVariants({ size: "sm", variant: "ghost" }))}
      >
        Open
      </a>
    </li>
  );
}

function NewRow({ pick, primary }: { pick: NewPick; primary: boolean }) {
  return (
    <li className="flex min-h-11 items-center gap-3 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {pick.problem.leetcodeId != null && (
            <span className="num mr-2 text-xs text-muted-foreground">
              {pick.problem.leetcodeId}
            </span>
          )}
          {pick.problem.title}
        </p>
        <p className="text-xs text-muted-foreground sm:truncate">
          <span className="font-mono">{pick.topic}</span> · {pick.reason}
        </p>
      </div>
      <DifficultyBadge difficulty={pick.problem.difficulty} />
      <a
        href={pick.problem.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(buttonVariants({ size: "sm", variant: primary ? "outline" : "ghost" }))}
      >
        Start
      </a>
    </li>
  );
}

export function RecommendedAction({ rec }: { rec: Recommendation }) {
  const firstNew = rec.newProblems[0];
  const reviewFirst = rec.reviews.length > 0;

  return (
    <section className="rounded-lg border bg-card" aria-labelledby="recommended-next">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-3 py-2.5">
        <h2 id="recommended-next" className="text-sm font-semibold">
          Recommended next
          <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
            {MODE_LABEL[rec.mode]}
          </span>
        </h2>
        <p className="font-mono text-xs text-muted-foreground">
          due {rec.standing.dueCount} · next 24h {rec.standing.dueSoonCount} · learning{" "}
          {rec.standing.learningCount}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 px-3 py-4">
        <div className="min-w-0 max-w-[60ch]">
          <p className="font-heading text-lg font-bold tracking-[-0.03em]">{rec.headline}</p>
          <p className="mt-1 text-sm text-muted-foreground">{rec.detail}</p>
        </div>
        {reviewFirst ? (
          <Link href="/review" className={cn(buttonVariants({ size: "lg" }), "px-4")}>
            Start review
          </Link>
        ) : (
          firstNew && (
            <a
              href={firstNew.problem.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ size: "lg" }), "max-w-full px-4")}
            >
              <span className="truncate">Start {firstNew.problem.title}</span>
            </a>
          )
        )}
      </div>

      {rec.reviews.length > 0 && (
        <div className="border-t">
          <h3 className="px-3 pt-3 font-mono text-xs text-muted-foreground">
            {rec.mode === "review_then_new" ? "1 · review" : "review"} — lowest recall first
          </h3>
          <ol className="divide-y">
            {rec.reviews.map((pick, i) => (
              <ReviewRow key={pick.userProblemId} pick={pick} index={i} />
            ))}
          </ol>
          {rec.reviewsRemaining > 0 && (
            <div className="border-t px-3 py-2 text-right">
              <Link
                href="/review"
                className="font-mono text-xs text-muted-foreground hover:text-foreground"
              >
                +{rec.reviewsRemaining} more in the review queue
              </Link>
            </div>
          )}
        </div>
      )}

      {rec.newProblems.length > 0 && (
        <div className="border-t">
          <h3 className="px-3 pt-3 font-mono text-xs text-muted-foreground">
            {rec.mode === "review_then_new"
              ? "2 · then a new problem"
              : rec.newProblems.length > 1
                ? "new problem — or pick an alternative"
                : "new problem"}
          </h3>
          <ul className="divide-y">
            {rec.newProblems.map((pick, i) => (
              <NewRow
                key={pick.problem.id}
                pick={pick}
                primary={reviewFirst ? false : i === 0}
              />
            ))}
          </ul>
        </div>
      )}

      {rec.reviews.length === 0 && rec.newProblems.length === 0 && (
        <p className="border-t px-3 py-6 text-sm text-muted-foreground">
          You&apos;ve tracked every problem in the catalog. Keep up with reviews as they come due.
        </p>
      )}
    </section>
  );
}
