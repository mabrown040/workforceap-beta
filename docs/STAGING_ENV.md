# Staging / Preview Environment — Supabase scoping

**Rule: Preview + local must use the DEMO project. Production must use the real project.**
Never let a preview deploy write to the real DB (real member PII + a redesign that
involves destructive testing). Enforced by `scripts/check-supabase-env.mjs`.

| Project | Ref | Used by |
|---|---|---|
| **workforceap-demo** | `esbdrgaonplpvzmtrdhw` | Vercel **Preview** + **Development** (local) |
| **real** | `jqddnyuszufndwwezdwp` | Vercel **Production** only |

## Vercel env vars — which value in which scope

Set each var **per scope** (Vercel → Project → Settings → Environment Variables → pick the scope).
Demo values go on **Preview + Development**. Real values go on **Production** only.

| Variable | Preview + Development (DEMO) | Production (REAL) |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://esbdrgaonplpvzmtrdhw.supabase.co` | real project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | demo publishable key (`sb_publishable_…`) | real publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | demo service_role (secret) | real service_role (secret) |
| `POSTGRES_PRISMA_URL` | demo pooled (`:6543?pgbouncer=true`) | real pooled |
| `POSTGRES_URL_NON_POOLING` | demo direct (`:5432`) | real direct |
| `DATABASE_URL` | demo pooled | real pooled |

All connection strings + the service_role key come from the Supabase dashboard
("Connect" button → Prisma tab; Settings → API). Secrets live only in Vercel env
and local `.env.local` (gitignored) — never in git or chat.

### Easiest path — Vercel ↔ Supabase integration
Vercel → Integrations → Supabase. **Attach `workforceap-demo` to the Preview environment**
and the real project to Production. The integration auto-injects `POSTGRES_PRISMA_URL`,
`POSTGRES_URL_NON_POOLING`, and the `SUPABASE_*` vars into the chosen scope — no hand-typing.
Verify after: each scope shows the correct project ref in the var values.

## The guard (make-sure-it-happens)

`scripts/check-supabase-env.mjs` reads `VERCEL_ENV` + the Supabase URLs and **fails the
build (exit 1)** if a scope is wired to the wrong project. On Vercel, the public,
pooled, and non-pooled URLs are required, unrecognized targets fail closed, and
`CI=1` cannot bypass the check:
- Preview/Development pointing at `jqddnyuszufndwwezdwp` → blocked
- Production pointing at `esbdrgaonplpvzmtrdhw` → blocked

Wire it into the build so a misconfig can never deploy. In `package.json`, prepend it to
the build (or run in CI before deploy):

```jsonc
// option A — gate every build
"prebuild": "node scripts/check-supabase-env.mjs",
// option B — run in CI / a Vercel "Ignored Build Step" check
```

Run locally any time:
```bash
node scripts/check-supabase-env.mjs
```

## Migration routing

`vercel.json` delegates to `npm run build:vercel`; the checked-in orchestrator
builds/copies the marketing bundle, then chooses exactly one application path.

- Production runs the complete Prisma migration chain through
  `npm run build:with-migrate`.
- Preview normally uses the demo database. While that shared demo project's
  historical migration ledger is repaired, the Vercel preview build executes
  only `20260830123000_versioned_approved_coursera_curricula` before the normal
  application build. This is intentionally narrow; it must not be generalized
  to arbitrary migrations.
- `scripts/apply-preview-approved-curriculum-schema.cjs` repeats the project
  guard, requires `VERCEL_ENV=preview`, uses only the non-pooled demo URL, and
  never accepts production, local, missing, or unknown targets.
- The targeted migration is transactional, takes a migration-specific advisory
  lock, and checks its schema and exact 26-row seed before commit. A second
  post-commit query fails the build if those invariants are not present.

The targeted preview execution intentionally does not mark Prisma's migration
ledger. After the demo ledger is repaired, restore previews to the full
`migrate deploy` path; do not mark old failed migrations applied without first
proving their intended schema.

## Verify preview is actually hitting demo
After the first preview deploy, confirm the running app reports the demo ref (e.g. a
`/api/health` or a logged-in dashboard that shows seeded demo data, not real members).
If you see real names, **stop** — a scope is misconfigured; the guard should have caught it.
