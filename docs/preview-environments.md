# Preview Environments

## Goal

Every meaningful branch should be able to produce a Vercel preview that is safe to verify and close to production behavior.

## Recommended Topology

- Vercel production -> production Supabase
- Vercel preview -> preview/staging Supabase
- local development -> local `.env.local` or a non-production hosted database

## Minimum Preview Contract

Preview verification expects:

- `PREVIEW_URL`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- one of `POSTGRES_PRISMA_URL` or `DATABASE_URL`

Validate it with:

```bash
npm run env:check -- preview
```

## GitHub Workflow

`.github/workflows/preview-qa.yml` is the manual repo entrypoint for preview validation.
`.github/workflows/preview-qa-auto.yml` is the automatic repo entrypoint for Vercel deployment-driven validation.
`.github/workflows/sync-vercel-preview-branch-env.yml` is the hosted branch-env sync lane for keeping Vercel Preview aligned with GitHub preview secrets.

It expects these GitHub secrets if you want realistic preview checks:

- `PREVIEW_SITE_URL`
- `PREVIEW_SUPABASE_URL`
- `PREVIEW_SUPABASE_ANON_KEY`
- `PREVIEW_SUPABASE_SERVICE_ROLE_KEY`
- `PREVIEW_POSTGRES_PRISMA_URL`
- `PREVIEW_DATABASE_URL`
- `PREVIEW_CRON_SECRET`
- `PREVIEW_RESEND_API_KEY`

For hosted Vercel branch env sync, also set:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Then run the manual workflow with:

- `preview_url` = the live Vercel preview URL

The automatic workflow runs when GitHub receives a successful non-production deployment status from Vercel and the deployment URL resolves to `vercel.app`.

## Pulling Preview Variables Locally

Once Vercel auth is available in WSL, pull preview envs with:

```bash
npm run vercel:env:pull:preview
```

Pull production envs with:

```bash
npm run vercel:env:pull:production
```

## Stabilization Guidance

- Never let preview builds depend on production-only secrets
- Prefer a dedicated preview Supabase project or branchable database lane
- Mirror preview-safe Supabase and preview-safe Vercel secrets into GitHub Actions so route verification is checking the same lane your deployment uses
- Use hosted GitHub Actions for preview branch env sync so branch updates from Claude, Cursor, Codex, or local pushes stay aligned even when your machine is offline
- Keep preview route checks limited to smoke coverage until the platform type surface is stable
- Expand preview checks only after the current TypeScript/Prisma drift is fixed
