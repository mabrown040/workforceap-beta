# WorkforceAP — CEO Strategic Review

**Date:** 2026-05-21  
**Reviewer lens:** YC-style CEO (impact × clarity × risk)  
**Sources:** `PLAN-2026-Q3.md`, `docs/workforceap-product-vision.md`, `docs/plans/WORKFORCEAP-ROLLOUT-PLAN-2026.md`, `docs/PRODUCT_STAKES.md`, `docs/OUTCOMES-METHODOLOGY.md`, `docs/MULTI-SPRINT-PLAN-2026-05-13.md`, `docs/DAILY-OPERATING-PLAN.md`  
**Codebase:** `master` @ `c833a6e99` (2026-05-21)

---

## Executive read (30 seconds)

WorkforceAP has **built an unusually complete workforce OS** for a small team — four portals, Coursera xAPI, WIOA reporting, AI toolkit, partner attribution, and (as of last week) **R2 AI coach memory**. The Q3 plan correctly identifies that **paid acquisition before state approval + incomplete compliance hardening = company-killer risk**.

The strategic mistake I see: **the product still markets like a general workforce nonprofit while the only wedge that can win paid search is a narrow Texas IT-cert path.** Revenue is split between grant dependency, a contingent per-placement employer fee, and aspirational SaaS/licensing — none of which has a closed, repeatable sales loop yet.

**Verdict:** Survive the next 90 days by **not turning on ads until trust/compliance gaps close**; win the next 24 months by **picking one monetization spine (funder SaaS or employer pipeline subscription) and one wedge message**, not both broad catalog + placement fee.

---

## 1. Bear case — what kills this in 90 days

### 1.1 State approval slips → burn with no measurable funnel

`PLAN-2026-Q3.md` §0 and §6 assume ads turn on once **Texas Workforce Commission / EdVera approval** lands (`docs/workforceap-product-vision.md:120`). If approval slips past July, the team will feel pressure to spend anyway. Without WIOA eligibility certainty, **CAC on "WIOA-funded" keywords becomes refund/chargeback risk** — members enroll expecting funding that isn't contractually live.

**Kill scenario:** $15–20K ad spend in 60 days, approval still pending, counselors drowning in ineligible applicants, board asks why placement rate is 0%.

### 1.2 Regulatory / compliance tripwires (still open on master)

| Risk | Plan claim | Master reality |
|------|------------|----------------|
| xAPI cross-tenant leakage | P0: `organization_id NOT NULL` on xAPI tables (`PLAN-2026-Q3.md` §1.1, `lib/xapi/mappings.ts:51-123`) | **Still nullable.** `lib/xapi/mappings.ts:55,107` — `organization_id TEXT` with `ADD COLUMN IF NOT EXISTS`, no `NOT NULL`, no enforced filter on ingest. Multi-tenant flip = wrong-org completion credits. |
| FORCE RLS not production-flipped | P1 goal: staging rehearsal then prod (`PLAN-2026-Q3.md` §2.3 P1; `docs/runbooks/force-rls-staging-rehearsal.md`) | RLS policies exist; **FORCE RLS migration deferred.** Today Prisma service-role bypasses RLS — one mis-scoped admin route = cross-org data leak under traffic. |
| Public WIOA screenings not persisted | P1 (`PLAN-2026-Q3.md` §1.2; `app/api/public/wioa-qualification/route.ts:42-66`) | **Still email-only.** Route sends notification (`route.ts:55-64`) and returns JSON; **no DB write.** Cannot prove screening volume to TWC partners. |
| Outcome claim integrity | `docs/OUTCOMES-METHODOLOGY.md:17` — no aspirational numbers in external materials | **Ads pre-loaded with "850+ Placed".** `marketing/google-ads/2026-launch/ads.csv:2` headlines + `app/apply/PaidApplyVariant.tsx:23` trust pill `850+ placed in TX`. If `/admin/outcomes` count is lower, this is a **WIOA/trust violation** waiting for a journalist or auditor. |

### 1.3 CAC blowout with attribution still immature

The plan's #1 finding was missing UTM (`PLAN-2026-Q3.md` §0, §4.2). **Partially fixed:** `lib/marketing/utmCapture.ts`, `components/marketing/UtmCapture.tsx`, signup routes persist `utm_source`. Good.

