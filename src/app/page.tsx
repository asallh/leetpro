import { getOptionalSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { RecallMeter } from "@/components/recall-meter";
import { Logo } from "@/components/logo";
import { cn } from "cn";

const EXAMPLE = [
  { id: 42, title: "Trapping Rain Water", d: "hard", r: 0.38 },
  { id: 207, title: "Course Schedule", d: "medium", r: 0.44 },
  { id: 322, title: "Coin Change", d: "medium", r: 0.62 },
  { id: 200, title: "Number of Islands", d: "medium", r: 0.81 },
  { id: 1, title: "Two Sum", d: "easy", r: 0.97 },
] as const;

export default async function Home() {
  const session = await getOptionalSession();
  if (session) redirect("/dashboard");

  return (
    <div className="mx-auto grid min-h-screen w-full max-w-5xl items-center gap-12 px-4 py-16 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-6">
        <Logo className="text-xl" markClassName="size-8" />
        <h1 className="font-heading text-[clamp(2rem,4.5vw,3.25rem)] font-bold leading-[1.02] tracking-[-0.045em]">
          Know which problems you&apos;re about to forget.
        </h1>
        <p className="max-w-[52ch] text-lg text-muted-foreground">
          The Chrome extension logs every LeetCode and NeetCode problem you solve, with
          confidence, time and approach. LeetPro estimates how well you still remember each
          one and brings it back right before it slips.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/sign-up" className={cn(buttonVariants({ size: "lg" }), "px-4")}>
            Create your account
          </Link>
          <Link href="/sign-in" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "px-4")}>
            Sign in
          </Link>
        </div>
      </div>

      <figure className="rounded-lg border bg-card">
        <figcaption className="flex items-baseline justify-between border-b px-4 py-2.5">
          <span className="text-sm font-semibold">Review queue</span>
          <span className="font-mono text-[11px] text-muted-foreground">example</span>
        </figcaption>
        <ul className="divide-y">
          {EXAMPLE.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="num w-8 text-muted-foreground">{p.id}</span>
              <DifficultyBadge difficulty={p.d} />
              <span className="min-w-0 flex-1 truncate font-medium">
                {p.r < 0.7 && <span className="mr-1 font-mono text-due-text">›</span>}
                {p.title}
              </span>
              <RecallMeter recall={p.r} />
            </li>
          ))}
        </ul>
      </figure>
    </div>
  );
}
