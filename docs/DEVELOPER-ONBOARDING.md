# Developer Onboarding Guide

> **Time to first page:** 15–30 min (with all credentials)  
> **Time to productive:** 2–4 hours (familiarity with conventions)

---

## 1. Tech Stack Overview

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Framework** | [Next.js 15](https://nextjs.org) (App Router) | Server Components by default; Edge runtime for middleware |
| **Language** | TypeScript 5 | Strict mode enabled; `paths: { "@/*": ["./*"] }` |
| **Database** | PostgreSQL (Supabase) | Prisma 5.22 ORM; connection pooled via PgBouncer |
| **Auth** | Supabase Auth | JWT sessions; MFA for staff; role-based access |
| **Styling** | Tailwind CSS 3.4 + custom CSS | `wa-` prefix on Tailwind; `css/main.css` is the design system source |
| **i18n** | [next-intl](https://next-intl-docs.vercel.app) | 4 locales: `en`, `es`, `fr`, `pt`. English is fallback. |
| **Testing** | Vitest (unit) + Playwright (E2E) | Separate configs; E2E loads `.env.e2e.local` |
| **Email** | React Email + Resend | Templates in `/emails`; preview with `npm run email` |
| **AI / LLM** | Anthropic, Groq, Gemini | Fallback chain for resilience |
| **Voice** | ElevenLabs ConvAI | Conversational AI agents for interviews and member career-coaching flows |
| **Learning** | Coursera Enterprise / B4B | xAPI + SSO integration for course progress |
| **Payments** | Stripe | Org onboarding tiers |
| **Monitoring** | Sentry + Vercel Analytics | Error tracking + Web Vitals |
| **Rate Limiting** | Upstash Redis | Optional but recommended for public forms |

---

## 2. Project Structure

```
wap-repo/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Auth route group (login, signup, etc.)
│   ├── (portal)/           # Member portal route group (dashboard, etc.)
│   ├── (decision-journey)/ # Marketing flow route group
│   ├── api/                # API routes (REST + cron handlers)
│   ├── admin/              # Admin dashboard pages
│   ├── apply/              # Public application flow
│   ├── blog/               # Blog/CMS pages
│   ├── employers/          # Employer portal
│   ├── partners/           # Partner portal
│   └── ...                 # Marketing pages (what-we-do, faq, etc.)
├── components/             # React components
│   ├── admin/              # Admin-specific UI
│   ├── dashboard/          # Member dashboard widgets
│   ├── marketing/          # Public site components
│   ├── portal/             # Shared portal chrome
│   ├── ui/                 # Primitive UI components
│   └── ...
├── lib/                    # Business logic & utilities
│   ├── ai/                 # LLM clients, prompts, tool calls
│   ├── auth/               # Auth guards, roles, MFA
│   ├── career/             # Career recommendation engine
│   ├── coursera/           # Coursera API + xAPI clients
│   ├── cron/               # Cron job handlers
│   ├── db/                 # Prisma client singleton
│   ├── email/              # Email sending wrappers
│   ├── employer/           # Employer match logic
│   ├── http/               # HTTP utilities (CORS, rate limit)
│   ├── i18n/               # i18n config, locale helpers
│   ├── jobs/               # Job board logic
│   ├── marketing/          # Marketing utilities
│   ├── member/             # Member domain logic
│   ├── onboarding/         # Onboarding flows
│   ├── partner/            # Partner domain logic
│   ├── placement/          # Placement tracking
│   ├── security/           # Rate limiting, captcha
│   ├── stripe/             # Stripe integration
│   ├── supabase/           # Supabase client factories
│   ├── tenant/             # Multi-tenant / org isolation
│   ├── validation/         # Zod schemas
│   └── ...
├── prisma/
│   ├── schema.prisma       # Database schema (2000+ lines)
│   ├── migrations/         # Migration files
│   ├── seed.ts             # Main seed script
│   ├── seed-demo.ts        # Demo data seed
│   └── fixtures/           # Test fixture data
├── tests/
│   ├── e2e/                # Playwright E2E specs
│   ├── api/                # API integration tests
│   └── lib/                # Unit tests
├── messages/               # i18n JSON files (en.json, es.json, fr.json, pt.json)
├── i18n/
│   └── request.ts          # next-intl request config (deep-merge fallback)
├── css/
│   └── main.css            # Design system: variables, resets, component classes
├── emails/                 # React Email templates
├── scripts/                # One-off scripts, build helpers
│   ├── prisma-env.js       # Wrapper that ensures POSTGRES_* env vars before Prisma
│   ├── safe-migrate.cjs    # Migration safety wrapper
│   ├── cronq.ts            # Cron job local runner
│   └── ...
├── public/                 # Static assets
├── supabase/               # Supabase CLI migrations (if any)
├── middleware.ts           # Next.js middleware: auth, i18n, tenant resolution
├── next.config.ts          # Next.js config (rewrites, redirects, CSP headers)
├── tailwind.config.ts      # Tailwind with `wa-` prefix, no preflight
├── vitest.config.ts        # Unit test config
├── playwright.config.ts    # E2E test config
└── .env.example            # Full env variable reference
```

---

## 3. Getting Started

### 3.1 Clone & Install

```bash
git clone <repo-url>
cd wap-repo
corepack pnpm@10 install --frozen-lockfile
```

> **Note:** This project uses `pnpm-lock.yaml` as the canonical dependency lockfile. CI installs with pnpm 10, then runs the `npm run ...` scripts below.

### 3.2 Environment Variables

```bash
cp .env.example .env.local
```

Fill in the **minimum required** variables to boot locally:

```bash
# Core
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database (from Supabase Dashboard → Project Settings → Database)
POSTGRES_PRISMA_URL=postgresql://...
POSTGRES_URL_NON_POOLING=postgresql://...
# Or for local dev, DATABASE_URL alone works (scripts/prisma-env.js copies it)
DATABASE_URL=postgresql://...

# Security (generate with: openssl rand -hex 32)
CRON_SECRET=...
PLACEMENT_SURVEY_TOKEN_SECRET=...
AUTH_TRUST_COOKIE_SECRET=...

# Email (optional for local dev — emails log to console if missing)
RESEND_API_KEY=...
EMAIL_FROM=noreply@workforceap.org
```

Full documentation: [`docs/ENVIRONMENT-VARIABLES.md`](ENVIRONMENT-VARIABLES.md)

### 3.3 Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed with test data
npm run db:seed

# (Optional) Seed demo data
npm run db:seed:demo
```

### 3.4 Start Dev Server

```bash
npm run dev
```

App runs at `http://localhost:3000`.

### 3.5 Run Tests

```bash
# Unit tests (Vitest)
npm run test:unit

# Type check
npm run typecheck

# Lint
npm run lint

# E2E tests (requires dev server running or set PLAYWRIGHT_BASE_URL)
npm run test:e2e

# E2E with UI
npm run test:e2e:ui

# Full preflight (typecheck + local build)
npm run preflight
```

### 3.6 Preview Email Templates

```bash
npm run email
# Opens at http://localhost:3001
```

---

## 4. Key Conventions

### 4.1 Auth Patterns

**Server-side (Server Components, Server Actions, Route Handlers):**

```ts
import { getUser, getSession } from '@/lib/auth/server';

// In a Server Component
const user = await getUser();
if (!user) redirect('/login');
```

**Client-side (Browser):**

```ts
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

const supabase = createSupabaseBrowserClient();
const { data: { user } } = await supabase.auth.getUser();
```

**Role checks:**

```ts
import { hasRole, ROLES } from '@/lib/auth/roles';

if (await hasRole(userId, ROLES.ADMIN)) { ... }
```

**Key rule:** Middleware (`middleware.ts`) handles session refresh and protected-path redirects. Pages should not duplicate redirect logic — use `getUser()` for data, not auth gating.

### 4.2 API Route Patterns

All API routes live under `app/api/`. Use the standard Next.js App Router pattern:

```ts
// app/api/my-feature/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic'; // or 'force-static' where appropriate

export async function GET(request: Request) {
  // ...
  return NextResponse.json({ data });
}
```

**Cron jobs** live in `app/api/cron/` and are protected by `CRON_SECRET`:

```ts
// Verify cron secret
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### 4.3 Component Organization

| Directory | Purpose |
|-----------|---------|
| `components/marketing/` | Public site (landing pages, blog) |
| `components/portal/` | Shared member portal chrome (nav, layout) |
| `components/dashboard/` | Member dashboard widgets |
| `components/admin/` | Admin dashboard UI |
| `components/ui/` | Primitives (buttons, inputs, modals) — reusable anywhere |
| `components/apply/` | Application flow components |
| `components/forms/` | Form-specific components |

**Guideline:** If a component is used in exactly one page, colocate it in `app/<page>/` (App Router convention). If it's shared across pages, promote it to `components/`.

### 4.4 i18n Approach

- Marketing pages use `/{locale}/...` URLs (e.g., `/es/programs`).
- Portal pages are NOT prefixed — locale is stored in a cookie + header.
- Messages live in `messages/{locale}.json`.
- English is always loaded as fallback; missing keys resolve to English instead of throwing.
- Server Components: use `getTranslations()` from `next-intl/server`.
- Client Components: use `useTranslations()` from `next-intl`.

**Adding a key:** Add it to `messages/en.json` first, then sync to other locales.

### 4.5 Styling Approach

Two systems work together:

1. **Custom CSS** (`css/main.css`) — Design system source. CSS custom properties for colors, spacing, typography. Component classes (e.g., `.wa-btn`, `.wa-input`).
2. **Tailwind** (`tailwind.config.ts`) — Utility classes with `wa-` prefix (e.g., `wa-bg-brand-primary`). Preflight is **disabled** to avoid conflicts with custom resets.

**Rule of thumb:** Use Tailwind for layout/spacing utilities; use CSS component classes for styled elements. Check `css/main.css` before inventing new patterns.

### 4.6 Database & Prisma

- Single Prisma client singleton: `lib/db/prisma.ts` (always import from here).
- Migrations: `npm run db:migrate` (dev) / `npm run db:migrate:deploy` (production).
- Schema is large (~2000 lines). Use `prisma db pull` sparingly — schema is the source of truth.
- Soft deletes: many tables have `deletedAt`; always filter `deletedAt: null` for active rows.

---

## 5. Common Tasks

### 5.1 Adding a New API Route

```bash
# Create file
mkdir -p app/api/my-feature
touch app/api/my-feature/route.ts
```

```ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // ... logic
    return NextResponse.json({ success: true, data: [] });
  } catch (error) {
    console.error('/api/my-feature error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 5.2 Adding a New Page

```bash
# Marketing page (auto-locale-prefixed)
mkdir -p app/my-page
touch app/my-page/page.tsx

# Portal page (under dashboard)
mkdir -p "app/(portal)/dashboard/my-page"
touch "app/(portal)/dashboard/my-page/page.tsx"
```

Remember:
- Marketing pages need locale handling (middleware redirects to `/{locale}/page`).
- Portal pages should check auth via `getUser()` if data is user-specific.
- Add nav links to the appropriate layout or navigation component.

### 5.3 Adding a Prisma Model

1. Edit `prisma/schema.prisma`
2. Run `npm run db:migrate` (dev) to create a migration
3. Run `npm run db:generate` to update the client
4. Use the new model via `prisma.newModelName`

**Naming:** Use camelCase in Prisma, `@map("snake_case")` for DB column names.

### 5.4 Running Cron Jobs Locally

```bash
# Via the local runner script
npx tsx scripts/cronq.ts <job-name>

# Or hit the API route directly (with CRON_SECRET)
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/daily-jobs
```

Common cron jobs:
- `/api/cron/daily-jobs` — Daily maintenance (stale checks, recaps)
- `/api/cron/placement-survey` — Placement survey emails
- `/api/cron/coursera-sync` — Coursera progress sync

### 5.5 Debugging Common Issues

See [`docs/TROUBLESHOOTING.md`](TROUBLESHOOTING.md) for detailed solutions.

---

## 6. Scripts Reference

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |
| `npm run lint` | ESLint |
| `npm run check` | Typecheck + lint |
| `npm run preflight` | Full local build check |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run migrations (dev) |
| `npm run db:migrate:deploy` | Run migrations (prod) |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:seed` | Seed database |
| `npm run db:push` | Push schema (dev shortcut) |
| `npm run test:unit` | Vitest unit tests |
| `npm run test:e2e` | Playwright E2E tests |
| `npm run email` | Email template preview server |
| `npm run analyze` | Bundle analysis |

---

## 7. Further Reading

- [`docs/ENVIRONMENT-VARIABLES.md`](ENVIRONMENT-VARIABLES.md) — Complete env var documentation
- [`docs/TROUBLESHOOTING.md`](TROUBLESHOOTING.md) — Common issues & fixes
- [`docs/API-REFERENCE.md`](API-REFERENCE.md) — Internal API documentation
- [`docs/SECURITY-AND-HEALTH.md`](SECURITY-AND-HEALTH.md) — Security posture & CSP
- [`docs/TENANT-ISOLATION.md`](TENANT-ISOLATION.md) — Multi-tenant architecture
- [`docs/UI-DESIGN-SYSTEM.md`](UI-DESIGN-SYSTEM.md) — Design system details
- [`prisma/schema.prisma`](../prisma/schema.prisma) — Database schema
- [`middleware.ts`](../middleware.ts) — Request middleware
