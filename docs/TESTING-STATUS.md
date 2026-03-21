# Testing Status

## Authenticated employer job APIs

**Endpoints:**
- `POST /api/employer/jobs`
- `POST /api/employer/jobs/import`
- `POST /api/employer/jobs/import-bulk`

**Status:** Last run (post-merge) **failed**. Cannot re-run until OpenClaw browser/gateway is restored — the auth-capable browser path is currently down.

**To resume:** Restart the OpenClaw browser/gateway, then hit the above endpoints with a valid employer session.

---

## Firecrawl for job import

**Feature:** Employer job import from URLs (single or bulk) now uses **Firecrawl** as fallback when plain `fetch()` fails. This improves success rate for JS-rendered sites (LinkedIn, etc.).

**Setup:** Set `FIRECRAWL_API_KEY=fc-...` in env. When not set, import still works for sites that allow basic fetch; Firecrawl is used only when configured.

**Endpoints using Firecrawl fallback:** `/api/employer/jobs/import`, `/api/employer/jobs/import-bulk`

---

*Do not claim these flows pass until a successful live retest.*
