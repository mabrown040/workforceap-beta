# CEO Review — WorkforceAP Sprint Status (2026-06-14)

**Date:** 2026-06-14  
**Baseline:** `master` @ `80182b65` (PR #1716 merged)  
**Plan:** [`docs/PLAN-2026-Q3-Q4-10-SPRINT-V2.md`](./PLAN-2026-Q3-Q4-10-SPRINT-V2.md)  
**Review type:** Mid-Sprint 2 checkpoint + out-of-sequence marketing ship assessment  

---

## 1. Where We Are (Honest)

### Sprint 1 (May 21 → Jun 3) — Trust + screening + single-program landing

| Ticket | Status | Evidence |
|--------|--------|----------|
| Monetization spine decision doc | ❌ **Not started** | No `docs/decisions/monetization-spine-2026.md` |
| Dynamic trust metrics (remove hardcoded `850+`) | ⚠️ **Partial** | `lib/marketing/trustStripMetrics.ts` exists but `TRUST_STRIP_PLACEHOLDER_LINE` still present in some contexts |
| Persist WIOA screening | ✅ **Shipped** | `POST /api/public/wioa-qualification` persists to DB |
| Apply funnel P0s | ✅ **Shipped** | Inline validation, phone hint, password strength, ≥1 program on results — all in `master` |
| Single-program landing (`/programs/google-it-support`) | ❌ **Not started** | No dedicated program landing page; homepage is still multi-sector |
| Ad copy rewrite + $0 paid gate | ❌ **Not verified** | No evidence of ad pause or copy rewrite in repo |

**Sprint 1 verdict:** ~60% complete. The compliance-critical monetization spine is unsigned. The single-program landing (CEO wedge) is unbuilt.

### Sprint 2 (Jun 4 → Jun 17) — FORCE RLS + xAPI tenant hardening

| Ticket | Status | Evidence |
|--------|--------|----------|
| xAPI `organization_id NOT NULL` + backfill | ⚠️ **Partial** | `lib/xapi/mappings.ts:55,107` still nullable per audit |
| Layout GUC real `orgId` | ❌ **Not started** | `app/layout.tsx` passes `null` in some paths |
| `NULLIF(get_current_org_id(),'')` in SQL helpers | ❌ **Not started** | Audit items open |
| FORCE RLS prod flip checklist | ❌ **Not started** | Staging harness shipped (#1340), prod flip deferred |
| Expand verify-high-risk-tenant-routes to 30+ | ❌ **Not started** | Current coverage < 20 routes |
| xAPI audit wire-ins on destructive admin paths | ❌ **Not started** | `docs/audits/p1-audit-wireins-todo.md` high-priority list open |

**Sprint 2 verdict:** ~10% complete. This is the #0 audit standout. We are **not production-safe for tenant isolation**.

### Out-of-Sequence Ships (Sprint 7 work, shipped early)

| Feature | PR | Status | Risk Assessment |
|---------|-----|--------|-----------------|
| Career quiz with RIASEC scoring | #1709, #1711, #1712 | ✅ **Shipped** | Low risk — self-contained, no tenant data |
| Dynamic OG share cards | #1708 | ✅ **Shipped** | Low risk — public route, no auth |
| Share buttons (Wrapped story, Skill Checkpoint, certificate) | #1713 | ✅ **Shipped** | Low risk — public share, no tenant data |
| Achievement share buttons | #1713 | ✅ **Shipped** | Low risk |
| Admin career plan activation signals | #1716 | ✅ **Shipped** | Medium risk — admin-only, but adds admin surface area before RLS is hardened |
| Referral analytics + dependency pins | #1714 | ✅ **Shipped** | Low risk — analytics only |
| Accessibility loading states | #1715 | ✅ **Shipped** | Low risk |

**Marketing is ahead of compliance.** This is the classic startup trap the CEO review warned about. We have viral features live but the tenant isolation that protects member data is not production-ready.

---

## 2. The Gap

**Critical path:** Sprint 2 must complete before any of the following happen:
- Paid traffic scales (Sprint 1 gate: $0 paid until S2 green)
- Partner signups (Sprint 6)
- Employer LOI demos (Sprint 3)
- Any admin feature that touches cross-org data (Sprint 4+)

**Current risk:** Admin features (#1716 career plan signals, #1714 referral analytics) are shipping into a codebase where:
- xAPI `organization_id` is nullable
- Layout GUC passes `null` orgId
- FORCE RLS is not flipped in production
- High-risk tenant routes are not fully verified

**Mitigation:** These admin features are scoped to single-org views (admin sees their own org only), but the defense-in-depth is not yet in place.

---

## 3. Recommendations

### Immediate (this week)

1. **Sign the monetization spine** — `docs/decisions/monetization-spine-2026.md` must exist and be signed by Mike. Without this, employer pricing, partner revenue share, and SaaS licensing are all blocked.

2. **Complete Sprint 2 compliance work** — xAPI `organization_id NOT NULL`, layout GUC fix, NULLIF SQL helpers, FORCE RLS prod flip, route verification expansion. This is non-negotiable before Sprint 3.

3. **Build the single-program landing page** — `/programs/google-it-support` as the organic destination. This was Sprint 1's CEO wedge and it's still unbuilt. It's the highest-ROI public page we can ship.

### Next (Sprint 3, Jun 18 → Jul 1)

4. **Employer LOI motion** — With compliance hardened, turn the employer landing into signed pipeline interest. The Stripe subscription wiring is already in place.

5. **Outcomes dashboard** — Give funders a defensible view. This unblocks WIOA/EdVera approval.

### Deferred (do not start)

6. **Sprint 4+ retention work** — Day-7 retention, coach memory, Coursera nudges. These are important but not on the critical path.

7. **Sprint 5 completion engine** — Cert celebrations, points/badges. Deferred until completion signals are wired (Sprint 4 dependency).

8. **Sprint 6 partner channel** — B2B partner signup, CSV upload. Deferred until retention and completion tracks are live.

9. **Sprint 7 mobile parity + SEO** — We already shipped the viral features (OG cards, share buttons). The remaining mobile parity work (sub-16px copy, cookie clearance, footer overlap) is lower priority than compliance.

---

## 4. Kanban Actions

### New tasks to create

| Task | Assignee | Priority | Description |
|------|----------|----------|-------------|
| `ceo-monetization-spine` | Mike (Product) | P0 | Write + sign `docs/decisions/monetization-spine-2026.md` |
| `s2-xapi-organization-id` | developer | P0 | `organization_id NOT NULL` + backfill + ingest filter |
| `s2-layout-guc-orgid` | developer | P0 | `app/layout.tsx` passes real `orgId`, not `null` |
| `s2-nullif-sql-helpers` | developer | P0 | `NULLIF(get_current_org_id(),'')` in SQL helpers + policies |
| `s2-force-rls-prod-flip` | developer | P0 | Execute prod flip checklist from staging harness |
| `s2-verify-tenant-routes` | developer | P0 | Expand `verify-high-risk-tenant-routes.cjs` to 30+ routes |
| `s2-audit-wireins` | developer | P0 | Complete xAPI audit wire-ins on destructive admin paths |
| `s1-single-program-landing` | developer | P1 | Build `/programs/google-it-support` as organic destination |
| `s3-employer-loi` | developer | P1 | Employer activation: Stripe pipeline subscription CTA |
| `s3-outcomes-dashboard` | developer | P1 | `/admin/outcomes` with live counts + suppression rules |

### Existing tasks to close or re-scope

- All Sprint 4-8 tasks should be **paused** until Sprint 2 is green.
- The viral features (career quiz, share buttons) are **done** — no more marketing ships until compliance is complete.

---

## 5. Success Metrics (Revised)

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Apply step-1→account (organic) | ≥ 45% | Unknown | Needs analytics check |
| Ad spend | $0 | Unknown | Needs ops verification |
| Public placement claims dynamic | 100% | ~70% | Partial |
| Monetization spine signed | Yes | No | ❌ |
| FORCE RLS shadow test pass | 100% | Unknown | ❌ |
| Cross-org reads (staging pen test) | 0 | Unknown | ❌ |
| xAPI null `organization_id` | 0 | >0 | ❌ |
| Employer LOI or paid pilot | ≥ 1 | 0 | ❌ |
| Single-program landing live | Yes | No | ❌ |

---

## 6. One-Sentence Summary

**We shipped viral marketing features that users love, but the compliance foundation that protects their data and unlocks funding is not yet production-ready. Stop marketing ships, finish Sprint 2, sign the monetization spine, then resume growth.**

---

*Review author: Forge*  
*Next review: 2026-06-21 (end of Sprint 2)*
