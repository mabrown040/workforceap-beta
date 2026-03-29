# WorkforceAP Dev Workflow

## Goal

Move the repo toward a repeatable loop:

idea -> implementation -> local verify -> preview verify -> merge

## Daily Loop

Use Node `22` locally for parity with CI and preview workflows.

1. Start local app with `npm run dev:stack`
2. Run `npm run repo:sync` before starting agent work so local stays fast-forwarded with GitHub
3. Make changes on a short-lived branch
4. Run `npm run ship:check` before opening or updating a PR
5. Use `npm run qa:preview -- --url <preview-url>` against the Vercel preview
6. Merge only after CI is green

## Commands

- `npm run dev:stack`
  Starts the local app after Prisma client generation and prints the critical route set.

- `npm run typecheck`
  Runs TypeScript validation.

- `npm run test:unit`
  Runs Node unit tests under `lib/**/*.test.ts`.

- `npm run build`
  Runs safe Prisma migration logic, Prisma generate, and the Next.js production build.

- `npm run qa:smoke`
  Runs the baseline Playwright smoke lane for auth, visual regression smoke, and critical marketing routes.

- `npm run qa:preview -- --url <preview-url>`
  Verifies the critical route set against a deployed preview.

- `npm run ship:check`
  Full local pre-PR gate: typecheck, unit tests, build, and smoke e2e.

- `npm run tooling:doctor`
  Checks the local team-tooling lane: Codex, Claude, Kimi, Cursor, Jules, Vercel, Supabase, repo linkage, and preview workflow readiness.

- `npm run repo:sync`
  Fetches `origin` and fast-forwards the current branch when the worktree is clean so local OpenClaw sessions do not start behind GitHub.

- `npm run vercel:env:pull:preview`
  Pulls Vercel Preview environment variables into `.env.preview.local`.

- `npm run vercel:env:pull:production`
  Pulls Vercel Production environment variables into `.env.production.local`.

## Critical Routes

The current preview/local smoke set checks:

- `/`
- `/programs`
- `/apply`
- `/login`
- `/faq`
- `/contact`
- `/jobs`

## CI

- `.github/workflows/ci.yml`
  Runs typecheck, unit tests, build, and smoke e2e on PRs and non-`master` pushes.

- `.github/workflows/preview-qa.yml`
  Manual workflow for verifying a specific preview URL.

- `.github/workflows/preview-qa-auto.yml`
  Automatic preview verification when GitHub receives a successful non-production Vercel deployment status.

- `.github/workflows/sync-vercel-preview-branch-env.yml`
  Hosted GitHub Actions sync that reapplies preview branch environment variables on branch pushes and PR updates, even when local machines are offline.

## Environment Contracts

- `npm run env:check -- ci`
  Validates the lightweight CI contract.

- `npm run env:check -- preview`
  Validates preview expectations for Vercel + Supabase.

- `npm run env:check -- production`
  Validates the full production contract.

## Notes

- The production deploy workflow is still separate and self-hosted.
- Prisma scripts are already placeholder-safe when no real database env is set, so CI can build without production DB credentials.
- Linting is not yet wired as a first-class gate because the repo does not currently define an ESLint config.
- Preview environment guidance lives in `docs/preview-environments.md`.
- Tool-specific operating notes live in `docs/tool-playbooks/`.
- Start with `npm run tooling:doctor` when setting up a new machine or after auth/tooling changes.
