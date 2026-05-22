# WorkforceAP — 10 Sprint Plan (2026-Q3 → 2026-Q4)

> **⚠️ DEPRECATED — 2026-05-21:** Superseded by **[`PLAN-2026-Q3-Q4-10-SPRINT-V2.md`](./PLAN-2026-Q3-Q4-10-SPRINT-V2.md)** (resequenced per [`ceo-10sprint-review-2026-05-21.md`](./reviews/ceo-10sprint-review-2026-05-21.md)). Do not execute from this document.

**Canonical plan:** ~~This document~~ **V2** supersedes `PLAN-2026-Q3.md`, `docs/plans/WORKFORCEAP-ROLLOUT-PLAN-2026.md` sprint sections, and parallel 8-week schedules in `docs/plans/SEPARATE-SPRINTS.md` for execution purposes.  
**Authored:** 2026-05-21  
**Baseline:** `master` @ `fe481b7fd`  
**Horizon:** 10 × 2-week sprints (~20 weeks, through 2026-10-07)  
**Sources:** 16 files in `docs/plans/`, `docs/reviews/ceo-strategic-review-2026-05-21.md`, `docs/audits/*`, recent merges (`git log -50`), open PRs (`gh pr list`)

---

## 0. North Star + Bear Case

### North Star (3 sentences)

**Paid employer placements** — hires where WorkforceAP can attribute the member, record a verified `PlacementRecord`, and collect revenue (pipeline subscription or placement fee). Everything in this plan exists to increase the count and quality of those placements, not vanity signups. Success is measured as **placements per 100 enrolled members in the Google IT Support cohort in Central Texas**, with CPA and counselor load held flat. Marketing, product, and compliance work roll up to that single monetization-bearing metric.

### Bear Case (3 sentences)

