"use client";

import Link from "next/link";
import { MotionConfig } from "motion/react";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { ContainerTextFlip } from "@/components/ui/container-text-flip";
import { PointerHighlight } from "@/components/ui/pointer-highlight";
import { BackgroundBeamsWithCollision } from "@/components/ui/background-beams-with-collision";
import { TextHoverEffect } from "@/components/ui/text-hover-effect";
import { cn } from "@/lib/utils";
import { LandingNav } from "./landing-nav";
import { DashboardMock } from "./dashboard-mock";
import { SpreadsheetCompare } from "./spreadsheet-compare";
import { ExtensionDemo } from "./extension-demo";
import { ForgettingCurve } from "./forgetting-curve";

// Problems people famously solve once and forget. Module-level so the flip timer isn't reset on render.
const FORGOTTEN = ["Coin Change", "Course Schedule", "LRU Cache", "Word Break", "Trapping Rain Water"];

const LOGGING_POINTS = [
  "Works on LeetCode and NeetCode, the moment a submission is accepted.",
  "Three questions: how you solved it, how confident you are, how long it took.",
  "Your confidence sets the next review. Solid answers wait longer.",
];

/** The signed-out landing page. Rendered by src/app/page.tsx. */
export function Landing() {
  return (
    <MotionConfig reducedMotion="user">
      <LandingNav />

      <main className="overflow-x-clip">
        {/* Hero: the headline, then the real product tilting into view as you scroll. */}
        <section className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[42rem] bg-[radial-gradient(60%_50%_at_50%_0%,rgba(240,180,41,0.10),transparent_70%)]"
          />
          <ContainerScroll
            titleComponent={
              <div className="px-2 pt-16 sm:pt-10">
                <p className="text-sm font-medium text-muted-foreground">Spaced repetition for LeetCode and NeetCode</p>
                <h1 className="marker mt-5 text-[clamp(2.25rem,6.5vw,5rem)] leading-[1.05] font-bold tracking-[-0.025em]">
                  Stop forgetting
                  <br />
                  <ContainerTextFlip
                    words={FORGOTTEN}
                    interval={2600}
                    className="mt-2 rounded-xl bg-highlight px-1 text-[clamp(2rem,6vw,4.5rem)] whitespace-nowrap text-highlight-ink shadow-[0_12px_40px_-12px_rgba(240,180,41,0.55)]"
                    textClassName="marker"
                  />
                </h1>
                <p className="mx-auto mt-7 max-w-[54ch] text-lg text-muted-foreground sm:text-xl">
                  LeetPro logs every problem you solve, works out which ones are slipping, and brings each back the night
                  before you&apos;d lose it.
                </p>
                <div className="mt-9 mb-16 flex flex-wrap items-center justify-center gap-3 md:mb-24">
                  <Link href="/sign-up" className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-full px-7 text-base")}>
                    Create your account
                  </Link>
                  <Link
                    href="/sign-in"
                    className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "h-12 rounded-full px-6 text-base")}
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            }
          >
            <DashboardMock />
          </ContainerScroll>
        </section>

        {/* The spreadsheet, side by side with what replaces it. */}
        <section id="compare" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 pb-24 sm:px-6 sm:pb-32">
          <div className="grid items-end gap-6 lg:grid-cols-2">
            <h2 className="marker text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.06] font-bold tracking-[-0.02em]">
              Everything your spreadsheet did, minus the typing.
            </h2>
            <p className="text-lg text-muted-foreground lg:pb-1.5">
              Same five problems, two ways. Drag the divider: LeetPro knows what you still remember, the spreadsheet
              guesses redo dates and goes stale in a week.
            </p>
          </div>
          <div className="mt-10">
            <SpreadsheetCompare />
          </div>
        </section>

        {/* Logging, on a card you can tilt and click. */}
        <section id="logging" className="border-y bg-card/40">
          <div className="mx-auto grid w-full max-w-6xl scroll-mt-24 items-center gap-14 px-4 py-24 sm:px-6 sm:py-32 lg:grid-cols-2">
            <div>
              <h2 className="marker text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.06] font-bold tracking-[-0.02em]">
                Solve it. Logged in
              </h2>
              <PointerHighlight
                rectangleClassName="rounded-lg border-highlight/70"
                pointerClassName="text-highlight size-5"
                containerClassName="mt-1"
              >
                <span className="marker relative z-10 block px-2 text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.15] font-bold tracking-[-0.02em]">
                  five seconds.
                </span>
              </PointerHighlight>
              <p className="mt-6 max-w-[48ch] text-lg text-muted-foreground">
                The Chrome extension appears when LeetCode says Accepted. Try it on the right: your answers set when the
                problem comes back.
              </p>
              <ul className="mt-8 space-y-4">
                {LOGGING_POINTS.map((p) => (
                  <li key={p} className="flex gap-3">
                    <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <ExtensionDemo />
          </div>
        </section>

        {/* The forgetting curve, interactive. */}
        <section id="curve" aria-labelledby="curve-title" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-24 sm:px-6 sm:py-32">
          <h2 id="curve-title" className="marker max-w-[20ch] text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.06] font-bold tracking-[-0.02em]">
            You forget most of what you solve. LeetPro sees it coming.
          </h2>
          <p className="mt-5 max-w-[60ch] text-lg text-muted-foreground">
            Every problem has a forgetting curve. Drag across the chart to look ahead, and see which problems drop below the
            review line first.
          </p>
          <div className="mt-12">
            <ForgettingCurve />
          </div>
        </section>

        {/* Call to action under falling beams. */}
        <BackgroundBeamsWithCollision className="h-[34rem] border-t bg-[linear-gradient(to_bottom,var(--background),#1B1C20)] md:h-[38rem]">
          <div className="relative z-20 px-4 text-center">
            <h2 className="marker mx-auto max-w-[16ch] text-[clamp(2.25rem,6vw,4.25rem)] leading-[1.04] font-bold tracking-[-0.02em]">
              Walk into the interview remembering.
            </h2>
            <p className="mx-auto mt-5 max-w-[44ch] text-lg text-muted-foreground">
              Create an account, add the extension, and let your next accepted submission log itself.
            </p>
            <Link href="/sign-up" className={cn(buttonVariants({ size: "lg" }), "mt-9 h-12 rounded-full px-7 text-base")}>
              Create your account
            </Link>
          </div>
        </BackgroundBeamsWithCollision>
      </main>

      <footer className="border-t">
        <div className="mx-auto hidden h-56 max-w-5xl md:block">
          <TextHoverEffect text="LeetPro" />
        </div>
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm text-muted-foreground sm:px-6">
          <span>Built for people with an interview coming up.</span>
          <div className="flex gap-5">
            <Link href="/sign-in" className="hover:text-foreground">
              Sign in
            </Link>
            <Link href="/sign-up" className="hover:text-foreground">
              Create an account
            </Link>
          </div>
        </div>
      </footer>
    </MotionConfig>
  );
}
