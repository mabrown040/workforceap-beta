# WorkforceAP Proxmox Homelab Deployment

Self-host the **Next.js 15** app on your Proxmox cluster at `workforceap.mikeslabs.com`.

This is separate from:

- **Vercel production** (`www.workforceap.org`)
- **Cursor Cloud** agent setup (`.cursor/environment.json` on another branch/PR)

## Architecture

```
Internet → Caddy (existing LXC) → WorkforceAP LXC :3000
                                      ├── web (Next.js standalone)
                                      └── db  (Postgres 16)
```

## Quick start

### 1. Provision LXC (on Proxmox host)

```bash
# From a machine with the repo cloned, or curl the script:
CTID=153 bash homelab/scripts/provision-lxc.sh
```

Creates CT **153** (default) with Docker, clones the repo to `/opt/workforceap`, and copies `homelab/.env.example` → `homelab/.env`.

### 2. Configure secrets (inside the container)

```bash
pct exec 153 -- bash
cd /opt/workforceap
nano homelab/.env   # POSTGRES_PASSWORD, Supabase keys, CRON_SECRET, etc.
```

See `homelab/.env.example` and `docs/ENVIRONMENT-VARIABLES.md` for the full list.

### 3. Deploy

```bash
cd /opt/workforceap
bash homelab/scripts/deploy.sh
```

This will:

1. `git pull` the configured branch
2. Start Postgres
3. Run `db:push` + `db:seed` (migrate service)
4. Build and start the Next.js container on port **3000**

### 4. Caddy reverse proxy

On your existing Caddy container, add the block from `homelab/Caddyfile` (replace `APP_HOST` with the app LXC IP), then:

```bash
caddy reload
```

### 5. DNS

Point `workforceap.mikeslabs.com` to your homelab public IP (Cloudflare recommended).

## Manual operations

```bash
# Rebuild after code changes
bash homelab/scripts/deploy.sh

# Logs
docker compose -f homelab/docker-compose.yml --env-file homelab/.env logs -f web

# Stop stack
docker compose -f homelab/docker-compose.yml --env-file homelab/.env down

# DB shell
docker compose -f homelab/docker-compose.yml --env-file homelab/.env exec db \
  psql -U wap -d workforceap
```

## Resource defaults

| Setting | Default | Notes |
|---------|---------|-------|
| CT ID | 153 | Avoids legacy static-site CT 152 |
| CPU / RAM | 2 cores / 4 GB | Bump for faster `next build` |
| Disk | 32 GB | Docker images + Postgres data |
| Web port | 3000 | Exposed on the LXC host |

Override via env vars when provisioning, e.g. `CTID=154 MEMORY=8192 bash homelab/scripts/provision-lxc.sh`.

## What works without extra secrets

- Marketing pages (after DB seed)
- `/en/program-comparison` (client-side)
- Public blog, programs catalog

Portal/auth, contact form, career quiz, and donate need Supabase / Resend / O*NET / Stripe keys in `homelab/.env`.

## Files

| Path | Purpose |
|------|---------|
| `docker-compose.yml` | Postgres + migrate + Next.js web |
| `Dockerfile` | Production standalone image |
| `.env.example` | Homelab env template |
| `Caddyfile` | Snippet for your Caddy container |
| `scripts/provision-lxc.sh` | Create Proxmox LXC + Docker |
| `scripts/deploy.sh` | Pull, migrate, rebuild, restart |
| `scripts/db-init.sh` | `db:push` + `db:seed` |

## Troubleshooting

**Build fails on Supabase project mismatch** — homelab sets `HOMELAB_DEPLOY=1` to skip the Vercel prod/demo guard. Ensure `homelab/.env` is loaded.

**Prisma migrate history** — homelab uses `db:push` (not `migrate deploy`) to avoid the duplicate `partner_users` migration issue documented in `AGENTS.md`. For production schema updates on Vercel, use `build:with-migrate`.

**Out of memory during build** — increase LXC RAM to 6–8 GB temporarily, or build on a stronger machine and push the image to a registry.
