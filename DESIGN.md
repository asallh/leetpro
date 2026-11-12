---
# gstack: design-md-format=spec
name: LeetPro
description: A dark, terminal-adjacent ledger of what you know and what you're forgetting; graphite, warm ink, one amber signal.
colors:
  background: "#16171A"
  surface: "#1E2024"
  surface-raised: "#26282D"
  text: "#E9E6DF"
  text-muted: "#9C988F"
  border: "#303238"
  primary: "#F0B429"
  on-primary: "#1A1408"
  due: "#F0B429"
  success: "#6CC48A"
  warning: "#F0B429"
  error: "#EF7B6A"
  light-background: "#EDEDEB"
  light-surface: "#FAFAF9"
  light-text: "#1A1B1E"
  light-text-muted: "#64666C"
  light-border: "#D6D6D2"
  light-due-text: "#8A5F00"
  light-success: "#1E7A45"
  light-error: "#B93A2A"
typography:
  display:
    fontFamily: JetBrains Mono
    fontWeight: 700
    fontSize: clamp(1.75rem, 3.6vw, 2.75rem)
    letterSpacing: -0.04em
  heading:
    fontFamily: JetBrains Mono
    fontWeight: 700
    fontSize: 1.5rem
    letterSpacing: -0.03em
  body:
    fontFamily: Hanken Grotesk
    fontSize: 0.9375rem
    lineHeight: 1.5
  label:
    fontFamily: JetBrains Mono
    fontSize: 0.75rem
    letterSpacing: 0
  mono:
    fontFamily: JetBrains Mono
    fontFeature: tnum
rounded:
  sm: 2px
  md: 3px
  lg: 4px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.lg}"
  button-primary-hover:
    backgroundColor: "#F4C451"
  input:
    borderColor: "{colors.border}"
    rounded: "{rounded.lg}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
  nav-link:
    textColor: "{colors.text-muted}"
---

# LeetPro

## Overview

**Creative North Star:** A ledger of your memory. Every problem you've solved is an entry, every entry has a recall estimate, and the one warm color in the room points at what you're about to forget.
**Product context:** Next.js web app plus a Chrome extension for people preparing for coding interviews on LeetCode and NeetCode. The extension logs attempts; the app schedules spaced-repetition reviews. Peers: LeetCode (orange on dark), NeetCode (near-black, purple Pro accent, traffic-light difficulty), and a long tail of small SRS trackers that all show the same due list with green/yellow/red badges.
**Memorable thing:** "It knows exactly what I'm about to forget."
**Mode per surface:**
- Dashboard, Problems, Review, Lists, extension popup: Operate. Scanned, dense, numbers line up.
- Landing and auth pages: Persuade, lightly. Same system, no marketing chrome.
**Reference sites:** https://neetcode.io/practice (observed 2026-11-10). LeetCode blocked the headless browser.
**Key characteristics:**
- Graphite ground, warm off-white ink, monospace headlines.
- Recall printed as a number with a five-step meter on every problem row.
- Amber appears only where you should act: due work and the primary action.
- Square-ish corners (4px max). Tables, not card grids.

## Colors

**Strategy:** Restrained. Warm neutrals plus one amber signal.
**Light or dark:** Dark by default. People open LeetPro next to a dark editor and a dark LeetCode tab, usually in the evening; a dark ledger sits beside them without glare. Light mode exists (`html` without `.dark`) with the same hierarchy, not an inversion.

