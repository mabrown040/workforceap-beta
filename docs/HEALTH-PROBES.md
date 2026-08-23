# Health probes — liveness vs readiness

**Audience:** on-call, uptime monitors, Vercel alert routing.  
**Why this exists:** `/api/health` stayed HTTP 200 during the 2026-06-18 portal 504s (`docs/POSTMORTEM-2026-06-18-PORTAL-OUTAGE.md`). Treating liveness as “the site works” hid the outage.

| Probe | Path | Cost | Meaning | HTTP |
|---|---|---|---|---|
| **Liveness** | `GET /api/health` | No Prisma / Redis / S3 | Next isolate is up | 200 if the process handles the request (429 if rate-limited) |
| **Readiness** | `GET /api/health/ready` | One Prisma `$transaction` → default org `findUnique` (`slug=workforceap`) | Pages can resolve the org that `app/layout.tsx` needs on every request | 200 if org row is reachable; **503** if Prisma is down or the org is missing |
| SLO snapshot | `GET /api/health/slo` | Admin-only | Internal SLO numbers | Auth-gated |

## What to alert on

- **Process down / deploy crash-loop:** `/api/health` ≠ 200.
- **Public pages 500 / org or DB unreachable:** `/api/health/ready` ≠ 200. This is the probe for “the marketing site and portal layout cannot talk to Prisma/org.”
- **Portal 504 / `maxDuration` timeouts:** ready can still be green (DB up, render path too heavy). Alert on Vercel **runtime timeouts** for `/dashboard`, `/admin`, `/counselor` — not only health 200. Ready would **not** have gone red on 2026-06-18; the database was healthy.

Do **not** add the org query back onto `/api/health`. That checkout hits the transaction pooler (`:6543`, `connection_limit=1`) on every public uptime tick.

## Example

```bash
# Liveness — cheap
curl -sS -o /tmp/live.json -w "%{http_code}\n" https://www.workforceap.org/api/health
# Readiness — page this for dependency / 500-adjacent alerts
curl -sS -o /tmp/ready.json -w "%{http_code}\n" https://www.workforceap.org/api/health/ready
```

`GET /api/health?deep=true` is **not** a dependency probe anymore. Use `/api/health/ready`.
