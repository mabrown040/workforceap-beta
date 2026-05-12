# Weekly recap emails — ship status

**Decision (2026-05-12):** Ship. The app already defines Vercel Cron for member and admin weekly emails in `vercel.json`; the API routes `GET /api/cron/weekly-recap` and `GET /api/cron/weekly-recap-email` use `withCronLogging` + `CRON_SECRET` (set the secret in Vercel; scheduled invocations send the bearer token automatically).

Earlier docs (e.g. `docs/MISSING.md` before this date) claimed these crons were not deployed — that was stale relative to the repo.

**Member email** includes week-in-review stats, goal progress, new live job postings (org-scoped, program-aligned, same visibility filters as the public job board), upcoming mentor sessions, readiness score when available, and AI-tool suggestions. **Admin email** is unchanged (counts digest).

**Fix applied:** The member cron no longer sets `weekly_recap.opened_at` when the email sends; that column is reserved for when the member actually opens the recap in the portal.
