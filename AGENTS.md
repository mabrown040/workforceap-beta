# AGENTS.md

## Cursor Cloud specific instructions

This is a **Next.js 15 (App Router)** website — a replica of the live Squarespace-hosted site at [workforceap.org](https://workforceap.org), intended for self-hosting without Squarespace. The live Squarespace site is the visual reference for how pages should look.

### Running the dev server

```bash
npm run dev
```

Or for production build + serve:

```bash
npm run build && npm start
```

Open `http://localhost:3000` in a browser.

### Project structure

- `app/` — Next.js App Router pages (10 routes)
  - `layout.tsx` — root layout with TopBanner, MainNav, ScrollAnimations, and global CSS
  - `page.tsx` — homepage
  - `apply/`, `programs/`, `what-we-do/`, `how-it-works/`, `faq/`, `contact/`, `leadership/`, `salary-guide/`, `program-comparison/` — inner pages
- `components/` — shared React components (TopBanner, MainNav, Footer, PageHero, PhotoHighlight, ScrollAnimations)
- `css/main.css` — all styles (imported globally via layout.tsx)
- `public/images/` — static image assets
- `next.config.ts` — Next.js configuration including redirects for old `.html` URLs
- `Caddyfile` — production reverse-proxy config
- `DEPLOY.md` — production deployment instructions
- `docs/COMPLETED-WORK-LOG.md` — shipped tasks (backlog hygiene: `docs/BACKLOG-MAINTENANCE.md`)

### Lint / Test / Build

```bash
npm run lint          # ESLint (~~5 known errors~~ — Burned down 2026-05-20, gate flipped)
npm run typecheck     # TypeScript type-checking (tsc --noEmit)
npm run test:unit     # Node.js test runner (lib/**/*.test.ts) — 424 pass, 3 pre-existing failures
npm run build         # Full production build (Prisma generate + next build)
```

Note: `npm run build` runs ESLint at build time (gate flipped 2026-05-20 — `eslint.ignoreDuringBuilds: false`). Use `npm run typecheck` and `npm run lint` separately for faster feedback during development.

### Environment notes

- Dependencies are restored on startup by the update script (`corepack pnpm@10 install --frozen-lockfile`), whose `postinstall` runs `prisma generate`. No manual install step is needed before running the app.
- Prisma generates with a placeholder DB URL when no `DATABASE_URL` / `POSTGRES_PRISMA_URL` is set, so install and `npm run build` succeed without credentials (the build does not execute runtime DB queries).
- The homepage redirects from `/` to `/en` (i18n locale prefix). Use `curl -L http://localhost:3000/` to follow the redirect.

#### A running Postgres is required to serve pages (not just portal/auth)

The root layout (`app/layout.tsx` → `lib/tenant/organization.ts`) queries `prisma.organization` for the default org on **every** request, so even the public marketing pages (`/en`, `/en/programs`, `/en/faq`, …) return **HTTP 500** at runtime unless a Postgres DB is reachable and the default org (slug `workforceap`) is seeded. (This supersedes any older note claiming marketing pages run with no external services.)

#### Local Postgres setup (Cursor Cloud)

A local PostgreSQL 16 server is installed in the VM for development. After a fresh VM boot, start it and verify the DB before running the app:

```bash
sudo pg_ctlcluster 16 main start   # start the cluster (idempotent; ignore "already running")
pg_lsclusters                      # should show 16/main online on port 5432
```

DB connection is configured via gitignored `.env.local` and `.env` (Next reads `.env.local`; the Prisma wrapper `scripts/prisma-env.js` reads `.env`), both pointing at:
`postgresql://wap:wap@127.0.0.1:5432/workforceap` (role `wap` / db `workforceap`).

If the DB/schema/seed is missing (e.g. fresh DB), create the schema and seed the default org + demo data with:

```bash
npm run db:push    # syncs schema.prisma directly (NOT migrate — see below)
npm run db:seed    # upserts default org `workforceap`, roles, programs, demo jobs, blog
```

**Do not use `npm run db:migrate:deploy` for local dev** — the migration history has a duplicate `partner_users` migration (`20260319100000_add_partner_users` and `20260320000000_add_partner_users`) that fails with Prisma `P3018` / Postgres `42P07 relation "partner_users" already exists`. Production uses `build:with-migrate` (`scripts/safe-migrate.cjs` + `resolve-failed-migration*`) to work around it; for local dev, `db:push` is simpler and authoritative.

#### Features that still need external credentials (degrade gracefully)

These render their UI but fail at the action step without the listed secrets:
- **Career quiz / find-your-path / interest profiler** — need `ONET_API_KEY` (scoring returns "Career matching tools are not configured").
- **Contact form** (`/api/contact`) — needs `RESEND_API_KEY` (returns 503 otherwise).
- **Apply / signup + all portal/auth pages** (`/dashboard/*`, `/admin/*`, `/employer/*`, …) — need Supabase creds (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
- **Donate** — needs Stripe keys.

A good credential-free smoke test of core functionality is the interactive program comparison tool at `/en/program-comparison` (select 2+ programs → side-by-side matrix; fully client-side over the seeded catalog).

## Stitch MCP (designs)

Use the **Google Stitch MCP** from Cursor when you need authoritative UI reference or new screens before coding. Cursor should use the **hosted MCP tools** (not the shell CLI) unless you are outside Cursor.

### Project and docs

- **Stitch project ID:** `18255988866302206897`
- **CLI / Bearer token / screen ID table:** [.stitch/STITCH-MCP-PROTOCOL.md](.stitch/STITCH-MCP-PROTOCOL.md)
- **Refreshing API access / canvas workflow:** [.stitch/STITCH-REFRESH-PROTOCOL.md](.stitch/STITCH-REFRESH-PROTOCOL.md)
- **Dark Stitch reference HTML (layout/shell only):** [.stitch/golden-screens-stitch-dark.json](.stitch/golden-screens-stitch-dark.json) — replace fictional “Civic Bridge” copy with WorkforceAP in product.

### Auth (do not commit keys)

- **Cursor MCP:** configured with `X-Goog-Api-Key` — set environment variable `GOOGLE_STITCH_API_KEY` (see your user `mcp.json`).
- **CLI `stitch-mcp`:** uses `STITCH_API_KEY` Bearer flow as documented under `.stitch/`.

### When to call Stitch MCP

**Use it when:**

- Building or refactoring **marketing or portal UI** that must **match Stitch mocks** (mobile/desktop parity, spacing, components).
- There is **no local spec** and you need a **first design** or variant before implementation.
- You need **design system** tokens (fonts, colors, roundness) to align `tailwind.config.ts` and `css/main.css` with Stitch.

**Skip it when:**

- The work is **logic, API, or database only** with no visual contract.
- The page already matches production and the change is a **small copy or bugfix** with no design ambiguity.

### Recommended MCP tool order (in Cursor)

1. **`mcp_stitch_list_projects`** (optional) — confirm access and discover project IDs if needed.
2. **`mcp_stitch_list_screens`** with `projectId: "18255988866302206897"` — find screens by title or id.
3. **`mcp_stitch_get_screen`** — use resource name `projects/18255988866302206897/screens/<screenId>` (see screen ID table in `STITCH-MCP-PROTOCOL.md`).
4. **`mcp_stitch_generate_screen_from_text`** or **`mcp_stitch_edit_screens`** — new screens or iterations from a precise prompt.
5. **`mcp_stitch_list_design_systems`** then **`mcp_stitch_apply_design_system`** — align multiple screens to one design system.

Implement the resulting layout and copy in `app/` and `components/`; treat Stitch output as the design source of truth when the task says to match Stitch.
