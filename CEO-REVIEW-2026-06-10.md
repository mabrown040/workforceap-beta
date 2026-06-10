# CEO Review — WorkforceAP — 2026-06-10

An unbiased, full-stack review combining the codebase, live production telemetry
(Sentry + Vercel runtime logs), and **real production database numbers** — the first
review in this repo grounded in actual member data rather than feature inventory.

---

## 1. Mission

> WorkforceAP is a 501(c)(3) nonprofit providing **no-cost career training and
> industry-recognized certifications** to low-income and underemployed adults in
> Austin/Central Texas — application → certification → job placement in 3–5 months.

Every recommendation below is scored against one question: **does it move a real
member from application to placement?**

---

## 2. The numbers (production database, 2026-06-10)

| Funnel stage | Count | Notes |
|---|---|---|
| Accounts created | **78** | 7 Mar / 42 Apr / 24 May / 5 Jun — acquisition slowing |
| Applications | **63** | — |
| → PENDING | **53 (84%)** | median age **40 days**, max **86 days** |
| → DENIED | 10 | — |
| → APPROVED | **0** | zero approvals, ever |
| Course enrollments | 13 | — |
| Coursera identity mappings | 6 | 5 unmatched-actor alerts beside them |
| Members with learning progress | **1** | — |
| Placement records | **1** | — |
| Testimonials | **0** | marketing carousel falls back to an "87% placement rate" stat |

Engagement exists — 2,751 member events, ~61 distinct members active in early June,
2,040 Coursera xAPI events flowing in — but it is not converting into approvals,
learning, or placements.

**The bottleneck is not software. It is the 53 applications sitting un-reviewed for a
median of 40 days.** Every sprint spent on new features while that queue ages is a
sprint spent on the wrong problem. (The recent "dad-admin" Today-screen work is
exactly the right instinct — finish it.)

A second, related integrity issue: the public site shows an **"87% placement rate"**
fallback stat while the database holds **1 placement and 0 testimonials**. For a
nonprofit whose currency is trust (members, funders, WIOA auditors), this is the
single most dangerous artifact in the codebase. Remove or caveat it immediately.

`users.last_login_at` is never written (0 of 78 rows), so member engagement cannot be
measured from the primary table — instrument it before drawing retention conclusions.

---

## 3. Production health (Sentry + Vercel)

**Verdict: stable, with noise that hides real signal.** 17 unresolved Sentry issues;
most are stale.

- **Fixed-but-open issues**: the May-14 cluster of `PrismaClientKnownRequestError`
  issues (auto-heal cron, deploy-health, login, partner/employer layouts) all trace to
  one bug — raw SQL `SET LOCAL app.current_role` (`current_role` is a Postgres
  reserved word) — already fixed in `lib/db/prisma.ts`. JAVASCRIPT-NEXTJS-H is now
  marked resolved with the root cause documented; triage the siblings the same way.
- **Hydration error on /dashboard/weekly-recap** (109 events): every event is from
  **HeadlessChrome** — a bot or synthetic monitor, 0 real users. Filter bot traffic in
  Sentry (`browser.name:HeadlessChrome` inbound filter) so real regressions stand out.
- **Real, recurring**: `MISSING_MESSAGE` errors on `/careers` in en/es/pt — daily in
  Vercel runtime logs. Root cause: `form.firstName`/`form.lastName` missing in **all
  four locales** and the `errors.*` block missing in `en.json`. **Fixed in this PR.**
- **Real, open**: certificate upload returns 500 (`member-files` bucket missing) —
  fix already on PR #1567; merge it.
- Sentry PII posture is good: `beforeSend` scrubber, `sendDefaultPii: false`, masked
  replays. The May audit's H-S7/H-14 items are addressed.

---

## 4. Coursera integration

The pipeline (xAPI webhook → identity resolution → course progress → completion
cascade, plus CSV backfill and B4B polling crons) is architecturally sound but loses
data silently at the edges — and with 6 identity mappings against 5 unmatched-actor
alerts, **nearly half of real learner traffic isn't attached to a member**.

Top risks, in order:

1. **Silent completion loss on unmapped courses** — completions with no canonical
   course mapping are marked `ignored` with no `CourseProgress` row; replay only
   happens if the mapping lands in the same cron tick
   (`lib/member/courseProgress.ts:175`, `lib/xapi/reprocess.ts:262`).
2. **Orphaned CSV rows** — unmatched emails create `userId = NULL` progress rows that
   are never re-linked after an identity mapping is added
   (`lib/coursera/csvImport.server.ts:178`).
3. **Webhook idempotency race** — duplicate deliveries can double-fire completion
   emails/notifications (`lib/xapi/persistXapiStatement.ts:92`).
