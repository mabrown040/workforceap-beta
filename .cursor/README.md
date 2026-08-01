# Cursor Cloud environment (home lab)

This folder defines the **WorkforceAP** Cursor Cloud agent environment so agents boot with Postgres, dependencies, and a seeded database.

## Files

| File | Purpose |
|------|---------|
| `environment.json` | Cursor Cloud config (Dockerfile, install, start, dev terminal) |
| `Dockerfile` | Installs PostgreSQL 16 on the agent image |
| `cloud-install.sh` | Idempotent install: `pnpm install`, local DB, `db:push`, `db:seed` |

## Local database (agents)

Install creates:

- Role / DB: `wap` / `workforceap`
- URL: `postgresql://wap:wap@127.0.0.1:5432/workforceap`
- `.env` and `.env.local` (gitignored) if missing

## Secrets (Cursor dashboard)

Add these in [Cloud Agents → Secrets](https://cursor.com/dashboard/cloud-agents) for full portal/auth flows:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY` (contact form)
- `ONET_API_KEY` (career quiz)
- Stripe keys (donate)

Marketing pages and `/en/program-comparison` work without those secrets after install.

## Updating the environment

1. Edit files here and push to a branch.
2. Start a cloud agent from that branch to validate.
3. Optionally save a snapshot from the dashboard and set `"snapshot": "..."` in `environment.json` for faster cold starts.
