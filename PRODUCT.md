# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

A Next.js web app plus a Chrome (MV3) extension that runs on LeetCode and NeetCode pages. Both are web surfaces; there is no native app.

## Users

**Primary:** software engineers preparing for technical interviews within the next few months. They work through a curated list (Blind 75, Grind 75, NeetCode 150) and practice in the evenings, usually next to a dark code editor, often tired.

Many of them already keep, or have abandoned, a LeetCode tracking spreadsheet: problem, date, difficulty, how it went, notes, when to redo it. That is the habit LeetPro replaces.

Their job:
- Have their practice history recorded without doing it themselves.
- Walk into an interview still remembering what they solved six weeks earlier.
- Spend limited practice time where it does the most good.
- See how they are doing by topic and difficulty without building formulas.

**Not the target (for now):** competitive programmers, people learning to code for the first time, and teams or bootcamps managing cohorts.

## Product Purpose

Replace the LeetCode tracking spreadsheet with something that tracks for you.

The spreadsheet fails within weeks: logging is manual and gets skipped, redo dates are guesses nothing adjusts, and performance by topic is invisible without pivot tables. Meanwhile people forget most of what they solved before the interview, and re-solving at random wastes time on problems they still remember.

LeetPro captures each attempt, schedules the next review with spaced repetition, estimates how much of each problem the user still remembers, and recommends what to do next.

Success means the user stops keeping a separate sheet, logs most accepted submissions, clears due reviews within a couple of days, and keeps confidence at 3+ as review intervals grow. (These measures are proposed and not instrumented yet.)

## Positioning

LeetPro knows which problems you are about to forget. The ledger builds itself from the moment a submission is accepted on LeetCode or NeetCode, and every tracked problem carries an estimated recall percentage, so the user sees what is fading before it comes due rather than only a list of dates.

## Operating Context

The core loop:

```
solve on LeetCode/NeetCode → extension logs the attempt → schedule + recall update
        ↑                                                          ↓
        └──────── dashboard recommends: review these, or start this ┘
```

A healthy week: the user opens the dashboard, clears the 1–3 reviews it suggests, starts one new problem, and logs everything from the extension without opening the web app. Most logging happens in the extension overlay, seconds after solving, on top of the LeetCode or NeetCode page.

Surfaces and their jobs:

| Surface | Job |
| :------ | :-- |
| Extension overlay | Log an accepted submission: result, confidence 1–5, time, help used, approach, patterns, notes, solution |
| Extension popup | The user's history with the problem on screen; account state |
| Dashboard | Recommended next action, review queue, forecast, memory and topic summary, streaks |
| Review | Everything due today, most urgent first, with inline logging |
| Problems | Every tracked problem with status, recall and attempt history; edit past attempts |
| Lists | Progress through Blind 75, Grind 75, NeetCode 150 |
| Landing, sign-in, sign-up | Explain the promise and get the user signed in |

## Capabilities and Constraints

**Scheduling** ([`src/lib/spaced-repetition.ts`](src/lib/spaced-repetition.ts))
- Confidence drives the interval: 1–2 resets to 1 day (`learning`), 3 → 3 days, 4 → 7 days or 2× the current interval, 5 → 14 days or 2× the current interval. Capped at 180 days.
- A problem becomes `mastered` after a confidence 4+ review while in `review` with an interval of 14+ days. Mastered problems still come due as check-ins; a 3 demotes to `review`, a 1–2 sends back to `learning`.
- Editing a past attempt recomputes the schedule from the snapshot taken before it, so corrections never corrupt the schedule.

**Recall** ([`src/lib/recall.ts`](src/lib/recall.ts))
- Modeled as `R(t) = e^(-t/S)`, tuned to reach 70% on the scheduled review date. Below 70% a problem is *fading* and shows as due.
- Recall is an estimate for display; it does not feed the scheduler.

**Recommendations** ([`src/lib/recommendations.ts`](src/lib/recommendations.ts))
- `start`: nothing tracked → first problem on the roadmap. `new`: nothing due → start a new problem. `review_then_new`: ≤ 4 due → up to 3 reviews, then one new problem. `review`: large backlog or anything below 50% recall → reviews only.
- Reviews rank by recall lost, boosted for `learning` problems and weak topics (average confidence below 3). New problems come from weak topics first, then NeetCode roadmap order; difficulty steps up after 2 confident easies or 3 confident mediums in a topic.

**Capture**
- The extension prompts only after an **accepted** submission; failed runs never interrupt.
- It never registers a problem from a slug guess; a problem needs real metadata first.
- The extension has no login of its own; it uses the web app's session.

**Shipped (Nov 2026):** dashboard, review queue, problems, lists, editable attempts; the extension on both sites with overlay, popup stats and account menu; email/password, Google, GitHub and Discord auth; rate limiting and a password gate for private deployments. **Next:** first production deploy and Chrome Web Store listing.

**Non-goals:** hosting problems, running or judging code, teaching algorithms or explaining solutions, social features or leaderboards, other judges (HackerRank, Codeforces) for now.

**Undecided:** what else to capture automatically (time spent, solution language); CSV import of an existing spreadsheet; whether recall should feed the scheduler; pricing (nothing assumes free or paid); a target interview date that compresses intervals; Firefox or Safari extensions.

## Brand Commitments

- The name **LeetPro** stays.
- The original logo mark in [`brand/`](brand/) and the graphite, warm ink and amber colours stay (confirmed after the November 2026 redesign). Layout and type are described in DESIGN.md.

## Evidence on Hand

- Real product behavior and rules, documented above and in the source files linked.
- No users, testimonials, usage metrics, press, or customer logos exist yet. Future work must not invent them, and must not claim a user count, retention figure or pricing.

## Product Principles

1. **Automate before you ask.** If LeetPro can detect or derive something (the problem, difficulty, topics, time, the solution, the redo date), it never asks the user to type it. Every manual field brings the spreadsheet back.
2. **Logging is faster than skipping it.** Capture takes a few seconds; any new overlay field needs a strong reason.
3. **One clear next action.** The dashboard answers "what do I do now?" before it shows statistics.
4. **Point only at what's slipping.** Attention-drawing emphasis is reserved for due and fading work.
5. **Honest numbers.** Recall is labeled as an estimate; streaks and progress are never padded.
6. **The data stays editable.** Every attempt can be corrected and the schedule recomputes to match.

## Accessibility & Inclusion

WCAG 2.2 AA is required across the web app and extension: text and UI contrast, full keyboard operation, visible focus states, and `prefers-reduced-motion` respected. Status (due, fading, mastered) is never conveyed by color alone.
