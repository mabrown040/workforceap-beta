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

**Feature:** Employer job import from URLs (single or bulk) uses **Firecrawl** for ATS sites (Rippling, Greenhouse, Lever, LinkedIn, etc.). Plain fetch is tried first for other URLs; Firecrawl is fallback when fetch fails.

**Setup:** Set `FIRECRAWL_API_KEY=fc-...` in `.env`. Required for `https://ats.rippling.com/closinglock/jobs` and similar ATS pages.

**Test script (no auth):**
```bash
npm run test:firecrawl-rippling
```
Requires `FIRECRAWL_API_KEY` and `GROQ_API_KEY` in env. Scrapes Rippling URL and parses listings.

**Live test:** Sign in as employer → Import jobs → Careers page URL: `https://ats.rippling.com/closinglock/jobs` → Create draft jobs. Check server logs for `[Import]` and `[Firecrawl]` lines.

**Endpoints:** `/api/employer/jobs/import`, `/api/employer/jobs/import-bulk`

---

*Do not claim these flows pass until a successful live retest.*
