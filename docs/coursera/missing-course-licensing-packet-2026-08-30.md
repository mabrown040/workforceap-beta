# WorkforceAP Coursera missing-course licensing packet — 2026-08-30

Request: make the 11 exact approved `Course` objects below available in the
WorkforceAP Coursera organization catalog. Do not substitute content, edit an
existing learner path, or assign a learner seat as part of this request.

Current verified organization-catalog coverage is **15/26** approved provider
bindings. These 11 bindings are the complete gap from the full-pagination B4B
catalog validation recorded in
`approved-curriculum-api-validation-2026-08-30.md`.

| WorkforceAP program | Approved Coursera course | Coursera slug | Provider course ID |
| --- | --- | --- | --- |
| User Experience & Interface Design | Build Dynamic User Interfaces (UI) for Websites | `responsive-web-design-adobe-xd` | `YLwdQgp-Eeu0VAqNda9Xjw` |
| Database Administrator (DBA) | Introduction to Relational Databases (RDBMS) | `introduction-to-relational-databases` | `qNrWFjDlEeua-goM8-0Q8w` |
| Database Administrator (DBA) | Hands-on Introduction to Linux Commands and Shell Scripting | `hands-on-introduction-to-linux-commands-and-shell-scripting` | `B_rci897EeufchLeGgZGZQ` |
| Database Administrator (DBA) | ETL and Data Pipelines with Shell, Airflow and Kafka | `etl-and-data-pipelines-shell-airflow-kafka` | `gaD7sM97EeuHgw5SCcDQSQ` |
| Database Administrator (DBA) | Data Warehouse Fundamentals | `data-warehouse-fundamentals` | `xdMr0c97EeuHgw5SCcDQSQ` |
| Management Analyst & Business Intelligence | Project, Stakeholder, and Requirements Management Fundamentals | `project-stakeholder-and-requirements-management-fundamentals` | `ma9Rl54ZEfCkjBKc1V0Qpw` |
| Management Analyst & Business Intelligence | Business Strategy: Creating Competitive Advantage | `business-strategy-creating-competitive-advantage` | `RrWSGy5yEfGRiRLMJS1FiQ` |
| Management Analyst & Business Intelligence | Financial Analysis and Modeling | `financial-analysis-and-modeling` | `CGp8Nj4JEfGj6wr_-5C2xw` |
| Management Analyst & Business Intelligence | Data Visualization and Dashboards with Excel and Cognos | `data-visualization-dashboards-excel-cognos` | `NRRbf9zWEeqPZRKxGtAxBQ` |
| Management Analyst & Business Intelligence | Generative AI: Transform Your Management Consulting | `generative-ai-transform-your-management-consulting` | `xZqTjNaNEfC69hJmAzZJ9w` |
| Management Analyst & Business Intelligence | Capstone: Integrated Management Consulting Project | `capstone-integrated-management-consulting-project` | `0_J99TlPEfGP5A7qtRBM-w` |

## Acceptance evidence required

1. Confirm each exact provider ID is licensed to the WorkforceAP organization
   and remains type `Course` with the listed slug.
2. Re-run `pnpm coursera:validate-approved-catalog` with production B4B
   credentials and require **26/26**, with no duplicate ID, type mismatch, or
   slug drift.
3. Build three new learning paths and prove exact ordered membership separately;
   catalog availability alone does not validate a path.
4. Keep every `2026-approved-v2` manifest track `pending` and
   `assignmentMode: disabled` until the catalog and path proofs are recorded.

Owner action needed: Coursera organization administrator or account team adds
the licenses and returns confirmation for the exact provider IDs above.