**Still blind spots that blow CAC math:**
- Coursera progress not instrumented (`PLAN-2026-Q3.md` §1.3 P2 — no `course_launched` / milestone events in codebase)
- `hasCompletedInterviewPractice` hardcoded `false` in `lib/member/getMemberState.ts:282,318` — R2 coach and retention scoring fly blind on interview completion
- Google Ads config targets **$15 CPA** (`marketing/google-ads/2026-launch/README.md:20-24`) across 5 campaigns including **US-national** "Google IT certificate free" — math doesn't close for a counselor-heavy nonprofit

**Kill scenario:** Spend $12K, can't answer which campaign produced enrolled (not just applied) members → repeat spend on wrong geo/keyword → runway burn.

### 1.4 Churn cliff: enrollment without completion engine

`PLAN-2026-Q3.md` §2.2 **R3 Coursera completion engine** (kickoff email, day-5 nudge, cert celebration) — **not shipped.** Raw xAPI ingest exists; no derived lifecycle nudges. Workforce programs live or die at **day 14 Coursera silence**.

**Kill scenario:** 200 enrollments from ads, 30% start Coursera, 8% finish cert, 2 placements → funders call it a lead-gen site, not a workforce provider.

### 1.5 Competitive displacement by incumbent WIOA grantees

Goodwill, Urban League chapters, and TWC subcontracted boards already have **trust + physical presence + eligibility intake**. They don't have your UX — but they don't need it if you're spending on the same keywords without ETPL/listing advantage.

**Kill scenario:** AAUL or a TWC board launches "free Google cert" with official board branding; your CAC doubles, partner referrals stall because you're not the "official" board channel.

### 1.6 Employer revenue model stalls

Per-placement fee is on the website (`lib/marketing/employerLanding.ts:24-26` → `$2,500` default; `messages/en.json:1610` "Pay only when you hire"). **No evidence of closed-loop Stripe placement billing** — Stripe webhooks handle org **subscriptions** (`app/api/stripe/webhook/route.ts:56-73`), not hire events. Sales cycle for first employer LOI is 90+ days; you can't pay Facebook with contingent fees.

---

## 2. 10-star product check — is this the boldest version of the roadmap?

**No.** The Q3 plan is an excellent **audit remediation + parallel sprint schedule**, but it is **not the boldest product strategy**. It optimizes for "don't break under 10× traffic" more than "become inevitable."

### What's strong (9/10 execution intent)

- Closed-loop architecture is real: partner refer → train → employer hire → placement record → partner outcome (`docs/workforceap-product-vision.md:57-67`) — not vaporware.
- R2 AI coach memory **shipped** (`lib/ai/aiCoachContext.ts:1-15`; master commit `2478edb15`) — rare for a nonprofit build velocity.
- Compliance ambition is correct: 3-year audit retention (`lib/retention/config.ts:62-66`), privacy sub-processors listed (`app/privacy/page.tsx:46-85`).
- Paid apply variant is the sharpest surface in the repo (`app/apply/PaidApplyVariant.tsx:49-50`).

### Where scope is timid

