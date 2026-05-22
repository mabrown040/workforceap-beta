# WorkforceAP — 10 Sprint Plan V2 (2026-Q3 → 2026-Q4)

**Canonical plan:** This document supersedes [`PLAN-2026-Q3-Q4-10-SPRINT.md`](./PLAN-2026-Q3-Q4-10-SPRINT.md) (V1, deprecated).  
**Resequenced per:** [`docs/reviews/ceo-10sprint-review-2026-05-21.md`](./reviews/ceo-10sprint-review-2026-05-21.md)  
**Authored:** 2026-05-21 (V2)  
**Baseline:** `master` @ `fe481b7fd`  
**Horizon:** 10 × 2-week sprints (~20 weeks, through 2026-10-07)  
**Sources:** V1 plan, CEO 10-sprint review, 16 files in `docs/plans/`, `docs/audits/*`, recent merges, open PRs

---

## 0. North Star + Bear Case

### North Star (3 sentences)

**Paid employer placements** — hires where WorkforceAP can attribute the member, record a verified `PlacementRecord`, and collect revenue (pipeline subscription or placement fee). Everything in this plan exists to increase the count and quality of those placements, not vanity signups. Success is measured as **placements per 100 enrolled members in the Google IT Support cohort in Central Texas**, with CPA and counselor load held flat. Marketing, product, and compliance work roll up to that single monetization-bearing metric.

### Bear Case (3 sentences)

