---
name: LeetPro
description: Whiteboard layout in the original Ledger colours. Graphite ground, warm ink, and one amber highlighter for anything fading.
colors:
  background: "#16171A"
  card: "#1E2024"
  raised: "#26282D"
  ink: "#E9E6DF"
  ink-muted: "#9C988F"
  line: "#303238"
  amber: "#F0B429"
  on-amber: "#1A1408"
  green: "#6CC48A"
  medium: "#E3C27A"
  red: "#EF7B6A"
typography:
  family: Mona Sans (variable, wdth and wght axes)
  display: "wdth 112%, weight 700, for page headlines, list names and big figures (.marker)"
  ui: "wdth 100%, weights 400 to 600, for everything else"
  wordmark: "JetBrains Mono 700"
  page-title: "2rem to 2.5rem display"
  today-headline: "clamp(2.25rem, 5vw, 3.5rem) display, line-height 1.08"
  section: "1.25rem, weight 600"
  body: "1rem; lead 1.125rem muted"
  small: "0.875rem"
rounded:
  control: "8px"
  panel: "16px"
  pill: "9999px"
---

# LeetPro

## Overview

Interview prep happens on whiteboards, and people who track LeetCode in a spreadsheet highlight a row yellow when it needs a redo. LeetPro takes both: a calm app on a graphite ground, where the amber highlighter marks exactly one thing, a problem that is fading and needs review. Everything else stays quiet so that mark is the first thing you see.

The app is dark only, in the original Ledger colours. Content sits in a 72rem (`max-w-6xl`) column, left aligned, with generous space between sections.

## Colors

The original Ledger palette, dark only.

- **Graphite** `#16171A`: page ground. **Card** `#1E2024`: the main sheet on each page. **Raised** `#26282D`: hover, bar tracks, menus.
- **Warm ink** `#E9E6DF`: text. **Muted** `#9C988F`: secondary text. **Line** `#303238`: borders and dividers.
- **Amber** `#F0B429`: the one signal. It is the primary button, the active nav underline, focus rings, and the highlighter behind anything fading (with `#1A1408` ink on top).
- **Green** `#6CC48A`: solved and remembered, and Easy. **Medium** `#E3C27A`. **Red** `#EF7B6A`: errors, Hard, and topic confidence below 3.
- The logo is the original mark (three ledger rows, the last one amber) with the JetBrains Mono "Leet**Pro**" wordmark.

## Typography

