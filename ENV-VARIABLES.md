# WorkforceAP Environment Variables

This repo should treat environment setup as a three-lane contract:

- `development`
  Local `.env.local` and placeholder-safe CI build behavior
- `preview`
  Vercel Preview + preview-safe Supabase credentials
- `production`
  Vercel Production + production Supabase credentials

The repo validator is:

```bash
npm run env:check -- ci
npm run env:check -- preview
npm run env:check -- production
```

## Core Variables

### Supabase public

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Required for:

- preview
- production

### Supabase server

- `SUPABASE_SERVICE_ROLE_KEY`

Required for:

- production

Recommended for:

- preview if server-side admin flows are exercised there

### Prisma / database

- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `DATABASE_URL`

Rules:

- CI can build without a live DB because Prisma falls back to placeholders
- Preview requires at least one of `POSTGRES_PRISMA_URL` or `DATABASE_URL`
- Production should set both `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING`

### Site / routing

- `NEXT_PUBLIC_SITE_URL`
- `PREVIEW_URL`

Rules:

- `NEXT_PUBLIC_SITE_URL` should match the active lane URL
- `PREVIEW_URL` is required by preview verification workflows

### Operational secrets

- `CRON_SECRET`
- `RESEND_API_KEY`

Required for:

- production

Recommended for:

- preview if cron and outbound email need realistic verification

## Recommended Vercel Setup

### Development

- Keep `.env.local` for local-only values
- Use `NEXT_PUBLIC_SITE_URL=http://localhost:3000`

### Preview

Set these in Vercel Preview and mirror them into GitHub Actions preview secrets when needed:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `DATABASE_URL`
- `CRON_SECRET`
- `RESEND_API_KEY`

Recommended GitHub secrets for `.github/workflows/preview-qa.yml`:

- `PREVIEW_SITE_URL`
- `PREVIEW_SUPABASE_URL`
- `PREVIEW_SUPABASE_ANON_KEY`
- `PREVIEW_SUPABASE_SERVICE_ROLE_KEY`
- `PREVIEW_POSTGRES_PRISMA_URL`
- `PREVIEW_DATABASE_URL`
- `PREVIEW_CRON_SECRET`
- `PREVIEW_RESEND_API_KEY`

### Production

Set these in Vercel Production:

- `NEXT_PUBLIC_SITE_URL=https://www.workforceap.org`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `CRON_SECRET`
- `RESEND_API_KEY`

## Recommended Supabase Setup

### Preferred

- production Vercel project -> production Supabase project
- preview Vercel deployments -> preview or staging Supabase project / branch

### Avoid

- pointing every preview deployment at production write credentials
- sharing production service-role keys with preview environments

## CI Notes

- `ci.yml` validates the `ci` env contract and then runs typecheck, unit tests, build, and smoke tests
- `preview-qa.yml` validates the `preview` env contract before route verification
- current repo typecheck is still red because of existing app/schema drift; the env contract work is independent of that backlog

## Local Example

See [.env.example](/home/claw/.openclaw/workspace/projects/workforceap-beta/.env.example) for the starter template.
