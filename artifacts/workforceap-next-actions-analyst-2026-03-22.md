Decision-grade next actions (concise)

Immediate (owner, ETA)

1) Canonical key mapping and merged core CSV
- Owner: Analyst / Data engineer
- ETA: 1 business day
- Outcome: Single merged CSV with normalized student_key, enrollment, assessments, completions, placements.
- Why: Foundation for all KPIs and removes ambiguity causing false signals.

2) Compute cohort completion deltas and alert
- Owner: Analyst
- ETA: 1 business day
- Outcome: Table of last 6 cohorts with completion rate, delta vs prior, and flag for >5% drop.
- Why: Validates severity and scope of the observed drop.

3) Placement-time sample analysis by pathway
- Owner: Ops + Analyst
- ETA: 2 business days
- Outcome: Median and IQR time-to-placement for Employer Partnerships vs Self-Service; list of outlier cases for follow-up.
- Why: Tests hypothesis that employer pathways materially shorten placement.

Short-term (7–30 days)

4) M3 root-cause analysis and remediation plan
- Owner: Curriculum lead
- ETA: 2–4 weeks for A/B rollout
- Outcome: Item-level analysis, proposed assessment changes, additional micro-lessons, pilot in next cohort.
- Why: High expected ROI on completion rates.

5) Employer feedback & retention instrumentation
- Owner: Product + Ops
- ETA: 3–4 weeks to deploy automated check and feedback form
- Outcome: >70% feedback capture target; 90-day retention metric enabled.
- Why: Closes loop on match quality, informs employer partnerships.

6) Contact enrichment re-run and process hardening
- Owner: Outreach + Data engineering
- ETA: 2–4 weeks
- Outcome: Re-enriched contact records for historical cohorts; verification step at enrollment; routing low-contact students to human outreach.
- Why: Reduces churn correlated with missing contacts.

Longer-term (30–90 days)

7) KPI dashboard and monthly review cadence
- Owner: Analytics + Product
- ETA: 4–8 weeks
- Outcome: Dashboard with top KPIs (completion, time-to-placement, module reattempt, retention) and monthly review process.
- Why: Operationalizes monitoring and decision-making.

8) A/B test employer-sourced hires vs self-service with streamlined supports
- Owner: Partnerships + Ops
- ETA: 6–10 weeks
- Outcome: Controlled experiment to quantify lift from employer partnerships and refined routing logic.
- Why: Data-driven investment decision for scaling partnerships.

Blocking issues & requests for data owners

- Provide path to canonical identity mapping files (likely under C:\Users\mabro\Downloads\historical-student-data\raw\identity\). If not present, provide DB export of student identity table.
- Provide full placement logs with pathway_tag and employer_id fields (CSV/JSON export).
- Provide enrichment pipeline logs (date-stamped) to isolate process-change date.
- Provide raw assessment logs for Module M3 (attempt_id, item_id, student_key, score, timestamp).

Confidence & final note

- Overall confidence in the prioritized findings: moderate-to-high (range 0.65–0.85) given cross-file corroboration but limited by identifier inconsistency and sparse feedback.
- Next actions prioritized to remove key data friction (canonical key mapping) before deeper causal claims or product changes.

— Prism (Analyst)
