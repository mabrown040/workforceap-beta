# WorkforceAP — Multi-State Compliance Architecture
_Created: 2026-03-27_

## Overview
Platform must dynamically adjust per member/partner geography across 3 compliance layers:
- **Layer 1:** Federal (WIOA baseline — consistent rules)
- **Layer 2:** State (provider approval, funding caps, eligible credentials)
- **Layer 3:** County/Region (workforce board priorities, ETPL lists)

---

## Nonprofit Exempt Cert — 50-State Classification

| Category | States | Requirements |
|----------|--------|--------------|
| **Fully exempt** (~12 states) | TX, AZ, CO, IN, TN, VA + others | IRS 501(c)(3) + ETPL registration only |
| **State exemption cert required** (~18 states) | FL, GA, NC, OH, PA + others | State-level exempt cert + ETPL + sometimes accreditation |
| **Licensed postsecondary required** (~15 states) | CA, NY, IL, WA, MA + others | Must be licensed postsecondary institution OR partner with one |
| **Remote-specific rules** (~20 states) | Varies | Separate approval for distance/online delivery |
| **No ETPL / block grant model** (~5 states) | Varies | Different funding model entirely |

### Hard States Notes
- **California:** BPPE license required (multi-month, expensive)
- **New York:** BPSS registration required
- **Washington, Massachusetts, Illinois:** Similar postsecondary licensure requirements
- **Strategy for hard states:** Partner with licensed in-state org (community college or nonprofit), split grant funding

---

## DB Schema — State Compliance Matrix

```json
{
  "state": "FL",
  "region": "Central Florida",
  "etpl_board": "CareerSource Central Florida",
  "provider_requirements": {
    "nonprofit_exempt": true,
    "state_cert_required": true,
    "remote_delivery_allowed": true,
    "remote_requires_separate_approval": true
  },
  "eligible_credentials": ["CompTIA A+", "AWS Cloud Practitioner"],
  "funding_per_trainee_max": 5000,
  "funding_model": "WIOA_ETPL",
  "reporting_requirements": ["90_day_placement", "wage_at_placement"],
  "workforceap_status": "not_registered"
}
```

### Platform Features Driven by This Data
1. **Course/Program Eligibility Engine** — Shows only fundable courses per region
2. **Partner Onboarding Compliance Gate** — State X partner sees only approved programs
3. **Remote Delivery Flag** — Per-state, per-course toggle
4. **Admin Compliance Dashboard** — Track registration status per state

---

## Build Sequence

### Phase 1 (Now — Texas locked)
- Build compliance matrix schema in DB
- Populate Texas fully
- Add `state_eligibility` field to courses/programs table

### Phase 2 (Next 90 days — Easy states)
- FL, GA, NC, AZ, CO, TN, VA
- Build partner onboarding state gate
- Add compliance status dashboard for admin

### Phase 3 (6-12 months — Hard states)
- CA, NY, IL — requires licensed partner OR separate licensure track
- Partner model: licensed org holds license, WorkforceAP delivers, split grant

---

## Revenue Potential per State (WIOA Model)

| Scale | Per Trainee | 50 members | 200 members |
|-------|-------------|------------|-------------|
| Texas | $7,500 | $375,000 | $1,500,000 |
| Florida | ~$5,000 | $250,000 | $1,000,000 |
| Multi-state (5 boards) | varies | — | $5M+ potential |

---

_See companion file: `artifacts/state-by-state-compliance-research.md` for full 50-state data_
