# Production cutover — Website Adjustments + scale go-live

**Status:** Track A (WS1–4), Track B (scale), and WS5 (soft-reminder ops) are on `master` as of `d7b78725` (2026-08-25).  
**Draft PRs:** Origin cannot open GitHub PRs on this inbound mirror — use `/opt/cursor/artifacts/PR-OPEN-LINKS.md` or `create-draft-prs.sh` with `GH_TOKEN` if you still want review artifacts for historical branches.

## Never do

- Do **not** set `WAP_RLS_GUC_ENABLED=true` (2026-06-18 portal 504s). See `docs/POSTMORTEM-2026-06-18-PORTAL-OUTAGE.md`, `lib/db/prisma.ts`.
- Do **not** hard-lock members who miss the Sept 14 eligibility reminder (WS5 is soft-reminder only).

## Pre-prod → prod checklist

### Env

- [ ] Upstash Redis set in production, **or** knowingly accept fail-closed voice/AI and security limiters without Redis.
- [ ] `RATE_LIMIT_ALLOW_MISSING_UPSTASH` unset in production (or only set on preview).
- [ ] Staff MFA production default on — do not set `STAFF_MFA_ENFORCEMENT=0` except emergency.
- [ ] Resend / Supabase SMTP verified for apply + eligibility confirmation.
- [ ] `WAP_RLS_GUC_ENABLED` unset / not `true`.

### Schema

- [ ] Apply WS4 additive migration on production with the repo’s **safe** migrate path (`db:push` locally; production safe-migrate — **not** naive `migrate:deploy` if partner_users duplicate history still exists). Migration: `prisma/migrations/20260824120000_apply_eligibility_extended_fields/`.

### Smoke after deploy

**Website (Track A)**

- [ ] `/` cards: Members → Partners → Employers
- [ ] `/donate` Champion tiers: Silver $21,600 / Gold $48,000 / Platinum $84,000
- [ ] `/salary-guide` includes IBM AI & Software Developer ($85K–$135K)
- [ ] `/apply` adult path persists unemployment / SNAP-WIC / hear-about / ambassador; school/CHS still skips adult screener

**Scale (Track B)**

- [ ] `GET /api/health` (liveness) cheap 200; `GET /api/health/ready` 200 with DB/org (503 if DB down)
- [ ] Anonymous marketing HTML does not storm GoTrue
- [ ] Voice/AI without Redis → 429 in production-like env
- [ ] Kit `/dashboard` loads; org-admin lists stay tenant-scoped; super-admin still cross-tenant where intended
- [ ] Soft-delete member with resume clears storage (or 502)

**WS5 ops**

- [ ] Dry-run eligibility campaign: `POST /api/admin/members/send-eligibility-campaign` with `dryRun:true`
- [ ] Datasheet CSV: `/admin/exports?ui=legacy#eligibility-datasheet` or `GET /api/admin/export/eligibility`
- [ ] Mike sign-off on Sept 14 soft-reminder wording before live send — see `docs/WS5-ELIGIBILITY-OPS.md`

### Alerts

- [ ] Page 504 / timeout alerts on ready probe + Vercel route timeouts — **not** liveness alone.

## What landed on master (this rollout)

| Track | Contents |
|-------|----------|
| A | Homepage audience order; IBM salary row; Champion donate tiers; apply eligibility fields + migration |
| B | Anon auth tax; fail-closed limiters + take caps; dashboard loader; health ready; UI/blobs; tenant scope + provision; admin org scope; staff MFA / QA bypass kill; cron/branding diet; scan caps; GDPR blobs; root i18n shrink + go-live list |
| WS5 | Eligibility confirmation emails; admin datasheet/CSV; non-CHS soft Sept 14 campaign |

Historical feature branches remain on origin for reference; product tip is `master`.
