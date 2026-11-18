import { getOptionalSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { RecallMeter } from "@/components/recall-meter";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { Suspense } from "react";

// Illustrative rows for the example sheet; not real user data.
const EXAMPLE = [
  { title: "Trapping Rain Water", d: "hard", r: 0.38 },
  { title: "Course Schedule", d: "medium", r: 0.52 },
  { title: "Coin Change", d: "medium", r: 0.81 },
  { title: "Two Sum", d: "easy", r: 0.97 },
] as const;

const POINTS = [
  {
    title: "It logs itself",
    body: "The Chrome extension notices an accepted submission on LeetCode or NeetCode and asks three quick questions. No copying titles into a sheet.",
  },
  {
    title: "It knows what you're forgetting",
    body: "Every problem gets an estimated recall that drops over time. When it falls below 70%, the problem comes back for review.",
  },
  {
    title: "It shows where you're weak",
    body: "Confidence by topic, progress through Blind 75 and NeetCode 150, and a finish date at your current pace.",
  },
];

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const session = await getOptionalSession();
  if (session) redirect("/dashboard");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <header className="flex h-20 items-center justify-between">
        <Logo />
        <Link href="/sign-in" className="text-[0.9375rem] font-medium text-muted-foreground hover:text-foreground">
          Sign in
        </Link>
      </header>

      <main>
        <section className="grid items-center gap-14 py-12 sm:py-20 lg:grid-cols-[minmax(0,1fr)_28rem]">
          <div>
            <h1 className="marker max-w-[16ch] text-[clamp(2.5rem,6vw,4.25rem)] leading-[1.04] font-bold tracking-[-0.02em] text-balance">
              Stop tracking LeetCode in a spreadsheet.
            </h1>
            <p className="mt-6 max-w-[52ch] text-lg text-muted-foreground sm:text-xl">
              LeetPro logs every problem you solve, tells you which ones you&apos;re about to forget, and brings them back
              right before they slip.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/sign-up" className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-lg px-6 text-base")}>
                Create your account
              </Link>
              <Link
                href="/sign-in"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 rounded-lg px-6 text-base")}
              >
                Sign in
              </Link>
            </div>
          </div>

          <figure className="rounded-2xl border bg-card p-2 shadow-[0_24px_48px_-16px_rgba(0,0,0,0.6)]">
            <figcaption className="px-4 pt-3 pb-2">
              <p className="font-semibold">Tonight&apos;s reviews</p>
              <p className="text-sm text-muted-foreground">An example. Highlighted problems are fading.</p>
            </figcaption>
            <ul className="divide-y">
              {EXAMPLE.map((p) => (
                <li key={p.title} className="flex items-center gap-4 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      <span className={p.r < 0.7 ? "highlight" : undefined}>{p.title}</span>
                    </p>
                    <DifficultyBadge difficulty={p.d} className="text-xs" />
                  </div>
                  <RecallMeter recall={p.r} />
                </li>
              ))}
            </ul>
          </figure>
        </section>

        <section aria-label="What LeetPro does" className="grid gap-10 border-t py-16 sm:grid-cols-3">
          {POINTS.map((p) => (
            <div key={p.title}>
              <h2 className="marker text-xl font-bold">{p.title}</h2>
              <p className="mt-2 text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
