# Career launch: evidence and public reporting review

Reviewed 2026-09-08 against production, official benchmark sites, and `a6327040` in the WorkforceAP repository. This is an editorial and source review, not an audit of private member records or an independent impact evaluation.

## What changed

`marketing/src/pages/impact.astro` replaces a static dashboard of blank metrics with a useful impact and transparency page. It distinguishes public reporting status from the number of members actually served, keeps established program facts, explains six questions to ask of an outcome report, and routes learners and funders to relevant next steps. It adds no completion, placement, earnings, or retention results and no new publication deadline or verification badge.

The previous static page asserted that no program cohorts or employer activity were recorded. Because that page did not read live records, it could not support those assertions. The replacement says that results are not published **on this page**. This does not establish zero activity or zero outcomes.

## Existing WorkforceAP facts and publication boundaries

- The [public homepage](https://www.workforceap.org/) and `marketing/AGENTS.md` support the approved claims: 501(c)(3) nonprofit, no cost for members who qualify through scholarship/grant funded membership, recognized credentials, and a real team reviewing applications with follow-up in 1–2 business days. These are organizational statements; this review did not independently verify nonprofit registration or service response times.
- The [program catalog](https://www.workforceap.org/programs) and [FAQ](https://www.workforceap.org/faq) describe training, time commitments, eligibility and support. Exact funding, exam coverage, equipment access, and start dates can vary. The new impact page does not create blanket promises about them.
- The [existing public impact page](https://www.workforceap.org/impact) showed unpublished metrics and no stories on that page. `/outcomes` redirected to the homepage. The static page was not evidence of real-time database state.
- The [salary guide](https://www.workforceap.org/salary-guide) previously labeled national ranges as early-career starting salaries and promoted their average midpoint. Its attribution to “Lightcast/BLS-style” data did not identify a reproducible table, occupation, geography, or percentile. It also asserted member wage growth without a linked cohort report. These require substantive source reconciliation, not a “verified” label. Salary-guide remediation is a separate part of the root implementation.

## Benchmark lessons from official sources

These illustrate useful practices, not proof WorkforceAP achieves the same results or a ranking of nonprofit providers.

| Provider and primary source | Useful practice | Application to WorkforceAP |
| --- | --- | --- |
| [Per Scholas: prospective learners](https://perscholas.org/about-per-scholas/launch-your-tech-career/) | Makes schedule, attendance, eligibility, commuting limits, equipment and cost details explicit; course information is location-specific. | Help people evaluate fit before investing time in an application. Do not equate online delivery with unrestricted availability. |
| [Year Up United: how it works](https://www.yearup.org/students/how-it-works) | Explains application steps, interview, decision and onboarding, and offers local info sessions. | Make the next action and required preparation concrete. |
| [Year Up United: PACE research](https://www.yearup.org/research/pace) | Separates research evidence from stories and describes comparison groups and long-term earnings follow-up. | Distinguish observed outcomes from causal impact; identify an evaluation design before claiming training caused a wage change. |
| [Merit America: how it works](https://meritamerica.org/how-it-works/) | Explains weekly time, coaching, phases and total cost/payment options. | Show the practical work and support behind a credential. |
| [Merit America: 2025 impact report](https://meritamerica.org/2025-impact-report/) | Gives results a dated, addressable report and distinguishes estimates in its reporting. | Publish a versioned report readers can inspect, once actual records are ready. |

These sites are not flawless templates: metric wording and counts can vary between pages. WorkforceAP should use a single approved source for any repeated claim rather than copy a competitor's headline numbers.

## What a future public outcome report needs

These are recommended evidence requirements, **not an adopted WorkforceAP reporting policy, measured results, or promised reporting schedule**.

1. **Cohort and denominator:** program, enrollment window, cutoff date, participants who started, withdrawals, exclusions, and duplicate-handling rules. Publish both counts and rates. Do not substitute applicant or portal-account counts for enrolled learners.
2. **Completion and credentials:** separate course completion from credential attainment; describe requirements, credential source and verification, and time to complete.
3. **Employment:** separate referrals, interviews, offers, accepted offers, and confirmed job starts. Specify field alignment, hours and job type, the denominator and the follow-up window. Do not turn a registered employer account or posted job into a verified hire.
4. **Wages:** use matched before-and-after records, with median wage and median within-person change, sample size, hours, hourly/annualized units, and collection dates. Do not subtract unrelated group medians and call that the median individual gain. Keep occupation-market estimates separate from member outcomes.
5. **Retention and missing data:** define continued employment versus same-employer retention, follow-up dates, response rate, and missingness. Missing outcomes remain unknown; show a denominator/coverage explanation and avoid silently dropping unreachable members.
6. **Provenance and review:** member report versus credential/employer documentation, reviewer, evidence date, corrections, report version and limitations. “Staff reviewed” and “independently evaluated” have different meanings. Administrative confirmation alone does not establish causal impact.
7. **Privacy and consent:** document consent for quotations and identifiable stories; confirm member approval of the final text and image. Use appropriate suppression or aggregation for small cohorts. Publish aggregate evidence without exposing private supporting documents.

## Named story provenance: unresolved, not proven fictional

`marketing/src/data/blog.ts:1` says its content was copied verbatim from `prisma/seed-blog.ts`. The article `from-warehouse-to-it-support-marcus-story` appears in both files with direct quotations, a five-month certification path, first-attempt exam passes, a six-week hiring interval, and a 40% wage increase. The static article is marked published and dated 2026-03-10.

Neither copy contains a source interview, consent reference, employer confirmation, wage-record reference, or link to a reviewed testimonial record. `content/testimonials.ts` is empty and states that consented, staff-reviewed testimonials are published from `prisma.testimonial` with `status=PUBLISHED`. This review did not inspect private testimonial or placement records. A file comment calling seed content “truth-locked” does not substantiate a named person's experience.

Before treating this article as verified proof, staff should locate the original account and consent, confirm identity, validate the quoted language, training/exam dates, job start and paired wages, and confirm permission for any image. If substantiation is unavailable, the publication status should be reviewed by the content owner. No named story was deleted or edited in this bounded change.

A separate demo fixture includes a Marcus Bell in cybersecurity. Name overlap does not establish that the article describes that demo learner and is not evidence of fabrication.

The new impact page carefully says no member stories are published **on that page**. It does not claim that the whole site contains no stories or that all sitewide claims have been verified.

## Design and validation

Applied the repository's UI/UX Pro Max query and design-review guidance. Its suggested webinar layout and palette were irrelevant to this task; the implementation retains `blend.css` brand tokens, fonts, shared Layout, buttons and section primitives. `marketing/AGENTS.md` refers to component-kit files that are absent in this checkout, so the page uses the actual existing shell and primitives.

Focused validation: `git diff --check` passes. Astro dev compiled `/impact` and returned HTTP 200. Browser checks at 375, 768, and 1440 pixels found no horizontal overflow; the page has one H1 and all six evidence questions. The “Know what to ask” anchor reaches the evidence section with 96 pixels of clearance. No browser errors or broken images were reported. Screenshots: `/tmp/workforceap-impact-mobile.png`, `/tmp/workforceap-impact-tablet.png`, `/tmp/workforceap-impact-desktop.png`, and `/tmp/workforceap-impact-evidence-desktop.png`. Root handles the shared production build. No tests of private outcome data, contact delivery, or enrollment were performed as part of this page change.
