# Monetization Spine Decision — WorkforceAP 2026

**Status:** DRAFT — awaiting Mike sign-off  
**Date:** 2026-06-15  
**Author:** Forge (CEO Review 2026-06-14)  
**Stakeholders:** Mike (Product), Engineering, Board

---

## 1. Problem

WorkforceAP has shipped viral features (career quiz, share buttons, OG cards) but has no signed monetization model. Without this:
- Employer pricing is blocked
- Partner revenue share is undefined
- SaaS licensing cannot be sold
- WIOA/EdVera funding applications lack revenue projections

## 2. Options Considered

### Option A: Pure Nonprofit (Grants + Donations)
- **Revenue:** Government grants, foundation funding, individual donations
- **Pros:** Mission-aligned, no sales overhead, tax-exempt status
- **Cons:** Unpredictable cash flow, dependency on funders, no growth capital
- **Verdict:** ❌ Rejected — insufficient for scaling to 10K+ members

### Option B: Employer-Funded (B2B SaaS)
- **Revenue:** Employers pay per-placement or subscription for access to trained candidates
- **Pros:** Scalable, aligns with employer demand, defensible revenue
- **Cons:** Requires sales team, longer sales cycle, chicken-and-egg problem
- **Verdict:** ✅ **Primary model** — see §3

### Option C: Member-Paid (B2C)
- **Revenue:** Members pay for premium features, certification exams, or career coaching
- **Pros:** Direct revenue, low friction, immediate cash flow
- **Cons:** Conflicts with "no cost" mission, creates equity issues, low LTV
- **Verdict:** ❌ Rejected — conflicts with core mission

### Option D: Hybrid (B2B + Grants + B2C Premium)
- **Revenue:** Employer subscriptions + grant funding + optional member upsells
- **Pros:** Diversified, resilient, mission-compatible
- **Cons:** Complex to operate, requires multiple teams
- **Verdict:** ✅ **Secondary model** — see §4

## 3. Primary Model: Employer-Funded SaaS

### 3.1 Pricing Tiers

| Tier | Price | Features | Target |
|------|-------|----------|--------|
| **Starter** | $499/mo | Job posting, candidate search, basic analytics | SMBs (<50 employees) |
| **Growth** | $1,499/mo | Priority placement, dedicated account manager, API access | Mid-market (50-500) |
| **Enterprise** | Custom | White-label portal, custom integrations, SLA | Large employers (500+) |

### 3.2 Revenue Share with Partners

- Training partners (Coursera, Google, IBM): 0% — content is free/open
- Placement partners (staffing agencies): 15% of first-year salary for successful placement
- WIOA providers: 10% of grant funding for member acquisition

### 3.3 Key Metrics

- **Target:** 50 paying employers by end of 2026
- **Revenue target:** $500K ARR by end of 2026
- **CAC:** $2,000 per employer (sales + marketing)
- **LTV:** $18,000 per employer (3-year retention)
- **LTV:CAC ratio:** 9:1

## 4. Secondary Model: Hybrid Revenue Stack

### 4.1 Grant Funding (30% of revenue)
- WIOA Title I: $150K/year for member training
- DOL TechHire: $100K/year for tech placement
- Foundation grants: $50K/year for general operations

### 4.2 Optional Member Upsells (10% of revenue)
- **Career coaching:** $49/session (optional, not required for core services)
- **Certification exam fees:** Pass-through cost (no markup)
- **Resume review:** $29 (optional)

### 4.3 Employer Revenue (60% of revenue)
- SaaS subscriptions: $300K/year target
- Placement fees: $100K/year target
- Training partnerships: $50K/year target

## 5. Implementation Timeline

| Phase | Date | Deliverable |
|-------|------|-------------|
| **P0** | Jun 2026 | Sign this decision doc, build employer LOI flow |
| **P1** | Jul 2026 | Launch employer pricing page, Stripe billing |
| **P2** | Aug 2026 | First 5 paying employers, case studies |
| **P3** | Sep 2026 | Scale to 20 employers, hire sales lead |
| **P4** | Q4 2026 | 50 employers, $500K ARR, Series A pitch |

## 6. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Employers unwilling to pay | Medium | High | Free pilot program, outcomes-based pricing |
| Mission drift | Low | High | Board oversight, 80% free member requirement |
| Sales cycle too long | High | Medium | Self-serve signup, product-led growth |
| Grant funding cuts | Medium | Medium | Diversify to 3+ grant sources |

## 7. Decision

**Recommended:** Option D (Hybrid) with Option B (Employer SaaS) as the primary growth engine.

**Required actions:**
1. Mike signs this document
2. Build employer LOI flow (Stripe subscription) — in progress (#1727)
3. Create employer pricing page
4. Hire sales lead by Aug 2026
5. Board approval for revenue targets

---

**Signature:** _________________  
**Date:** _________________  
**Name:** Mike Brown, CEO

---

*This document is a living decision record. Revisit quarterly.*