- `primary` / `due` (amber) means "act here": the primary button, the due count, recall meters of due problems, the `›` marker on due rows. Never decorative, never a background wash.
- In light mode amber stays the button fill (`on-primary` text), but amber *text* switches to `light-due-text` (#8A5F00) to keep 4.5:1.
- Neutrals are warm (ink #E9E6DF, muted #9C988F) so the amber reads as part of the same world instead of a neon pop.
- `success` marks mastered problems and completed list entries; `error` is for destructive actions and validation only.
- Difficulty is never colored. See Components.

## Typography

JetBrains Mono is the display voice: page titles, the due headline, the wordmark, table headers, and every number the scheduler produces (problem IDs, recall %, intervals, dates, times). It reads like a log file, which is the point. Hanken Grotesk carries body and UI text (problem titles, descriptions, form labels, buttons) so long titles stay compact and readable.

- Loaded with `next/font/google` in `src/app/layout.tsx` as `--font-hanken` and `--font-jetbrains`; mapped to Tailwind `font-sans`, `font-mono` and `font-heading`.
- Verified 2026-11-10: Google Fonts CSS API returns 200; Next font data lists JetBrains Mono wght 100–800, Hanken Grotesk wght 100–900.
- Scale: display clamp(28px–44px) / heading 24px / section 14px semibold / body 15px / table 14px / label 12px mono.
- Mono headlines get wide fast: keep them under ~40 characters, tracking -0.03 to -0.04em.
- Always `tabular-nums` on columns of digits (the `.num` utility).

## Layout

- App container `max-w-6xl` (1152px), 16px side gutter, 24px vertical rhythm between sections.
- Dashboard: headline row, then a two-column grid (queue table | 340px side column with forecast and memory summary). Collapses to one column below `lg`.
- Problems, Review, Lists: full-width tables or flat lists inside a single bordered frame. No grids of identical cards.
- Table rows 44px; headers are mono, muted, not uppercased.
- Tables scroll horizontally inside their frame on narrow screens; the page never does.

## Elevation & Depth

Flat. Hierarchy comes from surface steps (background → surface → surface-raised) and 1px borders. Only floating layers (dialogs, dropdowns, the extension popup) get a shadow, and it's an offset soft shadow, never a glow.

## Shapes

`--radius` is 4px. Buttons, inputs, frames 4px; badges and glyphs 3px; meters 1px. No pills except the avatar.

## Components

- **Logo mark:** a graphite tile (rx 7 on a 32 grid) holding three ledger lines that shorten and fade top to bottom: ink #E9E6DF (16 wide), muted #8F8C85 (12), amber #F0B429 (8). The last, amber line is the entry that's due. Lines are 4 units tall on even rows, so at 16px each is exactly 2px and stays sharp. The tile stays graphite in light mode too.
  - Source of truth: `brand/leetpro-mark.svg` (rounded) and `brand/leetpro-mark-square.svg` (full-bleed, for iOS).
  - Web: `src/app/icon.svg`, `src/app/favicon.ico` (16/32/48), `src/app/apple-icon.png` (180), and `<Logo />` / `<LogoMark />` in `src/components/logo.tsx`.
  - Extension: `extension/icons/icon{16,32,48,128}.png` and the inline SVG in `extension/popup/popup.html`.
  - PNG and ICO files are rasterized from the brand SVG with the sharp copy Next.js already installs. Change the SVG first, then regenerate every size and update the two inline copies.
- **Wordmark:** `Leet` in ink + `Pro` in `due-text`, JetBrains Mono 700, tracking -0.04em, always to the right of the mark with an 8px gap. No `~/` prefix.
- **Difficulty glyph** (`DifficultyBadge`): a 22px mono square with E, M or H. Easy: outline border. Medium: outline in ink. Hard: filled ink with surface text. The full word is in `title` and `aria-label`.
- **Recall meter** (`RecallMeter`): five 6px squares plus the % in mono. Filled squares are ink; when the problem is due (recall < 70%) the filled squares and the % turn amber. Recall is an estimate from `lastAttemptDate` and `reviewInterval` (`src/lib/recall.ts`): it reaches 70% on the scheduled review date.
- **Due row marker:** due rows prefix the title with an amber `›`.
- **Buttons:** primary = amber fill. Outline = border + transparent. Ghost for row actions. Focus: 3px ring at 50% `ring` (amber). Disabled: 50% opacity.
- **Status label:** mono lowercase text (`new`, `learning`, `review`, `mastered`); mastered uses `success`, the rest muted. No colored pills.
- **Empty states:** say what will appear and how to get the first entry (usually: install the extension and solve a problem).

## Do's and Don'ts

- Do print every scheduler number in JetBrains Mono with tabular figures.
- Do use amber only for due work and the primary action on a screen.
- Do keep difficulty neutral (E · M · H glyph).
- Do use tables or flat lists for collections of problems.
- Don't add green/yellow/red difficulty or status colors.
- Don't add a second accent hue, gradients, or glows on dark surfaces.
- Don't build rows of big-number stat tiles; use a compact key/value list.
- Don't round anything past 4px (avatar excepted).

## Motion

- **Approach:** minimal-functional.
- **Easing:** enter(ease-out) exit(ease-out) move(ease-in-out)
- **Duration:** micro(50-100ms) short(150-250ms) medium(250-400ms) long(400-700ms)
- **The one authored moment:** after logging a review, the row's recall meter refills from amber to ink (medium duration). Respect `prefers-reduced-motion`.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-11-12 | Initial design system created ("Ledger") | Created by /design-consultation from product context, NeetCode research and a three-direction preview; user picked Ledger over Highlighter and Tide. |
| 2026-11-12 | Fading-ledger logo mark; shared across favicon, app and extension | Replaces the Next.js default favicon and the old extension icons; dropped the `~/` wordmark prefix now that the mark carries the terminal feel. |
