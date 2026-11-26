<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Branching and pull requests

`development` is the integration branch. `main` is what's released.

- Start every change on its own branch cut from `development`, never from `main`.
- Open every pull request against `development`. Never open a feature or fix PR against `main`, and never push or commit to `main` directly.
- Only cut over to `main` when the owner says `development` is ready to release. Do that with one pull request from `development` into `main`, merged with a merge commit (not squash or rebase) so the two histories stay in line.
- If anything lands on `main` some other way (a hotfix, say), merge `main` back into `development` right away so `development` is never behind.
