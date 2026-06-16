# Monetization Spine 2026

**Status:** DRAFT — awaiting CEO sign-off  
**Date:** 2026-06-15  
**Replaces:** `docs/decisions/archive/2026-05-21-monetization-spine.md`

## Revenue Model (Primary → Secondary → Contingent)

### Primary: WIOA Board Outcomes Terminal — $2–5K/mo

- **Buyer:** Workforce Development Boards (WDBs), American Job Centers (AJCs), TANF agencies
- **Value prop:** Real-time placement and retention outcomes for every training dollar spent
- **Pricing:** $2K/mo for single county/board, $5K/mo for multi-county consortium
- **Wired:** Supabase + Next.js dashboard, already in `/admin/outcomes`
- **Sales motion:** Grant-funded, no procurement friction, 30-day pilot → annual

### Secondary: Employer Annual Pipeline Subscription — $15–50K/yr

- **Buyer:** Employers with 50+ annual hires (healthcare, logistics, light industrial)
- **Value prop:** Pre-qualified, job-ready candidate pipeline with verified skills
- **Pricing:** $15K/yr (small employer, <100 hires), $50K/yr (enterprise, 500+ hires)
- **Wired:** Stripe checkout already implemented, `/employer` portal live
- **Sales motion:** Self-serve + SDR outbound, 14-day trial → annual contract

### Contingent: Placement Fee — DEMOTED to footnote

- **Status:** Legacy, maintained for existing relationships only
- **New policy:** No new contingent LOIs after Sprint 3
- **Footnote location:** Bottom of `/employers` page, linked from pricing FAQ
- **Rationale:** Misaligned incentives, creates adverse selection, complicates forecasting

## Pricing Tiers Summary

| Tier | Buyer | Price | Motion | Status |
|---|---|---|---|---|
| WIOA Outcomes | WDBs/AJCs | $2–5K/mo | Grant-funded pilot | Ready for LOI |
| Employer Pipeline | SMB/Enterprise | $15–50K/yr | Self-serve + SDR | Live, needs GTM |
| Contingent Placement | Legacy only | 15–25% of salary | Sunset | No new deals |

## Sprint 3 Gating Decision

**Before Sprint 3 starts, Mike must confirm:**

1. [ ] WIOA outcomes pricing approved ($2–5K/mo range)
2. [ ] Employer pipeline subscription is primary GTM focus
3. [ ] Contingent placement demoted — no new LOIs
4. [ ] Launchpad Job Club partnership fits WIOA outcomes tier

## Buyer Positioning

### WIOA Board (Primary)
> "WorkforceAP turns your training spend into measurable job placements. Every participant tracked from enrollment to 90-day retention. $2K/mo for single-county deployment, pilot starts in 30 days."

### Employer (Secondary)
> "Stop posting jobs and hoping. WorkforceAP delivers pre-qualified candidates with verified skills, ready to work. $15K/yr for small teams, $50K/yr for enterprise volume. 14-day free trial."

### Legacy Contingent (Footnote only)
> "For existing partners only: contingent placement fee structure. No new contingent agreements being signed. Contact sales for pipeline subscription options."

## Launchpad Job Club Integration

- **Model:** WIOA outcomes terminal deployed per chapter
- **Pricing:** $2K/mo per chapter (Austin pilot)
- **Value:** Dad's chapter gets real-time outcomes dashboard for all members
- **Upside:** If Austin succeeds, template for 50+ chapters nationwide
- **Decision needed:** Does Launchpad fit WIOA tier or need custom pricing?

---

**CEO Sign-off:** _________________  
**Date:** _________________