In **90 days**, WorkforceAP dies if **Texas WIOA/EdVera approval slips while paid ads run anyway** — counselors process ineligible applicants, placement rate stays near zero, and the board pulls ad budget (`docs/reviews/ceo-strategic-review-2026-05-21.md` §1.1; `PLAN-2026-Q3.md` §0). A **compliance tripwire** (cross-tenant xAPI, FORCE RLS not flipped, or **"850+ placed"** claims that don't match `/admin/outcomes`) triggers a funder or press incident and blocks state approval (`lib/xapi/mappings.ts:55,107` still nullable; `lib/marketing/trustStripMetrics.ts:16-17` placeholder; `marketing/google-ads/2026-launch/ads.csv`). **CAC blowout without enrolled-member attribution** — spend continues on national "free IT cert" keywords while Coursera completion and interview signals stay blind (`hasCompletedInterviewPractice` hardcoded `false` in `lib/member/getMemberState.ts:282,318`) — burns runway before employer LOIs convert (`docs/reviews/ceo-strategic-review-2026-05-21.md` §1.3–1.6).

---

## 1. Sprint Schedule

> **Date math:** Sprint 1 starts **2026-05-21** (today). Each sprint = 14 calendar days.  
> **Already shipped (do not re-plan):** G7 paid `/apply` + growth dashboard (`f56213f6e`, PR #1353); G3 employer landing (`d454805f9`, #1357); G8 legal/sub-processors (`f19d95e06`, #1348); R2 CoachMemory (`2478edb15`, #1349); R3 kickoff/accountability emails (`6892cf1d1`, #1347); UTM capture (`ba2ca60ce`); login funnel events (`PLAN-2026-Q3.md` Appendix — fixed); TrustStrip component (#1381); SEO sitemap/robots/OG (#1383); FORCE RLS **staging harness** (`1f18cd4de`, #1340); ESLint build gate (`fa8f9ebe3`, #1366); counselor bulk actions (#1374); post-conversion thank-you pages (#1386); broken-link fixes (`docs/audits/broken-links-fixed-2026-05-21.md`).

---

### Sprint 1 — G1 funnel close + paid-traffic dry-run (2026-05-21 → 2026-06-03)

**Goal:** Close the apply→enroll measurement loop and run a **$0–500/day** paid dry-run only after trust claims and screening persistence are safe.

- **Tickets**
  - **[Eng @owner]** Bind all external "placed" copy to `loadTrustStripMetrics()` / `getPublicImpactStats()`; remove hardcoded `850+` from ads, `PaidApplyVariant`, and `TRUST_STRIP_PLACEHOLDER_LINE` when `hasLiveData` — **3d** (`lib/marketing/trustStripMetrics.ts`, `marketing/google-ads/2026-launch/`)
  - **[Eng]** Persist `PublicWioaScreening` on `POST /api/public/wioa-qualification`; email = notification only — **2d** (`app/api/public/wioa-qualification/route.ts` — still email-only per CEO review)
  - **[Eng]** Finish apply-funnel P0s still open: step-1 inline validation, phone hint, ≥1 program on results, password strength — **3d** (`PLAN-2026-Q3.md` §1.1)
  - **[Eng]** Wire `course_launched` + progress milestones (25/50/75/100%) — **2d** (R3 emails shipped; events still missing per `PLAN-2026-Q3.md` §1.3 P2)
  - **[Eng]** Merge open PR #1390 mobile launch chrome; verify TrustStrip on `/` + `/apply` — **1d**
  - **[Marketing @owner]** Rewrite ad copy per `docs/DAILY-OPERATING-PLAN.md` ("no-cost for qualifying members"); **pause US-national campaign** — **1d**
  - **[Ops @owner]** Written ad-spend gate: no scale until TWC approval + compliance checklist green — **0.5d**

**Success metric:** Apply step-1→account-created ≥ **45%** on paid traffic; **$0** ad spend until approval doc signed; public placement claims **100% dynamic** or suppressed.

**Dependencies:** Texas approval timeline (external); G7 landing already on `master`.

**Demo deliverable:** Live `/admin/growth` dashboard showing UTM → apply → account_created → enrolled; side-by-side old vs new trust copy on staging.

---

### Sprint 2 — G3 employer activation + outcomes dashboard (2026-06-04 → 2026-06-17)

**Goal:** Turn shipped employer landing into **signed pipeline interest** and give funders a defensible outcomes view.

- **Tickets**
  - **[Eng]** Employer activation: Stripe pipeline subscription as hero CTA; demote contingent placement fee to footnote — **3d** (`lib/marketing/employerLanding.ts`; CEO §4 recommendation)
  - **[Eng]** `/admin/outcomes` board snapshot: placement count, avg wage, suppression rules per `docs/OUTCOMES-METHODOLOGY.md` — **2d**
  - **[Eng]** Employer CTA A/B experiment analysis + ship winner (`a21d19e9d` experiment) — **2d**
  - **[Sales @owner]** 3 employer discovery calls → **1 LOI** (pipeline sub, not placement-fee-only) — **5d**
  - **[Content]** 2 Texas employer case studies on `/employers` (extend #1380 seed) — **2d**
  - **[Eng]** `hasCompletedInterviewPractice` from real session data, not `false` — **2d** (`lib/member/getMemberState.ts:282,318`)
  - **[Eng]** Dashboard `dashboard_primary_cta_clicked` events — **1d** (R1 telemetry gap per `PLAN-2026-Q3.md` §1.2)

**Success metric:** **≥1** employer LOI or paid pilot; employer contact-form conversion **+15%** vs May baseline; outcomes page loads live counts with **N&lt;10 suppression**.

**Dependencies:** Sprint 1 trust-safe metrics.

**Demo deliverable:** Employer demo: landing → contact → admin placement record; funder view of same placement in outcomes snapshot.

---

### Sprint 3 — FORCE RLS flip + multi-tenancy hardening (2026-06-18 → 2026-07-01)

**Goal:** Production-safe tenant isolation — **#0 audit standout** (`docs/audits/p1-rls-policy-review-2026-05-18.md`).

- **Tickets**
  - **[Eng]** xAPI `organization_id NOT NULL` + backfill + ingest filter — **3d** (`lib/xapi/mappings.ts` — partial admin scoping in `a8204dc89`, NOT NULL still open)
  - **[Eng]** Fix layout GUC: `app/layout.tsx` must pass real `orgId`, not `null` — **2d** (audit § "Org resolution gaps")
  - **[Eng]** `NULLIF(get_current_org_id(),'')` in SQL helpers + applications INSERT policies — **3d** (audit: writes hard-fail under FORCE)
  - **[Eng]** Execute `docs/runbooks/force-rls-staging-rehearsal.md` → prod flip checklist — **3d** (harness shipped #1340; prod flip deferred)
  - **[Eng]** Expand `verify-high-risk-tenant-routes.cjs` to 30+ routes — **2d** (`PLAN-2026-Q3.md` §1.2 P1)
  - **[Eng]** Complete xAPI audit wire-ins on destructive admin paths — **2d** (`docs/audits/p1-audit-wireins-todo.md` high-priority list)

**Success metric:** Shadow FORCE RLS test matrix **100% pass**; **0** cross-org reads in staging penetration script; xAPI tables **0** null `organization_id`.

**Dependencies:** Sprint 1–2 no schema-breaking releases without rehearsal.

**Demo deliverable:** Staging demo: Org A admin cannot see Org B member; xAPI event credits correct org.

---

### Sprint 4 — G4 partners landing + WIOA-board outreach kit (2026-07-02 → 2026-07-15)

**Goal:** B2B partner channel with **real stats** and board-ready collateral.

- **Tickets**
  - **[Eng]** Replace placeholder stats/logos on `/partners` with live partner metrics or suppressed UI — **2d** (`app/partners/page.tsx` — page exists per `c833a6e99`, placeholders per CEO review)
  - **[Eng]** Partner self-serve signup → invite flow; CSV bulk referral upload MVP — **5d** (`PLAN-2026-Q3.md` G4)
  - **[Eng]** Partner analytics: referrals → enrollments → placements funnel — **3d**
  - **[Content @owner]** 3-page partner onboarding PDF + email template — **2d**
  - **[Sales @owner]** WIOA-board outreach kit: outcomes methodology, screening volume report, ETPL positioning — **3d**
  - **[Sales]** **1** board pilot conversation (AAUL or TWC subcontractor) — **5d**

**Success metric:** **≥3** new partner org signups; **≥50** partner-sourced referrals in quarter; **0** placeholder numbers on public `/partners`.

**Dependencies:** Sprint 3 tenant-safe bulk import; Sprint 1 screening persistence for volume proof.

**Demo deliverable:** Partner signs up → uploads CSV → sees referral status; board one-pager with live screening count.

---

### Sprint 5 — R1 first-value + R2 coach memory finalize (2026-07-16 → 2026-07-29)

**Goal:** Day-7 retention and stateful AI coach — **build on shipped R2**, close signal gaps.

- **Tickets**
  - **[Eng]** R2 finalize: `parentToolResultId` linkage across resume → cover letter → interview — **2d** (shipped base `lib/ai/aiCoachContext.ts`; polish per `PLAN-2026-Q3.md` R2)
  - **[Eng]** R1: cohort count in dashboard hero + assessment prefill from intake — **3d** (`docs/plans/2026-Q2-product-outcomes.md`)
  - **[Eng]** `MemberNextStepsStrip` analytics: `next_step_click` with `action_id` — **1d**
  - **[Eng]** Onboarding "Why WorkforceAP" video in tour — **2d**
  - **[Eng]** Day-5 Coursera accountability nudge verification + day-14 silence alert to counselor queue — **2d** (R3 kickoff shipped `lib/coursera/courseKickoff.ts`)
  - **[Product @owner]** Tune `lib/member/nextBestActions.ts` priority rules from counselor feedback — **2d**

**Success metric:** Day-1→7 return **+10pp** vs June baseline; members using **≥2** AI tools/week **+15pp**; week-1 assessment completion **+15pp**.

**Dependencies:** Sprint 1 `course_*` events; Sprint 2 interview completion signal.

**Demo deliverable:** New member enrolls → dashboard shows cohort + next steps → coach references prior resume in cover-letter tool.

---

### Sprint 6 — G5 mobile parity + G6 SEO ship (2026-07-30 → 2026-08-12)

**Goal:** Paid traffic converts on mobile; organic wedge pages rank.

- **Tickets**
  - **[Eng]** G5 P1 fixes from audit: sub-16px marketing copy, cookie/bottom-nav clearance, portal footer overlap — **4d** (`docs/audits/g5-mobile-parity-2026-05-18.md`)
  - **[Eng]** Single-program performance landing: `/programs/google-it-support` as default paid destination — **3d** (CEO wedge recommendation)
  - **[Eng]** Homepage hero: demote multi-sector catalog below fold on mobile — **2d** (`messages/en.json:1142-1145`)
  - **[Eng]** G6: 4 blog posts + FAQPage/BreadcrumbList schema on wedge pages — **4d** (sitemap/robots/OG shipped #1383)
  - **[Eng]** Per-page OG images for apply, employers, partners — **2d** (`PLAN-2026-Q3.md` §1.2 P1 — partial via #1383)
  - **[Content @owner]** Keyword calendar: "free IT certification Austin", "Google IT Support Texas" — **2d**

**Success metric:** Mobile apply completion within **8%** of desktop; **≥20** organic sessions/day to `/apply` + program pages; Lighthouse mobile **≥90** on `/apply`.

**Dependencies:** Sprint 1 funnel P0s; TrustStrip mobile (#1390).

**Demo deliverable:** iPhone 375px walkthrough: ad landing → apply → account; Search Console showing indexed program page.

---

### Sprint 7 — R3 Coursera completion engine (real wire-in) (2026-08-13 → 2026-08-26)

**Goal:** Move from "emails shipped" to **measurable completion lift** — CEO §1.4 churn cliff.

- **Tickets**
  - **[Eng]** Cert celebration email + dashboard widget tied to xAPI completion — **3d** (kickoff shipped; celebration polish)
  - **[Eng]** Day-5 / day-14 automated nudge cron with counselor escalation — **3d**
  - **[Eng]** Points/badges for first cert + streak counter MVP — **3d** (`PLAN-2026-Q3.md` G5/R3)
  - **[Eng]** Admin Coursera health: unmatched-actor alerts per org — **2d**
  - **[Eng]** Member-facing course progress card on dashboard — **2d**
  - **[Analytics @owner]** Baseline: first-course completion rate in 30d — **1d**

**Success metric:** First-course completion **45% → 55%** in 30d cohort; cert celebration email open **≥40%**; day-14 silence **−25%**.

**Dependencies:** Sprint 1 `course_*` events; Sprint 3 xAPI tenant correctness.

**Demo deliverable:** Test member enrolls → kickoff → nudges → cert email → dashboard badge; admin health shows org-scoped events.

---

### Sprint 8 — R4 marketplace v2 → MVP (2026-08-27 → 2026-09-09)

**Goal:** First **employer shortlist → member prep** loop — moat seed, not full marketplace (`PLAN-2026-Q3.md` R4; **zero code today** per CEO review).

- **Tickets**
  - **[Eng]** "Smart Candidate Slate" filter: cert, location, profile completeness rank — **5d**
  - **[Eng]** Employer "Shortlist" action → member notification + interview-prep deep link — **4d**
  - **[Eng]** Member job board tabs: "Matches your skills" / "Hiring now" — **3d**
  - **[Eng]** Employer job-post analytics (views, shortlists) — **2d**
  - **[Product @owner]** Define MVP scope cut: no auto-billing on hire yet — **1d**

**Success metric:** **≥10** employer shortlists/month; member application rate on matched jobs **20% → 28%**; time-to-first shortlist **&lt;7d** after job post.

**Dependencies:** Sprint 2 employer LOIs; Sprint 5 interview signal.

**Demo deliverable:** Employer posts job → shortlists 3 candidates → members receive prep CTA; counselor sees shortlist in queue.

---

### Sprint 9 — P5 perf + P6 resilience for scale (2026-09-10 → 2026-09-23)

**Goal:** Survive **10× traffic** when ads scale post-approval (`docs/reviews/cso-security-audit-2026-05-21.md`; Prisma perf audit #1379).

- **Tickets**
  - **[Eng]** Dashboard lazy-load + Suspense for Coursera/AI sections — **3d** (`PLAN-2026-Q3.md` §1.2 P1 — `dashboard/page.tsx` eager imports)
  - **[Eng]** N+1 audit on `staleTrainingCron`, `trainingDashboard`, `commandCenter.ts` — **3d**
  - **[Eng]** P6: Coursera/Stripe/Anthropic timeout fallbacks; webhook idempotency audit — **3d**
  - **[Eng]** Rate-limit coverage on remaining public routes — **2d**
  - **[Eng]** `/api/health/slo` real metrics (replace mocks) — **2d**
  - **[Eng]** Bundle analysis: drop unused AI SDKs from marketing bundles — **2d** (`c833a6e99` perf commit — extend)

**Success metric:** p95 dashboard TTFB **&lt;800ms** @ 50 concurrent; **0** user-facing 500 on vendor timeout in chaos test; JS bundle **−15%** on `/dashboard`.

**Dependencies:** Sprint 3 stable DB; Sprint 6 mobile pass.

**Demo deliverable:** k6 load test report + SLO dashboard green; simulated Coursera outage shows graceful degradation.

---

### Sprint 10 — Q4 close: retention measurement + polish + 2027 plan (2026-09-24 → 2026-10-07)

**Goal:** Prove the machine works; document **2026-Q1** bets.

- **Tickets**
  - **[Eng]** Retention dashboard: enrolled → Coursera start → cert → application → placement funnel — **3d**
  - **[Eng]** O*NET × placement teaser: "members like you placed at X" (read-only MVP) — **3d** (`PLAN-2026-Q3.md` §5.1 — data moat)
  - **[Eng]** S1–S9 bug burndown: top 20 P1s from `PLAN-2026-Q3.md` §1.2 still open — **4d**
  - **[Eng]** Funder export package: WIOA CSV + screening volume + partner attribution — **2d**
  - **[Product @owner]** Draft `PLAN-2027-Q1.md`: board SaaS SKU vs employer pipeline — **2d**
  - **[Ops @owner]** Retrospective: CPA, placements, counselor hours per placement — **1d**

**Success metric:** **≥5** verified placements in cohort; **CPA &lt;$25** enrolled member (not just apply); counselor time per placement **&lt;4h**; documented Q1 monetization spine decision.

**Dependencies:** All prior sprints; state approval for scaled ads.

**Demo deliverable:** Board deck: funnel, placements, partner referrals, compliance checklist signed; Q1 plan review with Mike.

---

## 2. Cross-cutting tracks (run alongside sprints)

### Content production

| Asset | Target | Owner | Sprint alignment |
|-------|--------|-------|------------------|
| Video testimonials | **10** (member + employer) | Content | S2, S6, S10 |
| OG / social images | **5** program-specific | Design | S6 |
| Employer logos (grayscale) | **6** on `/employers` | Content | S2 |
| Blog posts (wedge SEO) | **8** total by S10 | Content | S6–S7 |
| Partner onboarding PDF | **1** kit | Content | S4 |

### Sales

| Motion | Target | Notes |
|--------|--------|-------|
| Employer outreach | **3 LOIs** by S10 | Pipeline **subscription** hero, not contingent-only (CEO §4) |
| WIOA-board introductions | **2** pilots pitched | Use screening persistence + outcomes exports (S1, S4) |
| Partner recruitment | **3** orgs by S4 | `/partners` must not ship placeholders |

### Compliance

| Item | Target | Blocking? |
|------|--------|-----------|
| Texas / EdVera state approval | Signed before ad scale | **Yes** — external |
| FORCE RLS + xAPI tenant | S3 complete | **Yes** — before multi-board tenants |
| Outcome claim integrity | Dynamic or suppressed everywhere | **Yes** — before S1 dry-run |
| Audit trail expansion | Remaining `p1-audit-wireins-todo.md` paths | S3–S9 |
| ETPL / listing advantage | Documented in board kit | Sales S4 |

---

## 3. Deprecated / parked

| Item | Source | Why not in this plan |
|------|--------|----------------------|
| **8-week parallel G/R/P schedule** | `PLAN-2026-Q3.md` §2 | Replaced by this 10×2-week sequence; many G/R items already merged to `master` |
| **G7 as a future sprint** | `PLAN-2026-Q3.md` G7 | **Shipped** — paid `/apply`, UTM, `/admin/growth` (`f56213f6e`, `ba2ca60ce`) |
| **G8 legal sprint** | `PLAN-2026-Q3.md` G8 | **Shipped** — privacy/sub-processors/ToS (`f19d95e06`) |
| **R2/R3 as greenfield** | `PLAN-2026-Q3.md` R2–R3 | **Core shipped** (#1347, #1349); plan now = finalize + measure (S5, S7) |
| **Mentor portal** | `WORKFORCEAP-ROLLOUT-PLAN-2026.md` §75–96 | Not on critical path to placements; branch `feat/mentor-portal` not merged |
| **AI Interview Coach (ElevenLabs)** | Rollout plan §66 | In-flight branch; retention covered by R2 text coach first |
| **ElevenLabs Support Bot** | Rollout plan §174–190 | Grok widget sufficient until counselor load proven |
| **Office hours / Calendly** | Rollout plan §194–209 | Deferred; counselor inbox zero shipped (#1374) |
| **Motion 3 nonprofit SaaS pricing** | Rollout plan §136–170 | Needs attorney/CPA; **Q1 2027** in S10 doc, not Q3–Q4 build |
| **White-label PR 3–5** | `docs/WHITE-LABEL.md` | Email branding only; blocks board SaaS SKU — post-S10 |
| **National "Google IT cert free" campaign** | `marketing/google-ads/2026-launch/README.md` | **Parked** — Texas wedge only (CEO §3) |
| **Full R4 marketplace + auto billing** | `PLAN-2026-Q3.md` R4 | S8 = MVP shortlist only; hire-event Stripe not on `master` |
| **Feature bets #1–15 (AI mentor DMs, gamification, SMS)** | `PLAN-2026-Q3.md` §3 | Week 21+ bets; retention focus is R1/R3/R5 first |
| **O*NET ↔ 19 programs Grok mapping** | `SEPARATE-SPRINTS.md` | Separate engineering track; S10 teaser only |
| **Sidebar redesign** | `2026-04-03-sidebar-redesign.md` | Superseded by portal perf work (`c833a6e99`) |
| **Portal preview rollout** | `2026-04-29-portal-preview-rollout.md` | Absorbed into ongoing portal hardening |
| **Shadow paths / proactive career OS** | `2026-04-11-*.md` | Exploratory; no placement metric tie |
| **Marketing rewrite inventory/QA** | `2026-04-11-workforceap-marketing-*.md` | Superseded by wedge focus + S1/S6 |
| **Members portal launch checklist (Mar)** | `2026-03-14-members-portal-launch-checklist.md` | Portal live; checklist historical |
| **Prelaunch stability sprint (Apr 14)** | `2026-04-14-prelaunch-stability-trust-sprint.md` | Items merged or tracked in `PLAN-2026-Q3.md` §1 |
| **AAYHF partner dashboard spec** | `AAYHF-partner-dashboard-spec-2026-05-02.md` | Partner-specific; generalize in S4 partner analytics |
| **TRANSCRIPT-REVIEW-BACKLOG** | `TRANSCRIPT-REVIEW-BACKLOG.md` | Input queue, not execution schedule |
| **Careers page PR #1385** | Open draft PR | Park until hiring push; not blocking funnel |

---

## 4. Open questions for Mike

1. **Monetization spine:** Do we commit to **board SaaS ($2–5K/mo outcomes terminal)** as primary revenue, with employer **pipeline subscription** secondary — or keep marketing the **$2,500 contingent placement fee** as hero (`lib/marketing/employerLanding.ts`)? CEO review recommends funder-first; site still dual-pitch.

2. **Ad spend gate:** What is the **hard date or approval artifact** that unlocks spend above dry-run — TWC letter, EdVera, ETPL listing, or board vote? Needed to avoid §1.1 bear case.

3. **Outcome claims:** At what placement count **N** do we show public stats, and who signs off — counsel, ED, board? (`docs/OUTCOMES-METHODOLOGY.md` vs live `TrustStrip` placeholder fallback.)

4. **Exclusive employer arrangements:** Will we sign **cohort MOUs** (20-seat pipeline, members recruited into named roles) before scaling member ads — reversing chicken-and-egg per CEO §2?

5. **Geo wedge:** Confirm **Central Texas only** for paid through Q4, or allow statewide TX — affects campaign structure in `marketing/google-ads/2026-launch/`.

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
| FORCE RLS harness | ✅ Staging only | `1f18cd4de`; prod flip **S3** |
| xAPI org NOT NULL | ❌ Open | `lib/xapi/mappings.ts:55,107` |
| WIOA screening DB | ❌ Open | `app/api/public/wioa-qualification/route.ts` |
| R4 marketplace | ❌ Open | CEO review §2 |
| `/partners` real stats | ❌ Open | `app/partners/page.tsx` placeholders |
| Dynamic trust claims | ⚠️ Partial | TrustStrip #1381; placeholder `850+` remains |
| `hasCompletedInterviewPractice` | ❌ Open | `getMemberState.ts:282,318` |

---

*Owner: Product/Eng · Next review: end of Sprint 1 (2026-06-03) · Supersedes sprint scheduling sections in `PLAN-2026-Q3.md`.*
