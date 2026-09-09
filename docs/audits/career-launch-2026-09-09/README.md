# WorkforceAP: a stronger learner journey

This delivery improves the actual member platform and the reliability of its reporting. The founder's public homepage remains byte-identical to production `a6327040`. It does not establish that WorkforceAP is the nation's best training provider or supply a newly authored 160-hour course.

## What changed

| Learner or staff problem | Result |
| --- | --- |
| Navigation dominates the work area and highlights multiple pages. | A narrower rail, a smaller course outline, one current destination, accessible secondary navigation, and a single-row header. At 1440px: 232px rail, 304px outline, 790px work area. |
| Practice and feedback are disconnected from assigned coursework. | Existing, correctly mapped Skill Missions appear in the course workspace. Server grading, stored results, feedback, and reviewable resume wording use the existing practice system. Practice is distinct from provider completion and credential verification. |
| A learner asks for help but loses the course context. | A server-validated, editable counselor request includes the course and optional saved project link. Private notes are excluded. Failed sends retain the draft. |
| Returning learners lose their destination during password recovery. | Login, signup, recovery mail links, retries, and return links preserve the safe course destination. Member deep links select the member portal. |
| Unsupported salary bands reappear inside application screens. | Application selection and review use program facts; occupational salary research has a separate contextual link. Sharing metadata now references an existing brand image. |
| Reporting implies stronger evidence than the data supports. | A 180-day retention count requires 180-day evidence. Completed training is labeled separately from credential records, and mixed review status is visible. Unsupported placement timelines are removed. |

## Evidence

- [Desktop workspace](sidebar-1440.png), [mobile](sidebar-375.png), [dark mode](sidebar-dark.png), [dimensions and browser errors](sidebar-browser-checks.json).
- [Navigation review and verification](sidebar-review.md).
- [Learning implementation, evidence boundaries, and content acceptance criteria](learning-usefulness.md).
- [Native practice browser verification](native-practice-verification.json), [counselor handoff verification](learning-handoff-verification.json), [course practice](course-practice-desktop.png), [mobile practice](course-practice-mobile.png).
- [Application, recovery, and brand audit](journey-and-brand.md).
- [Outcome corrections, data gaps, and official nonprofit benchmarks](outcomes-and-impact.md).

Verification uses synthetic local members and a disposable database, with normal Supabase SSR authentication against a local GoTrue fixture. No production member records were altered. No real applications, recovery emails, or counselor messages were sent. Live paid AI evaluation and hosted provider instruction are outside the completed local verification; their boundaries are identified in the learning audit.

## The next work that changes the quality of the program

1. **Author and review the 58-hour lab sequence.** Provide versioned briefs, practice environments or sample data, clear tasks, expected artifacts, accessible alternatives, rubrics, and instructor review. The current single outline entry is insufficient. The existing short Skill Missions do not fill those 58 hours.
2. **Make evidence review a complete workflow.** A submitted work sample needs an owner, review status, rubric decision, actionable feedback, revisions, and a learner-visible result. A message thread alone does not provide that workflow.
3. **Separate credential evidence states.** Member reports, issuer confirmation, and staff-reviewed proof must be distinct, including historical provenance. Preserve existing records through an explicit migration; adding a self-report must not automatically count as a verified credential.
4. **Track verified employment over time.** Reconcile employer hire records with member application tracking; record job episodes, verified start dates, baseline individual earnings, dated follow-ups, and missing responses. Use a consistent cohort denominator across reports.
5. **Build recognition from documented results.** Publish the first dated cohort report with definitions and response coverage, then consented learner stories and concrete employer participation. Strong claims require actual outcomes and reviewable evidence.

These are implementation and operating requirements. Content ownership, staff follow-through, provider access, consent, and actual member outcome data remain necessary. The detailed audits give source references and acceptance tests so the next delivery can be judged by working behavior rather than new page count.

## Release status

Final combined local checks passed: 2,281 Vitest tests across 268 suites; 1,436 Node tests with eight existing skips; TypeScript; and ESLint with zero errors and 28 existing unrelated warnings. Independent review verified assignment isolation, course matching, practice close protection, and failed-send draft retention. The homepage comparison, 68-page Astro build, and `git diff --check` also passed.

Changes remain on draft PR [#2243](https://github.com/mabrown040/workforceap-beta/pull/2243), where current build and deployment checks are recorded. Production has not been merged or deployed by this work. The repository's protected-product approval gate remains in place for My Program.
