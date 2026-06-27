# Apps

- `marketing/` — Astro public marketing site
- `portal/` — reserved canonical location for the Next.js authenticated app if/when the portal is moved under `apps/`

Current transitional state:
- Astro marketing lives in `apps/marketing`
- Next.js portal/admin/app currently remains at repo root (`app/`, `components/`, `lib/`, `prisma/`, `tests/`)

Do not duplicate logic across both apps. Marketing owns public acquisition pages; Next owns authenticated workflows, admin, employer, counselor, partner, and member portal surfaces.
