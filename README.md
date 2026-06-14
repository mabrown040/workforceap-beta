# WorkforceAP

[WorkforceAP](https://www.workforceap.org) is a 501(c)(3) nonprofit providing no-cost career training programs to low-income and underemployed adults in Austin/Central Texas and beyond.

This repository contains the full Next.js application — public marketing site, member portal, employer/partner dashboards, admin tools, AI-powered career coaching, and Coursera learning integration.

## Quick Start

```bash
# 1. Install dependencies
corepack pnpm@10 install --frozen-lockfile

# 2. Copy and fill env vars
cp .env.example .env.local

# 3. Set up the database
npm run db:generate
npm run db:migrate
npm run db:seed

# 4. Start the dev server
npm run dev
```

App runs at `http://localhost:3000`.

## Developer Onboarding

**New here?** Start with the comprehensive guide:

📖 **[Developer Onboarding Guide](docs/DEVELOPER-ONBOARDING.md)** — Tech stack, project structure, conventions, common tasks, and everything you need to get productive.

## Documentation

| Doc | What it's for |
|-----|---------------|
| [`docs/DEVELOPER-ONBOARDING.md`](docs/DEVELOPER-ONBOARDING.md) | **Start here** — full setup & conventions |
| [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) | Build failures, auth issues, database problems |
| [`docs/ENVIRONMENT-VARIABLES.md`](docs/ENVIRONMENT-VARIABLES.md) | Complete `.env` reference |
| [`docs/API-REFERENCE.md`](docs/API-REFERENCE.md) | Internal API documentation |
| [`docs/SECURITY-AND-HEALTH.md`](docs/SECURITY-AND-HEALTH.md) | Security posture & CSP |
| [`docs/TENANT-ISOLATION.md`](docs/TENANT-ISOLATION.md) | Multi-tenant architecture |
| [`docs/UI-DESIGN-SYSTEM.md`](docs/UI-DESIGN-SYSTEM.md) | Design system details |
| [`prisma/schema.prisma`](prisma/schema.prisma) | Database schema |

## Common Commands

```bash
npm run dev              # Dev server
npm run build            # Production build
npm run typecheck        # TypeScript check
npm run lint             # ESLint
npm run check            # Typecheck + lint
npm run db:migrate       # Run DB migrations
npm run db:studio        # Prisma Studio
npm run test:unit        # Unit tests (Vitest)
npm run test:e2e         # E2E tests (Playwright)
npm run email            # Email template preview
```

Use `pnpm-lock.yaml` as the canonical dependency lockfile. Do not install from
stale secondary lockfiles; CI installs with pnpm 10 and then runs the npm
scripts above.

## Tech Stack at a Glance

- **Framework:** Next.js 15 (App Router) + TypeScript 5
- **Database:** PostgreSQL (Supabase) + Prisma 5
- **Auth:** Supabase Auth with role-based access
- **Styling:** Tailwind CSS 3.4 + custom CSS design system
- **i18n:** next-intl (English, Spanish, French, Portuguese)
- **Testing:** Vitest + Playwright
- **AI:** Anthropic, Groq, Gemini (fallback chain)
- **Voice:** ElevenLabs Conversational AI
- **Learning:** Coursera Enterprise + xAPI

---

For questions or issues, check [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) or reach out to the team.
