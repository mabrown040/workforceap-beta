# Monetization Spine Decision

**Date:** 2026-05-21  
**Status:** Pending — Mike to decide this week  
**Trigger:** CEO Strategic Review §4 — "monetization spine decision — subscription vs contingent fee"  
**Sources:** `docs/reviews/ceo-strategic-review-2026-05-21.md`, `PLAN-2026-Q3.md` §8.511, `docs/MULTI-SPRINT-PLAN-2026-05-13.md`

---

## 1. Decision statement

> **Mike:** WAP will charge employers via **[ Stripe Pipeline Subscription monthly | Contingent placement fee | Hybrid ]**.

*Fill in the bracketed option and initial price point before external employer LOI outreach.*

---

## 2. Options analyzed

### A. Stripe Pipeline Subscription

Flat **$X/mo** for unlimited shortlist access to WAP-trained candidates (search, pipeline view, intro requests).

| Pros | Cons |
|------|------|
| Predictable recurring revenue; funds ad spend | Requires sustained candidate volume to justify renewal |
| Shorter sales cycle (procurement vs legal review of contingent terms) | LTV capped unless tiers upsell |
| **Already partially built** — Stripe webhooks + org `subscriptionStatus` exist | `/employers` hero still sells contingent placement, not subscription |
| Easier board narrative: "SaaS + outcomes" | SMB employers hiring 1–2/year may churn after first fill |

**Reference pricing band:** $299–999/mo (annual prepay discount) based on tiered access in existing employer onboarding.

---

### B. Contingent placement fee

**$Y per hire** (% of starting salary or flat fee; today `$2,500` default via `getEmployerPlacementFeeDisplay()`).

| Pros | Cons |
|------|------|
| Aligns incentives — employer pays only on success | 90–180 day cash cycle (contact → hire → invoice) |
| Familiar to HR buyers (staffing-agency mental model) | Proof-of-hire disputes; counselor verification cost |
| No upfront budget required from SMB | **No closed-loop Stripe billing** for hire events today |
| High headline ACV per placement | Low repeat rate; does not scale to 100 employers without outbound army |

---

### C. Hybrid

Small monthly platform fee **+** reduced per-placement success fee.

| Pros | Cons |
|------|------|
| Balances near-term cash (subscription) with outcome alignment (fee) | Complex billing, contracts, and sales pitch |
| Grandfathering path if spine shifts later | Two revenue lines to explain on `/employers` |
| Placement fee can upsell white-glove recruiting | Audit trail must tie subscription access to verified placements |

**Example:** $199/mo pipeline access + $1,500 per verified hire (vs $2,500 contingent-only).

---

## 3. Decision matrix

Scores: **1 = weak** · **3 = acceptable** · **5 = strong**

| Criterion | A. Subscription | B. Contingent fee | C. Hybrid |
|-----------|:-----------------:|:-----------------:|:---------:|
| **TTM revenue** (cash in ≤12 mo) | 4 | 2 | 3 |
| **Sales cycle length** (first $ collected) | 4 | 2 | 3 |
| **Scalability to 100 employers** | 4 | 2 | 3 |
| **Audit complexity** (WIOA / PIRL / placement proof) | 4 | 2 | 2 |
| **Member NPS impact** (employer pressure on members) | 4 | 3 | 3 |
| **Board defensibility** (recurring + mission-aligned) | 4 | 2 | 3 |
| **Weighted total** | **24** | **13** | **17** |

**Read:** Subscription wins on speed and scale; contingent fee wins only on buyer familiarity and zero upfront cost. Hybrid is a compromise that adds operational burden before product-market fit is proven.

**Note:** CEO review recommends **board/funder SaaS as the long-term revenue spine**; employer monetization is **bonus, not base** (`PLAN-2026-Q3.md` §8.511). This decision governs the **employer side only** — do not conflate with WIOA board licensing.

---

## 4. What's reversible

| Change | Reversibility | Notes |
|--------|---------------|-------|
| **Price points** ($X, $Y, tier names) | **High** | Adjust quarterly; grandfather existing LOIs for 90 days |
| **Hero copy on `/employers`** | **High** | Marketing-only; no schema change |
| **Stripe product / price IDs** | **Medium** | New prices in Stripe; migrate subscribers on renewal |
| **Billing structure** (sub-only vs contingent vs hybrid) | **Low** | Contract terms, sales collateral, and webhook logic diverge; switching mid-LOI erodes trust |
| **Legal terms** (contingent = staffing-adjacent?) | **Low** | HR/legal review cycles are expensive to repeat |

**Principle:** Decide the **spine** (how we charge) now; treat **numbers** as experiments.

---

## 5. Open questions for Mike

1. **Employer vs funder priority:** Is the first signed LOI an Austin employer (pipeline sub) or a WIOA board (SaaS)? CEO review says pick one — which closes faster in the next 30 days?

2. **Minimum viable candidate supply:** How many placement-ready IT Support candidates do we need live before an employer will pay $X/mo? What is the kill threshold if pipeline is thin?

3. **Contingent fee sunset:** If we choose A or C, do we remove "Pay only when you hire" from `/employers` immediately, or run dual messaging during a 90-day transition?

4. **Price anchor:** What is the target **first-year ACV per employer** — $3K, $6K, or $12K — and does that map to monthly sub, annual prepay, or hybrid?

5. **Proof-of-hire authority:** Who signs off on a billable placement (counselor, admin, member survey)? Contingent and hybrid require this before Stripe can invoice.

---

## 6. Recommended next step

**Ship Stripe pipeline-sub plumbing in Sprint 3 (per plan v2)** so Option A is executable without waiting on contingent hire-event billing:

1. Wire employer checkout → Stripe subscription → org `subscriptionStatus` gate on shortlist/pipeline features (scaffold exists; finish gating + `/employers` hero alignment).
2. Preserve **Option B as override** — env flag or per-org contract field for contingent-only LOIs until hire-event webhooks ship.
3. Parallel: pursue **one employer LOI** for pipeline subscription (not contingent placement) per CEO review §4 action item #3.

**Do not block on perfect pricing.** Default to a single tier ($499/mo or $4,800/yr prepay), learn from the first payer, iterate price in Q3.

---

*Owner: Mike · Eng track: Dench · Review again: 2026-06-01 or after first employer LOI signed.*