In **90 days**, WorkforceAP dies if **Texas WIOA/EdVera approval slips while paid ads run anyway** — counselors process ineligible applicants, placement rate stays near zero, and the board pulls ad budget (`docs/reviews/ceo-strategic-review-2026-05-21.md` §1.1; `PLAN-2026-Q3.md` §0). A **compliance tripwire** (cross-tenant xAPI, FORCE RLS not flipped, or **"850+ placed"** claims that don't match `/admin/outcomes`) triggers a funder or press incident and blocks state approval (`lib/xapi/mappings.ts:55,107` still nullable; `lib/marketing/trustStripMetrics.ts:16-17` placeholder; `marketing/google-ads/2026-launch/ads.csv`). **CAC blowout without enrolled-member attribution** — spend continues on national "free IT cert" keywords while Coursera completion and interview signals stay blind (`hasCompletedInterviewPractice` hardcoded `false` in `lib/member/getMemberState.ts:282,318`) — burns runway before employer LOIs convert (`docs/reviews/ceo-strategic-review-2026-05-21.md` §1.3–1.6).

### V2 sequencing principle

**Compliance before traffic; proof before marketplace.** V1 mis-ordered ~40% of work (CEO review). V2 pulls FORCE RLS to S2, freezes paid spend until S2 checklist is green, moves single-program landing to S1, pulls Coursera completion forward (S5) ahead of ad scale, defers partner channel (S6) until post-retention, and replaces R4 marketplace with placement-loop close (S8).

### Monetization spine (decision required S1)

**Deliverable:** `docs/decisions/monetization-spine-2026.md` — single page, signed by Mike by end of S1.

**Proposed default (CEO review recommendation):**

> Primary revenue 2026–2027: WIOA board outcomes terminal at $2–5K/mo. Secondary: employer annual pipeline subscription (Stripe, already wired). Contingent placement fee demoted to footnote on `/employers` by end of S3.

Until this doc is signed, no sprint may ship new employer pricing copy without Product approval.

---

## 1. Sprint Schedule

> **Date math:** Sprint 1 starts **2026-05-21** (today). Each sprint = 14 calendar days.  
> **Already shipped (do not re-plan):** G7 paid `/apply` + growth dashboard (`f56213f6e`, PR #1353); G3 employer landing (`d454805f9`, #1357); G8 legal/sub-processors (`f19d95e06`, #1348); R2 CoachMemory (`2478edb15`, #1349); R3 kickoff/accountability emails (`6892cf1d1`, #1347); UTM capture (`ba2ca60ce`); login funnel events (`PLAN-2026-Q3.md` Appendix — fixed); TrustStrip component (#1381); SEO sitemap/robots/OG (#1383); FORCE RLS **staging harness** (`1f18cd4de`, #1340); ESLint build gate (`fa8f9ebe3`, #1366); counselor bulk actions (#1374); post-conversion thank-you pages (#1386); broken-link fixes (`docs/audits/broken-links-fixed-2026-05-21.md`).

---

### Sprint 1 — Trust + screening + single-program landing (2026-05-21 → 2026-06-03)

**Goal:** Make public claims defensible, persist screening, ship apply P0s and wedge landing — **$0 paid traffic** (organic/referral/waitlist only).

- **Tickets**
  - **[Product @owner]** Monetization spine decision doc: subscription vs contingent fee — **1d** (`docs/decisions/monetization-spine-2026.md`; single page, Mike sign-off)
  - **[Eng @owner]** Bind all external "placed" copy to `loadTrustStripMetrics()` / `getPublicImpactStats()`; remove hardcoded `850+` from ads, `PaidApplyVariant`, and `TRUST_STRIP_PLACEHOLDER_LINE` when `hasLiveData` — **3d** (`lib/marketing/trustStripMetrics.ts`, `marketing/google-ads/2026-launch/`)
  - **[Eng]** Persist `PublicWioaScreening` on `POST /api/public/wioa-qualification`; email = notification only — **2d** (`app/api/public/wioa-qualification/route.ts`)
  - **[Eng]** Finish apply-funnel P0s still open: step-1 inline validation, phone hint, ≥1 program on results, password strength — **3d** (`PLAN-2026-Q3.md` §1.1)
  - **[Eng]** Single-program performance landing: `/programs/google-it-support` as default organic destination (not multi-sector homepage) — **3d** (CEO wedge; pulled from V1 S6)
  - **[Marketing @owner]** Rewrite ad copy per `docs/DAILY-OPERATING-PLAN.md` ("no-cost for qualifying members"); **pause all paid campaigns** — **1d**
  - **[Ops @owner]** Written ad-spend gate: **$0 paid** until S2 FORCE RLS checklist green + TWC approval artifact — **0.5d**

**Success metric:** Apply step-1→account-created ≥ **45%** on **organic/referral** traffic; **$0** ad spend; public placement claims **100% dynamic** or suppressed; monetization spine doc **signed**.

**Dependencies:** Texas approval timeline (external); G7 landing already on `master`.

**Demo deliverable:** Staging walkthrough: `/programs/google-it-support` → `/apply` with dynamic trust copy; WIOA screening persisted in DB; signed monetization spine in `docs/decisions/`.

**Deferred from V1 S1:** PR #1390 mobile chrome → S7; `course_launched` events → S4.

---

### Sprint 2 — FORCE RLS flip + xAPI tenant hardening (2026-06-04 → 2026-06-17)

**Goal:** Production-safe tenant isolation before any paid traffic — **#0 audit standout** (`docs/audits/p1-rls-policy-review-2026-05-18.md`). Pulled forward from V1 S3.

- **Tickets**
  - **[Eng]** xAPI `organization_id NOT NULL` + backfill + ingest filter — **3d** (`lib/xapi/mappings.ts` — partial admin scoping in `a8204dc89`, NOT NULL still open)
  - **[Eng]** Fix layout GUC: `app/layout.tsx` must pass real `orgId`, not `null` — **2d** (audit § "Org resolution gaps")
  - **[Eng]** `NULLIF(get_current_org_id(),'')` in SQL helpers + applications INSERT policies — **3d** (audit: writes hard-fail under FORCE)
  - **[Eng]** Execute `docs/runbooks/force-rls-staging-rehearsal.md` → prod flip checklist — **3d** (harness shipped #1340; prod flip deferred)
  - **[Eng]** Expand `verify-high-risk-tenant-routes.cjs` to 30+ routes — **2d** (`PLAN-2026-Q3.md` §1.2 P1)
  - **[Eng]** Complete xAPI audit wire-ins on destructive admin paths — **2d** (`docs/audits/p1-audit-wireins-todo.md` high-priority list)

**Success metric:** Shadow FORCE RLS test matrix **100% pass**; **0** cross-org reads in staging penetration script; xAPI tables **0** null `organization_id`; ops gate updated to allow **$0–500/day paid dry-run** post-checklist.

**Dependencies:** Sprint 1 trust-safe metrics; no schema-breaking releases without rehearsal.

**Demo deliverable:** Staging demo: Org A admin cannot see Org B member; xAPI event credits correct org; signed FORCE RLS prod flip checklist.

---

### Sprint 3 — Employer LOI motion + outcomes dashboard (2026-06-18 → 2026-07-01)

**Goal:** Turn shipped employer landing into **signed pipeline interest** and give funders a defensible outcomes view. V1 S2, scope-trimmed.

- **Tickets**
  - **[Eng]** Employer activation: Stripe pipeline subscription as hero CTA; demote contingent placement fee to footnote per monetization spine — **3d** (`lib/marketing/employerLanding.ts`)
  - **[Eng]** `/admin/outcomes` board snapshot: placement count, avg wage, suppression rules per `docs/OUTCOMES-METHODOLOGY.md` — **2d**
  - **[Eng]** Employer CTA A/B experiment analysis + ship winner (`a21d19e9d` experiment) — **2d**
  - **[Sales @owner]** 3 employer discovery calls → **1 LOI** (pipeline sub, not placement-fee-only) — **5d**
  - **[Content]** **1** Texas employer case study on `/employers` (extend #1380 seed) — **1d**
  - **[Eng]** `hasCompletedInterviewPractice` from real session data, not `false` — **2d** (`lib/member/getMemberState.ts:282,318`)

**Success metric:** **≥1** employer LOI or paid pilot; employer contact-form conversion **+15%** vs May baseline; outcomes page loads live counts with **N&lt;10 suppression**.

**Dependencies:** Sprint 1 trust-safe metrics; Sprint 2 FORCE RLS complete; monetization spine signed.

**Demo deliverable:** Employer demo: landing → contact → admin placement record; funder view of same placement in outcomes snapshot.

**Cut from V1 S2:** `dashboard_primary_cta_clicked` telemetry (defer to S4 if needed); 2nd employer case study.

---

### Sprint 4 — R1 first-value + R2 coach memory finalize (2026-07-02 → 2026-07-15)

**Goal:** Day-7 retention and stateful AI coach — **build on shipped R2**, close signal gaps. V1 S5 + deferred `course_*` events.

- **Tickets**
  - **[Eng]** Wire `course_launched` + progress milestones (25/50/75/100%) — **2d** (deferred from V1 S1; feeds S5 completion engine)
  - **[Eng]** R2 finalize: `parentToolResultId` linkage across resume → cover letter → interview — **2d** (shipped base `lib/ai/aiCoachContext.ts`; polish per `PLAN-2026-Q3.md` R2)
  - **[Eng]** R1: cohort count in dashboard hero + assessment prefill from intake — **3d** (`docs/plans/2026-Q2-product-outcomes.md`)
  - **[Eng]** `MemberNextStepsStrip` analytics: `next_step_click` with `action_id` — **1d**
  - **[Eng]** Onboarding "Why WorkforceAP" video in tour — **2d**
  - **[Eng]** Day-5 Coursera accountability nudge verification + day-14 silence alert to counselor queue — **2d** (R3 kickoff shipped `lib/coursera/courseKickoff.ts`)
  - **[Product @owner]** Tune `lib/member/nextBestActions.ts` priority rules from counselor feedback — **2d**

**Success metric:** Day-1→7 return **+10pp** vs June baseline; members using **≥2** AI tools/week **+15pp**; week-1 assessment completion **+15pp**.

**Dependencies:** Sprint 1 `course_*` events wiring; Sprint 3 interview completion signal; paid dry-run may run post-S2 if approval artifact signed.

**Demo deliverable:** New member enrolls → dashboard shows cohort + next steps → coach references prior resume in cover-letter tool.

---

### Sprint 5 — R3 Coursera completion engine (2026-07-16 → 2026-07-29)

**Goal:** Move from "emails shipped" to **measurable completion lift** before ad scale ramps. Pulled forward from V1 S7.

- **Tickets**
  - **[Eng]** Cert celebration email + dashboard widget tied to xAPI completion — **3d** (kickoff shipped; celebration polish)
  - **[Eng]** Day-5 / day-14 automated nudge cron with counselor escalation — **3d**
  - **[Eng]** Points/badges for first cert + streak counter MVP — **3d** (`PLAN-2026-Q3.md` G5/R3)
  - **[Eng]** Admin Coursera health: unmatched-actor alerts per org — **2d**
  - **[Eng]** Member-facing course progress card on dashboard — **2d**
  - **[Analytics @owner]** Baseline: first-course completion rate in 30d — **1d**

**Success metric:** First-course completion **45% → 55%** in 30d cohort; cert celebration email open **≥40%**; day-14 silence **−25%**.

**Dependencies:** Sprint 4 `course_*` events; Sprint 2 xAPI tenant correctness; ads may scale post-approval — completion engine must be live first.

**Demo deliverable:** Test member enrolls → kickoff → nudges → cert email → dashboard badge; admin health shows org-scoped events.

---

### Sprint 6 — G4 partners landing + WIOA-board outreach kit (2026-07-30 → 2026-08-12)

**Goal:** B2B partner channel with **real stats** and board-ready collateral. Deferred from V1 S4 until retention/completion tracks are live.

- **Tickets**
  - **[Eng]** Replace placeholder stats/logos on `/partners` with live partner metrics or suppressed UI — **2d** (`app/partners/page.tsx`)
  - **[Eng]** Partner self-serve signup → invite flow; CSV bulk referral upload MVP — **5d** (`PLAN-2026-Q3.md` G4)
  - **[Eng]** Partner analytics: referrals → enrollments → placements funnel — **3d**
  - **[Content @owner]** 3-page partner onboarding PDF + email template — **2d**
  - **[Sales @owner]** WIOA-board outreach kit: outcomes methodology, screening volume report, ETPL positioning — **3d**
  - **[Sales]** **1** board pilot conversation (AAUL or TWC subcontractor) — **5d**

**Success metric:** **≥3** new partner org signups; **≥50** partner-sourced referrals in quarter; **0** placeholder numbers on public `/partners`.

**Dependencies:** Sprint 2 tenant-safe bulk import; Sprint 1 screening persistence for volume proof; Sprint 3 outcomes dashboard.

**Demo deliverable:** Partner signs up → uploads CSV → sees referral status; board one-pager with live screening count.

---

### Sprint 7 — G5 mobile parity + G6 SEO ship (2026-08-13 → 2026-08-26)

**Goal:** Paid traffic converts on mobile; organic wedge pages rank. V1 S6 + deferred PR #1390.

- **Tickets**
  - **[Eng]** Merge open PR #1390 mobile launch chrome; verify TrustStrip on `/` + `/apply` — **1d** (deferred from V1 S1)
  - **[Eng]** G5 P1 fixes from audit: sub-16px marketing copy, cookie/bottom-nav clearance, portal footer overlap — **4d** (`docs/audits/g5-mobile-parity-2026-05-18.md`)
  - **[Eng]** Homepage hero: demote multi-sector catalog below fold on mobile — **2d** (`messages/en.json:1142-1145`)
  - **[Eng]** G6: 4 blog posts + FAQPage/BreadcrumbList schema on wedge pages — **4d** (sitemap/robots/OG shipped #1383)
  - **[Eng]** Per-page OG images for apply, employers, partners — **2d** (`PLAN-2026-Q3.md` §1.2 P1 — partial via #1383)
  - **[Content @owner]** Keyword calendar: "free IT certification Austin", "Google IT Support Texas" — **2d**

**Success metric:** Mobile apply completion within **8%** of desktop; **≥20** organic sessions/day to `/apply` + program pages; Lighthouse mobile **≥90** on `/apply`.

**Dependencies:** Sprint 1 funnel P0s and wedge landing; Sprint 5 completion engine for enrolled-member UX.

**Demo deliverable:** iPhone 375px walkthrough: ad landing → apply → account; Search Console showing indexed program page.

---

### Sprint 8 — Placement loop close (2026-08-27 → 2026-09-09)

**Goal:** Close the hire loop with verified placements — **replaces V1 S8 R4 marketplace MVP**. Gate: ≥1 LOI signed (S3) or sprint slips.

- **Tickets**
  - **[Eng]** Counselor placement verification UI: hire attestation, dispute notes, `PlacementRecord` workflow — **4d**
  - **[Eng]** Member skills attestation tied to xAPI completion (not self-report) — **3d**
  - **[Eng]** Stripe pipeline subscription self-serve checkout on `/employers` — **3d**
  - **[Eng]** Placement dispute workflow (counselor + admin) — **2d**
  - **[Content @owner]** First **3** placement case studies with employer quote — **3d**
  - **[Product @owner]** Document R4 marketplace deferral criteria for 2027-Q1 — **1d**

**Success metric:** **≥3** verified placements recorded with attribution; **≥1** pipeline subscription checkout completed; **0** self-reported-only skills on placement records.

**Dependencies:** Sprint 3 employer LOI; Sprint 2 xAPI tenant; Sprint 5 completion signals.

**Demo deliverable:** Counselor records verified hire → appears in outcomes dashboard → case study published; employer completes pipeline sub checkout.

**Deferred to 2027-Q1:** R4 Smart Candidate Slate / marketplace MVP (gate: ≥10 verified placements + ≥2 paying pipeline subscribers).

---

### Sprint 9 — P5 perf + P6 resilience for scale (2026-09-10 → 2026-09-23)

**Goal:** Survive **10× traffic** when ads scale post-approval (`docs/reviews/cso-security-audit-2026-05-21.md`; Prisma perf audit #1379). Unchanged from V1 S9.

- **Tickets**
  - **[Eng]** Dashboard lazy-load + Suspense for Coursera/AI sections — **3d** (`PLAN-2026-Q3.md` §1.2 P1 — `dashboard/page.tsx` eager imports)
  - **[Eng]** N+1 audit on `staleTrainingCron`, `trainingDashboard`, `commandCenter.ts` — **3d**
  - **[Eng]** P6: Coursera/Stripe/Anthropic timeout fallbacks; webhook idempotency audit — **3d**
  - **[Eng]** Rate-limit coverage on remaining public routes — **2d**
  - **[Eng]** `/api/health/slo` real metrics (replace mocks) — **2d**
  - **[Eng]** Bundle analysis: drop unused AI SDKs from marketing bundles — **2d** (`c833a6e99` perf commit — extend)

**Success metric:** p95 dashboard TTFB **&lt;800ms** @ 50 concurrent; **0** user-facing 500 on vendor timeout in chaos test; JS bundle **−15%** on `/dashboard`.

**Dependencies:** Sprint 2 stable DB; Sprint 7 mobile pass.

**Demo deliverable:** k6 load test report + SLO dashboard green; simulated Coursera outage shows graceful degradation.

---

### Sprint 10 — Q4 close: retention measurement + 2027 plan (2026-09-24 → 2026-10-07)

**Goal:** Prove the machine works; document **2027-Q1** bets including deferred R4 marketplace.

- **Tickets**
  - **[Eng]** Retention dashboard: enrolled → Coursera start → cert → application → placement funnel — **3d**
  - **[Eng]** O*NET × placement teaser: "members like you placed at X" (read-only MVP) — **3d** (`PLAN-2026-Q3.md` §5.1 — data moat)
  - **[Eng]** S1–S9 bug burndown: top 20 P1s from `PLAN-2026-Q3.md` §1.2 still open — **4d**
  - **[Eng]** Funder export package: WIOA CSV + screening volume + partner attribution — **2d**
  - **[Product @owner]** Draft `PLAN-2027-Q1.md`: board SaaS SKU, employer pipeline scale, **R4 marketplace MVP** (gate: ≥10 placements + ≥2 pipeline subs) — **2d**
  - **[Ops @owner]** Retrospective: CPA, placements, counselor hours per placement — **1d**

**Success metric:** **≥5** verified placements in cohort; **CPA &lt;$25** enrolled member (not just apply); counselor time per placement **&lt;4h**; 2027-Q1 plan includes explicit R4 deferral gate.

**Dependencies:** All prior sprints; state approval for scaled ads; Sprint 8 placement loop.

**Demo deliverable:** Board deck: funnel, placements, partner referrals, compliance checklist signed; Q1 plan review with Mike.

---

## 2. Cross-cutting tracks (run alongside sprints)

### Content production

| Asset | Target | Owner | Sprint alignment |
|-------|--------|-------|------------------|
| Video testimonials | **10** (member + employer) | Content | S3, S7, S10 |
| OG / social images | **5** program-specific | Design | S7 |
| Employer logos (grayscale) | **6** on `/employers` | Content | S3 |
| Blog posts (wedge SEO) | **8** total by S10 | Content | S7–S8 |
| Partner onboarding PDF | **1** kit | Content | S6 |
| Placement case studies | **3** verified | Content | S8 |

### Sales

| Motion | Target | Notes |
|--------|--------|-------|
| Employer outreach | **3 LOIs** by S10 | Pipeline **subscription** hero per monetization spine (S1 doc) |
| WIOA-board introductions | **2** pilots pitched | Use screening persistence + outcomes exports (S1, S6) |
| Partner recruitment | **3** orgs by S6 | `/partners` must not ship placeholders |

### Compliance

| Item | Target | Blocking? |
|------|--------|-----------|
| Texas / EdVera state approval | Signed before ad scale | **Yes** — external |
| FORCE RLS + xAPI tenant | **S2** complete | **Yes** — before paid traffic or multi-board tenants |
| Outcome claim integrity | Dynamic or suppressed everywhere | **Yes** — before any traffic (S1) |
| Monetization spine decision | **S1** signed doc | **Yes** — before employer pricing changes (S3) |
| Audit trail expansion | Remaining `p1-audit-wireins-todo.md` paths | S2–S9 |
| ETPL / listing advantage | Documented in board kit | Sales S6 |

---

## 3. Deprecated / parked

| Item | Source | Why not in this plan |
|------|--------|----------------------|
| **V1 sprint sequence** | `PLAN-2026-Q3-Q4-10-SPRINT.md` | Resequenced in this V2 doc per CEO review |
| **S1 paid dry-run before FORCE RLS** | V1 S1 | Contradicts bear case; **$0 paid until S2** |
| **R4 marketplace MVP (S8)** | V1 S8 | **Deferred to 2027-Q1** — replace with placement loop close; gate ≥10 placements |
| **8-week parallel G/R/P schedule** | `PLAN-2026-Q3.md` §2 | Replaced by this 10×2-week sequence |
| **G7 as a future sprint** | `PLAN-2026-Q3.md` G7 | **Shipped** — paid `/apply`, UTM, `/admin/growth` |
| **G8 legal sprint** | `PLAN-2026-Q3.md` G8 | **Shipped** — privacy/sub-processors/ToS |
| **R2/R3 as greenfield** | `PLAN-2026-Q3.md` R2–R3 | **Core shipped**; plan now = finalize + measure (S4, S5) |
| **Mentor portal** | `WORKFORCEAP-ROLLOUT-PLAN-2026.md` §75–96 | Not on critical path to placements |
| **AI Interview Coach (ElevenLabs)** | Rollout plan §66 | Retention covered by R2 text coach first |
| **ElevenLabs Support Bot** | Rollout plan §174–190 | Grok widget sufficient until counselor load proven |
| **Office hours / Calendly** | Rollout plan §194–209 | Deferred; counselor inbox zero shipped (#1374) |
| **Motion 3 nonprofit SaaS pricing** | Rollout plan §136–170 | Needs attorney/CPA; **Q1 2027** in S10 doc |
| **White-label PR 3–5** | `docs/WHITE-LABEL.md` | Email branding only; blocks board SaaS SKU — post-S10 |
| **National "Google IT cert free" campaign** | `marketing/google-ads/2026-launch/README.md` | **Parked** — Texas wedge only |
| **Full R4 marketplace + auto billing** | `PLAN-2026-Q3.md` R4 | S8 = placement loop only; marketplace in 2027-Q1 |
| **Feature bets #1–15 (AI mentor DMs, gamification, SMS)** | `PLAN-2026-Q3.md` §3 | Week 21+ bets |
| **Careers page PR #1385** | Open draft PR | Park until hiring push |

---

## 4. Open questions for Mike

1. **Monetization spine:** Confirm or revise the S1 default (board SaaS primary, pipeline sub secondary, contingent fee footnote). **Must be signed in S1** — not deferred to S10.

2. **Ad spend gate:** What is the **hard date or approval artifact** that unlocks spend above dry-run — TWC letter, EdVera, ETPL listing, or board vote? S2 checklist + this artifact both required.

3. **Outcome claims:** At what placement count **N** do we show public stats, and who signs off — counsel, ED, board?

4. **Exclusive employer arrangements:** Will we sign **cohort MOUs** (20-seat pipeline, members recruited into named roles) before scaling member ads?

5. **Geo wedge:** Confirm **Central Texas only** for paid through Q4, or allow statewide TX.

---

## Appendix — V1 → V2 resequencing map

| V2 Sprint | Theme | V1 source |
|-----------|-------|-----------|
| **S1** | Trust + screening + wedge landing + monetization doc | V1 S1 (trimmed) + V1 S6 landing |
| **S2** | FORCE RLS + xAPI tenant | V1 S3 |
| **S3** | Employer LOI + outcomes | V1 S2 (trimmed) |
| **S4** | R1 + R2 finalize + `course_*` events | V1 S5 + V1 S1 events |
| **S5** | R3 Coursera completion | V1 S7 (pulled forward) |
| **S6** | G4 partners + board kit | V1 S4 (deferred) |
| **S7** | G5 mobile + G6 SEO + #1390 | V1 S6 + V1 S1 chrome |
| **S8** | Placement loop close | **New** (replaces V1 S8 R4) |
| **S9** | P5 perf + P6 resilience | V1 S9 |
| **S10** | Q4 close + 2027 plan + R4 deferral | V1 S10 |

---

## Appendix — Shipped vs open (audit trail)

| Area | Status | Evidence |
|------|--------|----------|
| Paid apply + growth dash | ✅ Shipped | `f56213f6e`, PR #1353 |
| UTM capture | ✅ Shipped | `ba2ca60ce`, `lib/marketing/utmCapture.ts` |
| R2 CoachMemory | ✅ Shipped | `2478edb15` |
| R3 kickoff emails | ✅ Shipped | `6892cf1d1`, `lib/coursera/courseKickoff.ts` |
| G3 employer landing | ✅ Shipped | `d454805f9` |
| G8 legal | ✅ Shipped | `f19d95e06` |
| SEO sitemap/OG | ✅ Shipped | `22cb65132`, #1383 |
| FORCE RLS harness | ✅ Staging only | `1f18cd4de`; prod flip **S2** |
| xAPI org NOT NULL | ❌ Open | `lib/xapi/mappings.ts:55,107` |
| WIOA screening DB | ❌ Open | `app/api/public/wioa-qualification/route.ts` |
| R4 marketplace | ❌ Deferred | 2027-Q1 per S10; S8 = placement loop |
| `/partners` real stats | ❌ Open | `app/partners/page.tsx` placeholders |
| Dynamic trust claims | ⚠️ Partial | TrustStrip #1381; placeholder `850+` remains |
| `hasCompletedInterviewPractice` | ❌ Open | `getMemberState.ts:282,318` |
| Monetization spine doc | ❌ Open | `docs/decisions/monetization-spine-2026.md` — **S1** |

---

*Owner: Product/Eng · Next review: end of Sprint 1 (2026-06-03) · Supersedes [`PLAN-2026-Q3-Q4-10-SPRINT.md`](./PLAN-2026-Q3-Q4-10-SPRINT.md).*