| Area | Plan ambition | Actual boldness | Gap |
|------|---------------|-----------------|-----|
| **Wedge** | G7 paid acquisition | Homepage still multi-sector catalog (`messages/en.json:1142-1145` — IT, Healthcare, Manufacturing, Trades…) | Marketing breadth ≠ conversion depth |
| **Marketplace** | R4 "Smart Candidate Slate", employer shortlist → auto prep (`PLAN-2026-Q3.md` §2.2 R4) | **Zero code.** No marketplace module; standard job board | Chicken-egg unsolved; plan punts to week 4+ |
| **O*NET outcomes moat** | §5.1 "87% probability IT Support role" (`PLAN-2026-Q3.md` §5.1) | O*NET quiz exists (`lib/onet/*`) but **not fused with placement outcomes** for member-facing recommendations | Data moat is a slide, not product |
| **Funder SaaS** | §5.4 + feature bet #15 `$5–20k/yr` (`PLAN-2026-Q3.md` §3 #15) | Admin analytics exist; **no self-serve board tenant, no pricing, no sales motion** | Highest-mission revenue line is a footnote |
| **AI mentor DMs** | Feature bet #1 (`PLAN-2026-Q3.md` §3 #1) | Voice infra exists; **no proactive outbound coach** | Retention bet deferred past sprint 8 |
| **Platform licensing** | Phase 2 white-label (`docs/workforceap-product-vision.md:102-107`) | `docs/WHITE-LABEL.md:8` — **PR 3–5 not started** (nav/footer/PDF branding) | Can't sell SaaS you can't rebrand |
| **Mentor portal** | Rollout plan "in progress" (`docs/plans/WORKFORCEAP-ROLLOUT-PLAN-2026.md:84-90) | Not on master critical path | Free expert capacity unused |

### The 10-star version would look like

1. **One program, one geo, one outcome** for 90 days: "Google IT Support cert → helpdesk job in Central Texas" — kill parallel sector marketing.
2. **Employer cohort pre-commit** before member ads: 2 employers sign "20-seat pipeline MOU" → then recruit members into *their* roles (reverse the chicken-egg in §8.4).
3. **Funder dashboard as SKU #1:** sell AAUL/TWC a `$2k/mo` outcomes terminal before selling employers anything.
4. **Proactive AI coach** (feature bet #1) as week-2 retention, not week-20 buffer.

---

## 3. Wedge sharpness — "free IT cert in Texas"

### Sharp variant (exists in code)

`app/apply/PaidApplyVariant.tsx:49-50`:
> "No-cost IT certification — start in 30 minutes."

Plus trust row: WIOA-funded, 0 cost, 850+ placed in TX (`PaidApplyVariant.tsx:23`). This is **specific enough to win a Google Ads auction** for Austin/TX IT intent.

Google Ads staging aligns: `marketing/google-ads/2026-launch/README.md:20` — "free IT certification Austin" campaign at $35/day.

### Blunt variant (still the default brand)

Homepage hero (`messages/en.json:1142-1145`):
> "Digital Literacy, Tech, Data, AI, Healthcare, Manufacturing, and Skilled Trades"

That's **six wedges**, not one. `docs/PRODUCT_STAKES.md:32-33` locks "no cost to members" language, but the homepage violates the *spirit* of focus — a 38-year-old career changer can't answer "what am I applying for?" in 5 seconds.

### Messaging contradictions (roadmap vs code)

| Surface | Says | Problem |
|---------|------|---------|
| `docs/DAILY-OPERATING-PLAN.md:117-124` | Never say "free" without qualification | `marketing/google-ads/2026-launch/ads.csv:2` headlines include **"Free IT Certification Austin"**, **"Get IT Certified — Free"** |
| `docs/OUTCOMES-METHODOLOGY.md:17` | No aspirational numbers externally | Ads + paid apply use **850+** without dynamic binding to `lib/marketing/publicImpactStats.ts` |
| `app/partners/page.tsx:11-12` | G4 partner launch | **Placeholder stats** (450 / 83% / 340) — comment says replace before launch; if shipped to prod, B2B trust breaks |
| National campaign | `marketing/google-ads/2026-launch/README.md:22` | "Google IT certificate free" **United States** geo — wedge is Texas; CAC will bleed |

### Recommendation

**"Free IT cert in Texas" is the right wedge; the main site is not on-wedge.** Make paid apply + `/programs/google-it-support` (or single quick-start) the default ad landing; demote multi-sector homepage to brand/SEO, not performance.

Minimum viable sharpness test: **>70% of paid traffic lands on a single-program page with one primary CTA** — today it's mixed.

---

## 4. Monetization — employer per-placement vs alternatives

### Current model (hybrid, unfocused)

| Stream | Evidence | Assessment |
|--------|----------|------------|
| WIOA / grants | Core (`docs/workforceap-product-vision.md:119-120`) | **Necessary but not a moat** — political, slow, cap-bound |
| Employer per-placement | `getEmployerPlacementFeeDisplay()` → `$2,500` contingent (`lib/marketing/employerLanding.ts:24-26`) | **High friction.** HR/legal review, proof-of-hire disputes, low repeat rate (most SMBs hire 1–2/year) |
| Employer subscription | Stripe webhooks + org `subscriptionStatus` (`app/api/stripe/webhook/route.ts`) | **Exists in code** (`docs/MULTI-SPRINT-PLAN-2026-05-13.md:14-15`) but **not the hero offer** on `/employers` |
| Partner revenue share | 10% model in rollout plan (`docs/plans/WORKFORCEAP-ROLLOUT-PLAN-2026.md:130-131`) | Good for referrals; **doesn't scale without partner density** |
| Nonprofit SaaS / board license | Vision Phase 2 (`docs/workforceap-product-vision.md:102-107`); plan §5.4 | **Best strategic fit** — recurring, grant-fundable, aligns with mission |

### Per-placement model — why it fails to scale

1. **Sales cycle:** 90–180 days from first contact → first hire → invoice. Cash lag kills ad-funded growth.
2. **LTV:** One $2,500 fee × 1 hire/year = **$2,500 LTV** vs $5–15K CAC to acquire the employer through outbound.
3. **Verification cost:** Placement records are admin-entered; disputes require counselor time — you become a staffing agency without margin.
4. **Misaligned homepage:** `/employers` sells pipeline + fee; product vision sells **co-funding cohorts** (`docs/workforceap-product-vision.md:122-123`) — two pitches, neither dominant.

### Alternative: per-seat SaaS to WIOA boards (recommended spine)

**Pitch:** "WorkforceAP is the outcomes terminal your board reports to Austin/TWC with — live PIRL, placement verification, partner attribution, multilingual member UX."

| | Per-placement | Board SaaS |
|--|---------------|------------|
| Buyer | HR (discretionary) | WIOA director (mandated reporting pain) |
| Cycle | Long | 6–12 mo grant cycle but **renewable** |
| ACV | $2.5K one-shot | **$24–60K/yr** (10 seats × $200/mo or flat $2K/mo × org) |
| Defensibility | Commodity vs staffing firms | Compliance lock-in + data history |
| Code readiness | Job board exists | **Admin WIOA exports + multi-tenancy scaffold exist** — needs packaging + FORCE RLS |

**Hybrid that works:** Board SaaS is the **revenue spine**; employer pays **annual pipeline subscription** (already in Stripe) for search + shortlist, not contingent placement fee. Placement fee becomes upsell for white-glove recruiting, not core.

### Leadership decision (from plan §8)

`PLAN-2026-Q3.md` §8.511 asks employer tiers vs funder analytics — **pick funder analytics.** Employer fees are bonus, not base.

---

## 5. Moat analysis — what's defensible in 24 months

| Moat candidate | 24mo defensibility | Status on master | Notes |
|----------------|-------------------|------------------|-------|
| **Data flywheel (placements → recommendations)** | **Medium-high** if built | **Low today** | Placements recorded; O*NET integrated (`lib/onet/*`); **no closed loop** showing "members like you placed at X." Plan §5.1 is right; execution absent. |
| **AI coach memory (R2)** | **Medium** | **Shipped** | `lib/ai/aiCoachContext.ts` + CoachMemory finalize (`2478edb15`). Copied in 6–9 months by any AI wrapper — moat only if tied to **verified outcomes + counselor workflow**. |
| **WIOA grant access / relationships** | **High for Texas, non-transferable** | Relationship moat (founder-led) | Not in code. Dies with key-person risk. Must convert to **contracted ETPL + board licenses** quickly. |
| **Brand** | **Low today** | Generic nonprofit workforce | vs Guild ($4.4B), Handshake ($3.5B) — you're unknown nationally. Texas IT cert wedge can build **local** brand in 24mo. |
| **Compliance-as-product** | **High** | **Partial** | Audit log 3y, WIOA exports, outcomes methodology doc — strong foundation. Blocked by FORCE RLS + xAPI tenant gaps. |
| **Two-sided marketplace** | **High if achieved** | **Not started** (R4) | Would be strongest moat; currently aspirational. |
| **Multi-tenant white-label** | **Medium-high** | **Scaffold only** | `docs/WHITE-LABEL.md:8` — email branding done; member-facing rebrand incomplete. |

**Honest 24-month moat:** *"The only WIOA-ready workforce OS with verified placement loop + AI coach + board-grade reporting in Texas."* That's achievable. *"National workforce OS beating Guild"* — not with current focus.

---

## 6. Top 3 things to do this week (impact × effort)

Ranked for a founding team with limited counselor bandwidth and state approval pending.

### #1 — Run FORCE RLS staging rehearsal + close xAPI tenant gap (Impact: ★★★★★ / Effort: ★★★☆☆)

**Why:** `PLAN-2026-Q3.md` §0 calls multi-tenancy the biggest pre-ad risk. xAPI tables still nullable (`lib/xapi/mappings.ts:55,107`). FORCE RLS flip without rehearsal breaks admin paths (`lib/auth/server.ts:106-111` documents the fix but prod flip isn't done).

**Do this week:**
1. Execute `docs/runbooks/force-rls-staging-rehearsal.md` end-to-end.
2. Ship migration: `organization_id NOT NULL` + backfill on xAPI tables.
3. Block ad spend in writing until green.

**Outcome:** You can tell TWC "we're tenant-safe" — required for licensing story.

---

### #2 — Reconcile public "850+ placed" claims with live outcomes before any ad dollar (Impact: ★★★★★ / Effort: ★★☆☆☆)

**Why:** `docs/OUTCOMES-METHODOLOGY.md:17` vs `marketing/google-ads/2026-launch/ads.csv:2` and `PaidApplyVariant.tsx:23`. One auditor screenshot ends the nonprofit.

**Do this week:**
1. Pull `/admin/outcomes` placement count (`getBoardSnapshot()` per methodology doc).
2. Replace hardcoded **850+** with dynamic `loadEmployerLandingTrustMetrics()` / `getPublicImpactStats()` or remove until N≥10 with suppression rules.
3. Fix ad copy to match `docs/DAILY-OPERATING-PLAN.md:117-121` ("no-cost for qualifying members").

**Outcome:** Trust-safe acquisition creative; legal won't block launch.

---

### #3 — Persist public WIOA screenings + pick one monetization LOI (Impact: ★★★★☆ / Effort: ★★☆☆☆)

**Why:** `app/api/public/wioa-qualification/route.ts:51-66` still email-only — plan flagged this 3 days ago, still open. TWC partners will ask for screening volume proof.

**Do this week:**
1. Add `PublicWioaScreening` persistence (plan §1.2 fix) — email becomes notification only.
2. Parallel: get **one** signed LOI — either AAUL for board SaaS pilot **or** one Austin employer for pipeline subscription (not contingent placement). `PLAN-2026-Q3.md` §8.508 says get 3 employer LOIs before G3; start with 1 this week.

**Outcome:** Compliance artifact for approval meetings + first revenue hypothesis tested.

---

## Appendix A — Plan vs master: material discrepancies (file:line)

Items where `PLAN-2026-Q3.md` (authored 2026-05-18) **still disagrees** with master, or where **master fixed** plan items (plan is stale — update plan).

### Still open (plan correct, code lagging)

| Plan reference | Claim | Master state |
|----------------|-------|--------------|
| §1.1 P0 | xAPI `organization_id NOT NULL` | `lib/xapi/mappings.ts:55,107` — nullable |
| §1.2 P1 | Persist public WIOA screenings | `app/api/public/wioa-qualification/route.ts:51-66` — email only |
| §2.2 R3 | Coursera completion engine | No kickoff/nudge emails; no `course_launched` events |
| §2.2 R4 | Job placement marketplace v2 | Not implemented |
| §1.3 P3 | `hasCompletedInterviewPractice` | `lib/member/getMemberState.ts:282,318` — hardcoded `false` |
| §2.1 G4 | `/partners` live with real stats | `app/partners/page.tsx:11-14` — placeholder stats/logos TODO |
| §6 pre-launch | Phone 9–5 CT support | Not verifiable in codebase |

### Fixed since plan (update plan doc)

| Plan reference | Was broken | Now on master |
|----------------|------------|---------------|
| §0 | `/partners` redirects to `/` | `app/partners/page.tsx` exists |
| §1.1 P0 | `orgId` always null in GUC | `lib/auth/server.ts:106-118` resolves org |
| §1.1 P0 | Dead `agent_tasks` | Deleted (`d32e1e2e5`) |
| §1.2 P1 | No login telemetry | `LoginForm.tsx:364-434` `member_login` funnel |
| §1.2 P1 | No UTM capture | `lib/marketing/utmCapture.ts`, signup routes |
| §1.1 P0 | Mobile hero CTA below fold | `app/page.tsx:175-187` mobile primary pill |
| §1.2 P1 | `safe-migrate.cjs` silent resolve | `scripts/safe-migrate.cjs:141-155` fail-loud |
| §1.2 P1 | Audit retention 90d | `lib/retention/config.ts:66` → 3y |
| §1.2 P1 | Placement PATCH unvalidated | `app/api/admin/placements/route.ts:86-93` zod schema |
| §1.2 P1 | Placement survey re-submit | `app/api/placement-survey/route.ts:44-46` 409 if completed |
| §2.2 R2 | AI coach memory | `lib/ai/aiCoachContext.ts`; commit `2478edb15` |
| §1.3 P2 | Privacy missing sub-processors | `app/privacy/page.tsx:46-85` |
| §7 #1 | ESLint gate off | `next.config.ts:37` `ignoreDuringBuilds: false` |

### Vision doc vs code (intentional target state)

| Doc | Claim | Note |
|-----|-------|------|
| `docs/workforceap-product-vision.md:96-100` | 50–100 placements, 3–5 corporate partners | Doc disclaimer says target state — verify via `/admin/outcomes` before external use |

---

## Appendix B — Strategic one-liner for the team

**Stop being the everything-store for workforce. Be the Texas IT cert → job machine with board-grade receipts — then sell the receipts as SaaS.**

---

*Review branch: `review/ceo-strategic` · No product code changed.*
