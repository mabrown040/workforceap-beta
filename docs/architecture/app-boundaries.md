# WorkforceAP app boundaries

## Canonical split

- `apps/marketing` = **Astro** public acquisition site
- repo root (`app/`, `components/`, `lib/`, `prisma/`, `tests/`) = **Next.js** portal/admin/application stack

## Ownership rules

### Astro owns
- homepage + brochure pages
- program catalog marketing presentation
- employers / partners landing pages
- public SEO pages, static marketing copy, campaign pages
- light-theme-only marketing chrome

### Next.js owns
- authentication
- application funnel state and account creation
- member / counselor / employer / partner / admin portals
- Prisma, Supabase, API routes, cron jobs
- runtime personalization and protected data

## Shared but not yet extracted

These remain in the repo root for now and should be treated as shared contracts until extracted into `packages/`:

- `content/`
- `messages/`
- `public/` shared assets
- brand/token references in CSS

## Transitional repo map

```text
apps/
  marketing/          # Astro app
app/                  # Next.js routes
components/           # Next.js React components
lib/                  # Next.js domain code
prisma/               # Prisma schema + seeds
supabase/             # SQL / platform state
docs/                 # runbooks, audits, architecture
packages/             # reserved for future shared extraction
```

## Immediate structural goals

1. Keep all new marketing-only work inside `apps/marketing`.
2. Keep all new portal/admin/auth/data work in the Next.js root app.
3. Avoid creating duplicate content/data definitions in both apps.
4. Extract shared tokens/content into `packages/` only when two live consumers actually need them.