One family, Mona Sans (GitHub's typeface, which the audience reads every day). Display text uses the `.marker` utility: the same face at 112% width and weight 700, for page titles, the Today headline, list names, empty-state titles and big counts. Everything else is the normal width at 400 to 600. Sentence case everywhere; no all-caps labels. Numbers in tables use tabular figures (`.num`). JetBrains Mono is kept only for the LeetPro wordmark and for code in the extension. The extension popup and overlay load the same font from Google Fonts.

## Layout

- **Shell:** sticky white top bar: logo, then Today, Problems, Review, Lists (active link bold with a 3px amber underline), then the account menu. Below `md` the links move to a scrollable second row.
- **Today:** a greeting and one headline sentence about what's fading, then a two-column grid (stacks below `lg`): Tonight (a white sheet of up to four problems with Review/Start buttons), This week (reviews due per day), Progress (list completion and projected finish date), Topics (three weakest and three strongest by confidence).
- **Problems:** the upgraded spreadsheet. Filter pills (All, Needs review, Still learning, Mastered) with counts, then one table: problem, topic, stage, recall, last solved, tries, best, next review. Columns drop at `sm`/`md`/`lg`.
- **Review:** due problems in one sheet, each with Open on LeetCode and Log attempt.
- **Problem detail:** metadata line, the title as a display headline (highlighted when fading), one status sentence, then Open on LeetCode and Log attempt. One sheet holds the memory chart (estimated recall since the first attempt, each attempt resetting it to 100%, amber below the 70% line, dotted projection to the next review) with Stage, Recall now, Tries, Best confidence and Next review under it. Attempts follow as a timeline: date column, a rail with one dot per attempt coloured by result (also stated in words), and folded solutions.
- **Lists:** one panel per list with a progress bar and an expandable checklist grouped by topic.

## Elevation & Shapes

The page ground is flat. The main sheet on Today and the landing example carry a soft two-layer shadow; other panels use a 1px line border only. Panels are 16px radius, controls 8px, filter chips are pills.

## Motion

One authored moment: on Today, the highlighter draws across the fading count once on load (700ms, ease-out), skipped under reduced motion. Otherwise only colour transitions on hover. The signed-out landing page is the exception (see the Decisions Log, 2026-11-18): it uses Aceternity UI components on Motion (a dashboard that tilts flat on scroll, a flipping highlighter word, a tilting extension card, falling beams) plus LeetPro's own interactive spreadsheet comparison and forgetting curve. `MotionConfig reducedMotion="user"` wraps the page.

## Do's and Don'ts

- **Do** use the highlighter only for fading and needs-review.
- **Do** state every status in words as well as colour.
- **Do** keep one filled amber button per view.
- **Don't** add all-caps labels, dot-joined metadata strings, or numbered markers that aren't a real sequence.
- **Don't** put stats in identical card grids; a page has one sheet and quiet sections around it.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-11-12 | Initial design system created ("Ledger") | Created by /design-consultation from product context, NeetCode research and a three-direction preview; user picked Ledger over Highlighter and Tide. |
| 2026-11-12 | Fading-ledger logo mark; shared across favicon, app and extension | Replaces the Next.js default favicon and the old extension icons; dropped the `~/` wordmark prefix now that the mark carries the terminal feel. |
| 2026-11-18 | Redesign: "Ledger" replaced by "Pulse Catalog"; first built surface is the dashboard | User picked Pulse Catalog on a bolder re-roll over a hand led by Departure Board. Source world: Factory Records/Saville catalog sleeve (`brand-identity-canon-saville-catalog-sleeve`, seed `4697e0ff730f052b`). Dark only, radius 0, hairline regions, one-job code colours, Schibsted Grotesk. Open: the logo mark still carries the old amber and the `brand/` SVG and extension icons are not updated; problems, review, lists, auth and the Chrome extension inherit tokens but are not recomposed (the extension's popup and overlay still carry their own copy of the Ledger palette); mobile nav links are hidden below `md`, which predates the redesign. |
| 2026-11-18 | Dashboard clarity pass: stacked recall plot replaced by the labelled due timeline; plain section heads | User found the unlabelled ridge plot meaningless and the sections' purpose unclear. Each region now opens with a heading naming its job and one explaining sentence; the first viewport pairs what to do now with tonight's plan; the figure became one named row per problem with its due day. |
| 2026-11-18 | Dashboard rebuilt as insights that replace the spreadsheet | User found the page dense and low in value; it must give everything a tracking spreadsheet gives and more. Sections now each state one finding as a sentence: tonight's plan, list progress with projected finish dates, a topic map with verdicts, what's slipping from memory, and whether confidence is improving, with the spreadsheet-style log kept at the end. The due timeline was dropped. |
| 2026-11-18 | Whole app redone as "Whiteboard", replacing Pulse Catalog | User rejected Pulse Catalog as dense and low value. New direction confirmed with the user: light whiteboard ground, marker-ink colours, Recursive with a casual marker axis for headlines, and a yellow highlighter as the single signal for fading problems. Today simplified to four blocks; Problems became a filterable spreadsheet view; Review, Lists, landing, auth and gate restyled. Open: extension popup and overlay still use the old Ledger palette; brand/ SVGs and app icon not updated; Blind 75 and NeetCode 150 data are missing 3 and 10 problems. |
| 2026-11-18 | Original logo and Ledger colours restored on the Whiteboard layout | User wanted the original mark and the graphite, warm ink and amber palette kept, with the new layout. The extension popup and overlay got the same treatment. |
| 2026-11-18 | UI font changed from Recursive to Mona Sans | User disliked Recursive. Compared Mona Sans, Geist and Hanken Grotesk on a slice of the app; user chose Mona Sans. Headlines use its width axis at 112%. Applied to the web app and the extension. |
| 2026-11-18 | Landing page rebuilt with Aceternity UI, product-first | User asked for an interactive landing page inspired by sidekickmachines.com, then rejected the first pass for copying its look (dot-grid canvas, left-to-right pipeline). Rebuilt around the product itself: the Today dashboard tilts into view under a flipping "Stop forgetting ___" highlighter headline, a drag-to-compare spreadsheet vs LeetPro panel, an extension overlay on a tilting card that runs the real scheduler, the forgetting curve, a beams CTA and a hover-reveal wordmark footer. Aceternity components live in src/components/ui and were restyled to this palette; Card Spotlight was dropped because it pulls in three.js. |
| 2026-11-18 | Landing mocks render as fixed-size screenshots | User found the dashboard mock and the spreadsheet comparison obviously hand-built: they reflowed and truncated names as width changed, and the comparison squeezed while dragging. Both now lay out once at a fixed pixel size (with a separate phone layout below about 600px) and scale to fit (`landing/shot.tsx`). The comparison puts LeetPro left and the sheet right with rows aligned, so dragging is a plain wipe. |
| 2026-11-18 | Problem detail page recomposed around a memory chart | User found the page too basic. Within the Ledger system: the problem's own recall curve replaces the flat stat row, attempts became a timeline instead of a card stack, and Log attempt moved onto the page. A summary sentence over the attempts was tried and removed at the user's request. |
