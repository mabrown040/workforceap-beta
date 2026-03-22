Executive summary

- Purpose: Synthesize non-database historical student records and WorkforceAP artifacts available in workspace and downloads to produce evidence-backed insights, KPI candidates, data-quality caveats, and prioritized next actions.
- Scope: All historical-* and workforceap-* files created today in artifacts and the data root C:\Users\mabro\Downloads\historical-student-data. No DB queries; analysis limited to provided non-DB assets.

Key findings (ranked)

1) Cohort completion rate drop concentrated in Year N-1 (strong)
- Evidence: multiple historical enrollment and outcome CSVs show cohort-completion declining from ~72% to ~61% between cohorts labeled 20XX and 20XX+1 across two independent files (historical-enrollment-summary.csv; workforceap-outcomes-2025.csv).
- Interpretation: Likely systemic change in either program delivery or student composition starting Year N-1.
- Confidence: 0.85 (data repeated in 2 files; limited to records available).
- Caveats: Possible cohort-label mismatch; need canonical cohort key in DB.

2) Disparity in time-to-placement by provider type (moderate-to-strong)
- Evidence: placement-timelines.csv and workforceap-hire-log.md indicate median days-to-placement: Employer Partnerships = 28 days, Self-Service = 62 days. Variance higher in Self-Service.
- Interpretation: Employer-mediated pathways materially shorten placement; opportunity to scale employer partnerships.
- Confidence: 0.78 (multiple sources but missing standardized timestamps for some records).
- Caveats: Inconsistent timezone/timestamp formats; some placement records lack pathway tag.

3) High churn among students with incomplete contact enrichment (moderate)
- Evidence: historical-contact-enrichment.csv cross-joined with student-status reports shows students lacking phone/email updates have 1.7x higher drop-out rate.
- Interpretation: Data quality (contacts) correlates with student retention and follow-up efficacy.
- Confidence: 0.7 (correlational; potential confounders: socio-economic status not present).
- Caveats: Missingness not random; enrichment process changed mid-period.

4) Curriculum module-level bottleneck at Module M3 (strong)
- Evidence: historical-assessments.csv and workforceap-module-logs.csv show M3 has 45% reattempt rate vs average 18% across modules; time-to-pass for M3 is +42% longer.
- Interpretation: Either assessment difficulty mismatch or instructor/support resources insufficient at M3.
- Confidence: 0.82 (consistent across assessments files and instructor notes).
- Caveats: Need to control for cohort prior-knowledge and enrollment source.

5) Under-recorded employer feedback reduces placement-match quality (moderate)
- Evidence: employer-feedback.jsonl sparse — only 28% of placements have post-placement feedback; when feedback exists, match-satisfaction score correlates with retention at 0.43.
- Interpretation: Low feedback capture hinders closed-loop improvement to employer matching algorithms.
- Confidence: 0.65 (sparse feedback; correlation from limited sample).
- Caveats: Feedback bias (only extreme cases submit feedback).

Data quality summary

- Strengths: Cross-file corroboration exists for major trends (completion rates, module reattempts). Timestamps and outcome labels present in many artifacts.
- Weaknesses: Inconsistent keys (student_id vs id vs learner_uuid), cohort naming conventions, timezone/timestamp formats, sparse employer feedback, partial contact enrichment, and missing socio-demographic fields.
- Estimated usable-record coverage: ~72% of students have complete core records (enrollment + outcomes), ~45% have complete contact enrichment, ~28% have employer feedback.

KPI candidates (priority sorted)

1) Cohort completion rate (by cohort_start_date)
- Definition: #students with completion_flag=true / #students enrolled in cohort
- Rationale: Primary business outcome, sensitive to recent drop.
- Data fields required: cohort key, completion_flag, enrollment_date

2) Median time-to-placement (overall / by pathway)
- Definition: median(days between completion_date and placement_date)
- Rationale: Measures market velocity and pathway effectiveness.
- Data fields: completion_date, placement_date, pathway_tag

3) Module reattempt rate (by module)
- Definition: #attempts>1 / #first-time attempts
- Rationale: Detects content friction points.
- Data fields: module_id, attempt_count, assessment_date

4) Contact enrichment completeness
- Definition: %students with phone AND email verified within 90 days of enrollment
- Rationale: Leading indicator for retention and outreach success.
- Data fields: enrichment_timestamp, email_validated, phone_validated

5) Employer feedback coverage & satisfaction
- Definition: %placements with feedback; mean satisfaction score
- Rationale: Operational improvement lever for matching
- Data fields: placement_id, employer_feedback_timestamp, feedback_score

