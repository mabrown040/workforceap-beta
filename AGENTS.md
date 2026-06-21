# AGENTS.md

## Cursor Cloud specific instructions

Next.js 15 App Router — [workforceap.org](https://workforceap.org). Cloud agents **always use real Supabase** (dev or prod). No placeholder DB, no prod curl smoke as default.

### Start of every agent session

```bash
# 1. Supabase MCP → get_publishable_keys for the target project (see table below)
# 2. Cloud-agent secrets must include DB password + service role (see below)
# 3. Bootstrap + verify:
export WAP_AGENT_ENV=dev   # or prod — only when explicitly verifying production
export NEXT_PUBLIC_SUPABASE_ANON_KEY=<from MCP get_publishable_keys>
npm run agent:bootstrap
npm run agent:check-env
```

### Supabase projects (`config/agent-supabase.json`)

| `WAP_AGENT_ENV` | MCP `project_id` | Use |
|-----------------|------------------|-----|
| **dev** (default) | `jqddnyuszufndwwezdwp` | Vercel Preview, local `npm run dev`, agent work |
| **prod** | `jqddnyuszufndwwezdwp` | Production DB verification only — read-only unless tasked |
| **demo** | `esbdrgaonplpvzmtrdhw` | demo.workforceap.org |

Default org: slug `workforceap`, id `00000000-0000-4000-8000-000000000001`.

### Cloud-agent secrets (required)

| Secret | Purpose |
|--------|---------|
| `SUPABASE_DB_PASSWORD_DEV` | Builds `POSTGRES_*` URLs for dev |
| `SUPABASE_SERVICE_ROLE_KEY_DEV` | Portal/auth on dev |
| `SUPABASE_DB_PASSWORD_PROD` | Prod DB (only when `WAP_AGENT_ENV=prod`) |
| `SUPABASE_SERVICE_ROLE_KEY_PROD` | Prod service role |
| `PLAYWRIGHT_BASE_URL` | Vercel preview URL for E2E |
| `E2E_MEMBER_EMAIL` / `E2E_MEMBER_PASSWORD` | Portal E2E login |

Unsuffixed `SUPABASE_DB_PASSWORD` / `SUPABASE_SERVICE_ROLE_KEY` work as fallbacks.

Anon key is **not** a secret — fetch each session via MCP `get_publishable_keys` or pass `npm run agent:bootstrap -- --anon-key=...`.

### Supabase MCP workflow

| Task | MCP tool |
|------|----------|
| Schema inspection | `list_tables` |
| Data verification | `execute_sql` (read-only by default) |
| Migration status | `list_migrations` vs `prisma/migrations/` |
| DDL changes | `apply_migration` (only when explicitly tasked) |
| Anon key for bootstrap | `get_publishable_keys` |

**Dev agents:** `project_id: "jqddnyuszufndwwezdwp"`. Do not write to prod unless the task says so.

### Running the dev server

```bash
npm run agent:bootstrap && npm run agent:check-env
npm run dev
```

Open `http://localhost:3000` → redirects to `/en`.

### Lint / Test / Build

```bash
npm run typecheck     # always
npm run test:unit     # 698+ tests, required CI gate
npm run build         # Prisma generate + next build
npm run lint          # report-only in CI
npm run test:e2e      # PLAYWRIGHT_BASE_URL=<preview> — not prod
```

### Testing tiers

| Tier | Command | DB |
|------|---------|-----|
| Static gates | `typecheck`, `test:unit`, `build` | No |
| Supabase MCP | `execute_sql`, `list_tables` | Remote dev/prod project |
| Local dev | `npm run dev` | Real Supabase via bootstrap |
| E2E | `PLAYWRIGHT_BASE_URL=<vercel-preview>` | Preview's Supabase (same dev project) |
| Prod verification | `WAP_AGENT_ENV=prod` + prod secrets | Only when explicitly asked |

## Stitch MCP (designs)

Use the **Google Stitch MCP** when building UI that must match Stitch mocks. Project ID: `18255988866302206897`. See `.stitch/STITCH-MCP-PROTOCOL.md`.
