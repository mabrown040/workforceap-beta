# Member lab workspace: implementation and browser evidence

The new member route turns a supplied practice brief into saved written work and an explicit request for human review. It uses the existing portal shell and the member's eligible lab assignment. The initial page shows the scenario, fictional materials, ordered steps, deliverable prompts, scoring descriptions, troubleshooting help, accessible alternatives, and concept references.

## Evidence and review behavior

- Saving writes a private draft. It does not share course notes, submit evidence, mark a course complete, or report attendance.
- Submission requires a response to every deliverable and an explicit sharing checkbox. The request includes the current draft revision and content version. The server returns the saved draft and its submitted snapshot.
- Typing that occurs while an earlier save or submission is pending stays in the editor. A failed request keeps the text available for retry. A conflict prevents another save until the member deliberately loads the latest saved state; replacement requires confirmation when local changes exist.
- Pending and reviewed submissions stay tied to their content version. A requested revision permits a new submission. A newer lab content version can begin even when an older version was reviewed; history keeps both versions visible.
- Recorded reviews display the reviewer, date, comments, and scores against the rubric saved with that submission. Later private edits do not change submitted text. External artifact files can change outside WorkforceAP, and the history states that limit.
- The page reports pending counselor assignment instead of promising a response time. Only explicitly submitted evidence is available to the assigned counselor and authorized program staff.

## Verification

Nine member-component tests pass. They exercise private save requests, explicit consent, concurrent typing during save and submit, failed-save retry, draft conflicts and intentional reload, immutable feedback, version-specific submission availability, unsafe links, and unsaved navigation. The five staff-component tests also pass after the review-collision fix; the preserved local feedback remains protected by the navigation guard.

The [member browser report](member-browser-verification.json) records actual requests from synthetic member2 against `network-diagnosis` on the isolated local database:

1. A real PUT saved the submitted private snapshot while a newer edit remained unsaved in the editor.
2. A second PUT and page reload restored the newest evidence and artifact link.
3. An intentionally intercepted503 retained text; a subsequent real PUT saved it.
4. No submission existed before consent. The explicit POST returned200 and created one submission that remained after reload.

The [visual report](visual-verification.json) covers member and recorded-review pages at375,768, and1440px in light and dark, plus the staff rubric form. Screenshots wait for the evidence field to enter the viewport after anchor navigation. No horizontal overflow or application JavaScript exceptions were observed. Third-party analytics requests were suppressed; no course provider, paid evaluator, or external notification was invoked by these checks.

Representative images: [member mobile](member-lab-mobile.png), [mobile evidence](member-evidence-mobile.png), [dark mobile evidence](member-evidence-dark-mobile.png), [staff rubric](staff-rubric-desktop.png), [mobile rubric](staff-rubric-mobile.png), [recorded review in dark mode](staff-review-dark-desktop.png).

## Instructional limits

These are original starter activities with supplied fictional evidence, not the complete58-hour lab curriculum. Their time estimates are planning aids, not validated attendance or verified instructional coverage. The interface labels instructional review as pending. A human review evaluates submitted written evidence; it does not establish live equipment proficiency or external certification readiness.

The remaining instructional work is to review and validate the briefs and rubrics, test accessible routes with learners, validate the time estimates, and develop the rest of the lab sequence with supervised practical work and an assessment plan.