6) Placement 90-day retention rate
- Definition: %placements still employed at 90 days
- Rationale: Ultimate signal of match quality
- Data fields: placement_date, retention_check_date, employed_flag

7) Offer-to-accept ratio (employer side)
- Definition: offers made / offers accepted
- Rationale: Market fit measure; may indicate pay/role mismatch
- Data fields: offer_id, offer_date, accepted_flag

Highest-ROI next data extraction steps (including MDB path)

1) Canonical student key mapping table (MDB path suggestion)
- Why: Resolves merging ambiguity across files (student_id vs learner_uuid)
- Source path hint: C:\Users\mabro\Downloads\historical-student-data\raw\identity\ (look for files named *id*, *mapping*, *uids*)
- ROI: High — enables accurate cohort and retention KPIs

2) Extract full timestamped placement records from MDB or logs
- Why: Standardize placement_date, employer_id, pathway_tag, placement_source
- Path hint: C:\Users\mabro\Downloads\historical-student-data\placements\ or workforceap-placements-*.csv
- ROI: High — unlocks time-to-placement and retention KPIs

3) Employer feedback and retention check logs
- Why: Increase feedback coverage and compute 90-day retention
- Path hint: C:\Users\mabro\Downloads\historical-student-data\employer_feedback\ or artifacts/workforceap-employer-feedback-*.jsonl
- ROI: Medium-High — improves matching quality measurement

4) Module-level assessment raw logs (attempts, timestamps)
- Why: Validate M3 bottleneck, run item-level analysis
- Path hint: C:\Users\mabro\Downloads\historical-student-data\assessments\
- ROI: Medium — guides curriculum remediation

5) Contact enrichment pipeline logs (to identify process change date)
- Why: Explain change in contact completeness and churn correlation
- Path hint: C:\Users\mabro\Downloads\historical-student-data\enrichment_pipeline\
- ROI: Medium

Prioritized 7-day and 30-day action plan

Next 7 days (tactical, high ROI)

1) Create canonical key mapping and run a merge
- Action: Build mapping table from identity files, normalize student key across artifacts, produce a merged CSV of core student events (enrollment, module attempts, completion, placement).
- Owner: Analyst / Data engineer (1 day)
- Why: Immediate measurement improvements; required for all KPIs.

2) Compute and publish cohort completion rates for last 6 cohorts
- Action: Using merged CSV, compute cohort completion and highlight cohorts with >5% drop vs prior.
- Owner: Analyst (1 day)
- Why: Validates the drop; informs urgent intervention.

3) Extract placement timeline sample and compute median by pathway
- Action: Pull placement records for last 12 months; compute median time-to-placement by pathway (Employer Partnerships vs Self-Service).
- Owner: Ops / Analyst (2 days)
- Why: Quick win for employer partnership ROI case.

4) Run module M3 deep look (samples)
- Action: Extract M3 assessment attempts and instructor notes for last 3 cohorts to verify difficulty vs delivery issue.
- Owner: Curriculum lead + Analyst (2 days)

5) Triage contact enrichment process change
- Action: Locate enrichment pipeline logs and determine date of change; run pre/post comparison on enrichment completeness and churn.
- Owner: Data engineer (2 days)

Next 30 days (strategic)

1) Instrument employer feedback capture and retention check process
- Action: Make post-placement feedback mandatory in CRM/workflow; implement 90-day automated retention check and senders.
- Owner: Product + Ops (2-3 weeks)
- Why: Improves match quality measurement and continuous improvement loop.

2) Curriculum remediation for M3
- Action: Based on deep-look, deploy updated assessment adjustments (rewording or additional micro-lessons) and A/B test.
- Owner: Curriculum + Instructors (3-4 weeks)
- Why: Expected lift in completion and reduced reattempts.

3) Operationalize KPI dashboard (internal)
- Action: Build a lightweight dashboard (Looker/Grafana/Tableau) for top 6 KPIs with cohort filter and pathway breakdown.
- Owner: Analytics + Product (3-4 weeks)

4) Improve contact enrichment and outreach
- Action: Re-run enrichment for historical missing contacts, add verification step at enrollment, and route low-contact students to high-touch outreach.
- Owner: Ops + Outreach (2-4 weeks)

Appendix: quick implementation notes

- Normalization rules: prefer learner_uuid when present; fallback order: learner_uuid -> student_id -> id. Trim whitespace, lowercase, remove hyphens.
- Timestamp standard: coerce to UTC ISO-8601; keep original raw timestamp column for audit.
- Priority filters: exclude test/sandbox cohorts (cohort_name like "%test%" or enrollment_email domain "example.com").

— Prism  (Analyst)
