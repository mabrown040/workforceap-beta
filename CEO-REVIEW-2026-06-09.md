# CEO Review: WorkforceAP Platform — Full-Stack Product Review
**Date:** 2026-06-09
**Method:** Four parallel deep-dives (member experience, employer/partner revenue, acquisition funnel, operations & platform health), synthesized per the CEO Product Review framework.
**Companion docs:** CEO-ANALYSIS-3-7-10-STAR.md, AUDIT-2026-05-16.md, QA-AUDIT-REPORT-2026-05-12.md, PLAN-2026-Q3.md

---

## Verdict: CONDITIONAL
Strong training product; the business model isn't wired up and the outcome metric is unprotected.

## Revenue Score: 3/10
The model is pay-per-placement ($2,500/hire), yet **there is no way to charge an employer today.** An employer can post a job, review candidates, and mark someone "hired" — and no invoice, no payment capture, no start-date verification ever fires. The $2,500 fee exists only as marketing copy (`app/employers/page.tsx`). Subscription tiers ($199–$999/mo) are coded in `lib/stripe/client.ts` but checkout dead-ends: no price IDs configured, no billing page, and the webhook listens for the wrong secret with four subscription events missing — paid orgs would sit in `pending_payment` forever (AUDIT C-B1/C-B2). The one revenue pipe that works is the *outbound* one: partner payouts ($500/placement via Stripe Connect, `lib/partner/partnerPayout.ts`) are live. **We can pay partners for placements we can't bill employers for.** The "repeat-hiring partner path" is narrative, not product.

## User Value Score: 7/10
The member journey from apply → enroll → train → certify is genuinely strong: live Coursera B4B progress sync, 19 programs, a certification vault, readiness scoring, and 10 working AI tools that all save history. But it stops one step short of the mission: **after a member clicks "apply," the platform goes dark.** No interview/offer/rejection signal flows back, `PlacementRecord` allows exactly one placement per member for life (`userId @unique`), and a member can hit 92% "readiness" and Champion-level points while unemployed.

## Strategic Assessment
- **Why this matters:** Everything we tell funders, employers, and members hinges on one number — placements. At review time that number was (a) not billed, (b) editable with limited safeguards, and (c) historically under-retained vs. the WIOA 3-year requirement. (PATCH validation, survey-resubmission blocking, and 3-year audit retention have since landed; audit-trail entries on placement writes land with this review.)
- **Why now:** PLAN-2026-Q3 turns on paid ads at Sprint 7. Funnel telemetry is dark at login, email verification, and first dashboard action; GA4 is a placeholder URL; Resend email isn't configured (SPF/DKIM unset). Spending on ads before Sprint 1's telemetry lands means optimizing against a false conversion rate.
- **What it enables:** The SaaS-ification bet is real but premature — tenant scoping exists (`withTenantScope`, RLS migrations) yet cross-tenant reads via admin helpers (AUDIT C-T1) mean one customer's admin can read another's members. Close placement billing + tenant isolation and the same codebase becomes sellable to other workforce orgs.

## Risks & Concerns
- **Compliance is the existential one:** placement-record integrity + retention + unencrypted DOB/income/disability fields = failed WIOA audit and grant clawback risk if a funder spot-checks.
- **CI is theater:** `ignoreBuildErrors: true`, lint ignored, 63 API specs skipped, and `safe-migrate` auto-marks failed migrations as applied — which is exactly how the demo DB drifted out of sync and silently broke interview recording (fixed 2026-06-09).
- **Known runtime crash waiting:** the `authorId: string | null` mismatch across ~20 messaging files (QA #1) will throw the first time a deleted user's message renders.
- **Engagement theater risk:** points/streaks/AI tools measure activity, not employment. Don't let dashboard metrics substitute for placement metrics.

## Implementation Guidance
Minimum viable sequence — four clusters, in order:
1. **Protect the money metric:** ~~zod-validate placement PATCH~~ (done), ~~block survey resubmission~~ (done), ~~3-year audit retention~~ (done), audit-log every placement write (this PR), allow placement job history (follow-up: `PlacementRecord` 1:N refactor touches 15+ files).
2. **Turn on the cash register (1–2 weeks):** hire-verification flow → placement-fee invoice via the Stripe rails that already exist; fix the webhook secret + missing events. Skip subscriptions for now — placement fees are the proven model. **Blocked on a product decision:** who confirms "started work" — employer attestation, counselor verification, or member survey?
3. **Light up the funnel before ads (Sprint 1, as planned):** login/verification/first-action events, real GA4 property, Resend + domain auth. Pull the ad pixels forward from Sprint 7 to Sprint 1.
4. **Close the loop for members (2–3 weeks):** interview/offer/rejection fields on `JobApplication`, link AI tool runs to applications, reweight readiness toward interview conversion.

**Success metrics:** first employer invoice collected; 100% of placement edits audit-logged; signup→verified→first-action funnel visible in one dashboard; ≥1 member with a recorded interview-to-offer conversion.

**Go/no-go:** no paid ad spend until cluster 3 ships; no SaaS sales conversations until C-T1–T4 tenant fixes ship.

## Next Steps
- Placement audit-trail: shipped alongside this review (placements POST/PATCH + placed-outcome upsert now write `AuditLog` with actor + before/after).
- Stripe placement-fee flow: needs the hire-verification product decision above before build.
- CI hygiene bundle: fix the 4 known-failing unit tests (Coursera catalog drift, autoMatch tiebreaker, tenant header precedence), the messaging `authorId` type, and remove `ignoreBuildErrors`.
- `PlacementRecord` 1:N job-history refactor: schedule as its own PR; it changes a relation shape used across admin, partner, and payout code.

---

**One-line summary:** WorkforceAP is a 7-star training product attached to a 2-star cash register and an unguarded scoreboard — fix what gets measured and what gets billed before turning on growth.