4. **OAuth token cache race** in `lib/coursera/oauth.ts:16` — crashes the sync cron
   under concurrency at token expiry.
5. **No tenant scoping on `coursera_*` tables** (AUDIT C-S5) — fine today with one
   org, a cross-tenant collision when a second org onboards.

With only 13 enrollments, the fix priority is the *identity mapping* path (risks 1–2):
at this scale a human can clear the 5 unmatched alerts today, and a backfill that
re-links orphaned rows when a mapping is created is a small, high-leverage change.

## 5. UI/UX

Strong foundations: mobile-first (44px touch targets, safe-area insets, iOS-zoom
prevention), skip links, 280+ ARIA usages, a coherent CSS-variable design system, and
a lean 3-step apply flow with draft autosave. The gaps:

1. **Member dashboard overload** — `app/(portal)/dashboard/page.tsx` is 1,443 lines
   rendering 11+ sections to every member, including empty-state noise ("0 points",
   "no matched jobs") for new members. Split into home/learning/opportunities and fold
   empty sections.
2. **i18n holes on member-facing pages** — account settings and GDPR privacy pages
   were English-only (es/fr/pt members saw English on the most trust-sensitive
   flows). **Fixed in this PR**, including a latent bug where success/error styling
   depended on English substring matching.
3. **Inline-style sprawl** — ~9,000 `style={{}}` blocks across ~500 files, 54+ ad-hoc
   card components beside 9 good primitives. Consolidate opportunistically, not as a
   big-bang.
4. **No automated a11y testing** — add axe checks to the Playwright suite; WCAG AA
   matters for this member population and for WIOA-funded programs.
5. **Apply step-0 progress indicator missing** — `ApplyMobileStepNav` shows on steps
   1–2 but not eligibility; cheap conversion win.

---

## 6. What previous reviews got right — and what they missed

The May audit (275 findings) and the 3/7/10-star analysis are thorough on security
and vision. What neither says plainly, and the data now does:

- **The product has more dashboards than the org has members in training.** Feature
  surface (4 portals, 7 AI tools, voice coach, gamification, mentor module, funder
  analytics) is that of a 50-person company; production has 1 active learner.
- **The 7-star roadmap (streaks, badges, coach memory) optimizes retention of members
  who can't get approved.** Retention work is premature while approval throughput is
  zero.
- The audit's "no ad spend until P0s clear" remains correct — but the funnel data
  shows ad spend would also be wasted operationally: new applicants would join a
  40-day queue.

---

## 7. The plan — in order, with go/no-go gates

**Week 1 — unblock the funnel (operations, not code)**
1. Review the 53 pending applications. Target: queue median < 7 days.
2. Clear the 5 unmatched Coursera actor alerts (manual mapping, minutes each).
3. Remove/caveat the "87% placement rate" fallback stat.
4. Merge PR #1567 (cert upload bucket). Triage the stale May-14 Sentry cluster.
   *Gate: ≥1 approval, queue shrinking → proceed.*

**Weeks 2–3 — make the data trustworthy**
5. Write `last_login_at` on login; wire the apply-funnel telemetry (S7 panel exists).
6. Coursera identity backfill: re-link `userId IS NULL` progress rows on mapping
   creation; replay `ignored` completions whenever a mapping is added (not same-tick).
7. Sentry hygiene: bot-traffic inbound filter, resolve the stale cluster.
   *Gate: can answer "how many members are actively learning?" from one query.*

**Weeks 4–6 — convert and retain (now it's worth it)**
8. Dashboard split + empty-state folding; apply step-0 progress indicator.
9. Remaining security P0s from AUDIT-2026-05-16 (tenant gates, Stripe correctness,
   CI honesty) before any multi-org or paid-acquisition push.
10. Only then: the 7-star retention features (streaks, badges, nudges) — measured
    against the funnel telemetry from step 5.

**The one-sentence verdict:** the platform is over-built and under-operated; spend the
next 30 days approving humans, attaching their learning data to their names, and
making every public number true — the codebase is already good enough to support that.

---

## Appendix — changes shipped with this review

- Fixed daily-recurring `MISSING_MESSAGE` production errors on `/careers`:
  added `form.firstName`/`form.lastName` (all locales) and the
  `marketing.careers.form.applyingForLabel` + `errors.*` block (en).
- Internationalized `/dashboard/account` and `/account/privacy` (en/es/fr/pt),
  fixing the English-substring success/error styling bug on the privacy page.
- Resolved Sentry JAVASCRIPT-NEXTJS-H with root-cause comment
  (`current_role` reserved-word raw SQL, fixed 2026-05-14).
