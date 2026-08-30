# Approved Coursera curriculum API validation — 2026-08-30

Status: **blocked for external-track activation**. Portal mappings are safe to
deploy dormant; do not assign `2026-approved-v2` yet.

The production WorkforceAP Coursera B4B credentials were used read-only to
compare the immutable approved manifest with the organization-wide Coursera
content catalog. The validator drained the provider pagination contract and
returned one complete page containing 175 organization contents. No learner,
seat, program, learning path, credential, or environment value was changed.

Command:

```powershell
pnpm coursera:validate-approved-catalog
```

## Result

| Program | Approved provider courses | Exact API matches | Missing from org catalog |
| --- | ---: | ---: | ---: |
| User Experience & Interface Design | 7 | 6 | 1 |
| Database Administrator (DBA) | 9 | 5 | 4 |
| Management Analyst & Business Intelligence | 10 | 4 | 6 |
| **Total** | **26** | **15** | **11** |

All 15 returned bindings matched the expected opaque provider ID, Coursera
slug, and `Course` type. The API returned no duplicate IDs, wrong content
types, or slug drift among those matches. The 11 missing bindings remain
missing after the full-pagination refresh; this is no longer a first-page
artifact.

## Missing approved bindings

### User Experience & Interface Design

- `responsive-web-design-adobe-xd` — `YLwdQgp-Eeu0VAqNda9Xjw`

### Database Administrator (DBA)

- `introduction-to-relational-databases` — `qNrWFjDlEeua-goM8-0Q8w`
- `hands-on-introduction-to-linux-commands-and-shell-scripting` — `B_rci897EeufchLeGgZGZQ`
- `etl-and-data-pipelines-shell-airflow-kafka` — `gaD7sM97EeuHgw5SCcDQSQ`
- `data-warehouse-fundamentals` — `xdMr0c97EeuHgw5SCcDQSQ`

### Management Analyst & Business Intelligence

- `project-stakeholder-and-requirements-management-fundamentals` — `ma9Rl54ZEfCkjBKc1V0Qpw`
- `business-strategy-creating-competitive-advantage` — `RrWSGy5yEfGRiRLMJS1FiQ`
- `financial-analysis-and-modeling` — `CGp8Nj4JEfGj6wr_-5C2xw`
- `data-visualization-dashboards-excel-cognos` — `NRRbf9zWEeqPZRKxGtAxBQ`
- `generative-ai-transform-your-management-consulting` — `xZqTjNaNEfC69hJmAzZJ9w`
- `capstone-integrated-management-consulting-project` — `0_J99TlPEfGP5A7qtRBM-w`

## Required next proof

1. Add/license the 11 missing courses in the WorkforceAP Coursera organization,
   or replace a binding only after the approved syllabus owner confirms the
   substitution.
2. Re-run the catalog validator until all 26 bindings pass.
3. Build three new learning paths without editing the current learner paths.
4. Validate each path's exact set and order. The organization catalog API proves
   course availability; it does not by itself prove learning-path membership.
5. Make Skill Missions and pathway-step completion curriculum-version-aware.
   Both currently consume static legacy course lists and therefore remain
   explicit canary blockers even after the provider catalog reaches 26/26.
6. Only then set each manifest track to `validated`, record its collection ID,
   set `assignmentMode: canary`, and run one explicitly authorized v2 canary.
   Broad enrollment remains closed until every proof passes and the mode is
   deliberately changed to `enabled`.
