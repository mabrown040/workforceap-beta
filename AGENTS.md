# AGENTS.md

## Cursor Cloud specific instructions

This is a **Next.js 15 (App Router)** website — a replica of the live Squarespace-hosted site at [workforceap.org](https://workforceap.org), intended for self-hosting without Squarespace. The live Squarespace site is the visual reference for how pages should look.

### Running the dev server

```bash
npm run agent:bootstrap   # first: write .env.local from cloud-agent secrets (see below)
npm run agent:check-env   # verify runtime secrets before dev/E2E
npm run dev
```

Or for production build + serve:

```bash
npm run build && npm start
```

Open `http://localhost:3000` in a browser. The homepage redirects from `/` to `/en` (i18n locale prefix). Use `curl -L http://localhost:3000/` to follow the redirect.

### Project structure

- `app/` — Next.js App Router pages (marketing, portal, admin, API routes)
- `components/` — shared React components
- `css/main.css` — global styles (imported via `layout.tsx`)
- `public/images/` — static image assets
- `lib/` — server utilities, auth, tenant scoping, integrations
- `prisma/` — schema and migrations
- `tests/e2e/` — Playwright specs
- `config/agent-supabase.json` — **public** dev/demo Supabase project metadata (refs, URLs, default org id)

### Lint / Test / Build

```bash
npm run lint          # ESLint (warnings only in CI; 0 errors gate on build)
npm run typecheck     # TypeScript type-checking (tsc --noEmit)
npm run test:unit     # Node.js test runner — 694 pass, required CI gate
npm run test:vitest   # Vitest component/API specs — report-only in CI today
npm run build         # Full production build (Prisma generate + next build)
npm run test:e2e      # Playwright — prefer PLAYWRIGHT_BASE_URL=<Vercel preview>
```

Note: `npm run build` runs ESLint at build time. Use `npm run typecheck` and `npm run lint` separately for faster feedback during development.

### Cloud agent testing (dev Supabase + Vercel preview)

**Do not use production as the default test target.** The team uses a separate **dev Supabase** project and **Vercel preview** deployments.

#### Supabase projects (public metadata in `config/agent-supabase.json`)

| Env | Project ref | URL | Use |
|-----|-------------|-----|-----|
| **dev** | `jqddnyuszufndwwezdwp` | `https://jqddnyuszufndwwezdwp.supabase.co` | Vercel Preview + local dev |
| **demo** | `esbdrgaonplpvzmtrdhw` | `https://esbdrgaonplpvzmtrdhw.supabase.co` | `demo.workforceap.org` |

Default org: slug `workforceap`, id `00000000-0000-4000-8000-000000000001`.

#### Supabase MCP (schema / SQL without local Postgres)

Use the **Supabase MCP** for database work when cloud-agent secrets are missing or you only need to verify schema/data:

1. `list_projects` — confirm access
2. `list_tables` with `project_id: "jqddnyuszufndwwezdwp"` — inspect schema
3. `execute_sql` — read-only verification queries (org row, migration state, seed data)
4. `apply_migration` — DDL only when explicitly tasked with a migration
5. `list_migrations` — compare against `prisma/migrations/`

**Do not** hit production Supabase for agent work. Dev project ref: `jqddnyuszufndwwezdwp`.

#### Bootstrap local env from cloud-agent secrets

Add these to **Cursor cloud-agent environment secrets** (Settings → Cloud Agents → Secrets):

| Secret | Required for | Notes |
|--------|--------------|-------|
| `POSTGRES_PRISMA_URL` | `npm run dev`, portal routes | Dev Supabase → Database → Connection pooling (6543) |
| `POSTGRES_URL_NON_POOLING` | `db:migrate`, `db:seed` | Direct connection (5432) |
| `SUPABASE_SERVICE_ROLE_KEY` | Portal auth, admin | Dev project → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client auth | Dev project → API (publishable) |
| `PLAYWRIGHT_BASE_URL` | E2E without local dev | **Vercel preview URL for the PR branch** |
| `PLAYWRIGHT_VERCEL_SHARE_URL` | Password-protected previews | Full share URL with `_vercel_share` |
| `E2E_MEMBER_EMAIL` / `E2E_MEMBER_PASSWORD` | Portal E2E login | Seeded QA account on dev |

Then run:

```bash
npm run agent:bootstrap    # writes .env.local (+ .env.e2e.local if E2E vars set)
npm run agent:check-env    # reports missing secrets
```

Optional: `WAP_AGENT_ENV=demo` to target the demo Supabase project instead of dev.

#### Testing tiers (what works without secrets)

| Tier | Commands | Needs DB? |
|------|----------|-----------|
| **Static gates** | `typecheck`, `lint`, `test:unit`, `build` | No — always run these |
| **Supabase MCP** | `execute_sql`, `list_tables`, `apply_migration` | Uses dev project remotely |
| **Local dev server** | `npm run dev` + browser | Yes — bootstrap secrets or MCP can't substitute |
| **Playwright E2E** | `PLAYWRIGHT_BASE_URL=https://<preview>.vercel.app npm run test:e2e` | No local DB — preview has Vercel env |
| **Prod smoke** | Only when explicitly asked | Avoid for routine agent work |

#### Placeholder DB behavior (no secrets)

When no `POSTGRES_*` is set, Prisma uses a placeholder URL so `install` and `build` succeed. Root layout org bootstrap falls back to the seeded default org id so marketing pages can render instead of 500. Portal routes still need real Supabase credentials.

### Environment notes

- **Marketing pages** render with placeholder DB (org fallback). Full fidelity needs dev Supabase or Vercel preview.
- **Portal/auth pages** (`/dashboard/*`, `/admin/*`, `/employer/*`, etc.) require Supabase credentials and Postgres.
- Prisma generates with a placeholder DB URL when no `DATABASE_URL` / `POSTGRES_PRISMA_URL` is set.

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
