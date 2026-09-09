# Member learning usefulness: implemented flow and remaining content work

The platform now connects assigned courses, saved work, existing skill practice, and a reviewable counselor request. It is not a newly authored 160-hour instructional program. In the pinned legacy IBM IT Support assignment, 102 estimated hours belong to nine course records and 58 hours belong to one lab/project/preparation outline item. Provider instruction, native practice, member notes, official completion, and reviewed mastery are different evidence types.

## What this change makes usable

- A member can open the existing Skill Mission from its exact assigned course, complete the existing server-graded quiz and written scenario flow, and see persisted coaching feedback and an accuracy-reviewable resume draft after grading. Existing assignment and completion checks remain authoritative.
- Only missions that resolve to actual courses in the member's immutable assignment appear in the workspace. For legacy IBM IT Support, seven missions qualify after correcting the explicit case-study alias. Each has three quiz questions and a 15-minute planning estimate. Answer keys remain on the server. This short practice does not supply or replace the 58-hour lab.
- Practice names use the actual assigned course title. Generic catalog nicknames such as “Code Architect” were misleading on a Networking course even though the scenario, questions, and skill labels matched networking correctly.
- “Ask for feedback on this course” passes only program, course, and curriculum identifiers. The server loads the authenticated member's assignment and saved artifact link. The member can edit the multiline message before explicitly sending. Private course notes are excluded.
- Native practice owns one focus trap and close guard. Escape, X, and backdrop require a discard confirmation for unfinished quiz/scenario work; an evaluation in flight stays mounted. Declining discard or receiving a grading failure retains the response. Successfully graded results close without a discard prompt.
- A failed send retains the draft for retry; a successful send clears only the submitted revision. Text typed while another send is pending survives. Invalid or stale course context leaves the ordinary inbox usable.

## Priority 1: turn the 58-hour lab block into instruction that can actually be followed

**Finding.** The pinned `it-support-professional-certificate-ibm-course-10` record has 58 estimated hours but no `lessons` or `topics`; its kind defaults to the provider path. The native-module resolver accepts only `kind: 'workforceap'`, so this legacy item does not resolve to an authored native lab. Where the generic native lab page is used by other assignments, it links to Missions, Resume, Interview Prep, and Messages and offers “Mark lab complete”; those links are not a sequenced lab brief.

**Sources:** [native module resolver](../../../lib/content/workforceApModule.ts), [native module page](../../../app/(portal)/dashboard/learning/modules/[courseSlug]/page.tsx), the frozen course list returned by `getProgramCoursesForCurriculumVersion(program, 'legacy-v1')`.

**Acceptance criteria:** an instructional owner approves a versioned set of lab briefs with prerequisites, safe practice environments or supplied sample data, step-by-step tasks, expected artifacts, troubleshooting guidance, accessible alternatives, assessment rubrics, and estimated time for each activity. The assigned block must point to those approved activities or to a verified provider lab. Sum estimates transparently; never convert page visits or saved notes into attended hours. Preserve existing curriculum assignments unless an explicit enrollment change is approved. Do not label an unreviewed draft “approved” or claim that renaming the outline delivers 58 hours of instruction.

## Priority 2: distinguish completion from demonstrated mastery

**Finding.** Native module completion reaches `/api/member/courses/complete`, then `completeMemberCourse` records completion. That path does not require the new workspace's notes, artifact, scored rubric, or instructor approval. Skill Missions separately grade three answers and an AI-reviewed written scenario. Their evaluation request contains a scenario response, not inspected project files or execution results. A passed practice is useful feedback; it is not verified real-world performance or an external credential.

**Sources:** [completion route](../../../app/api/member/courses/complete/route.ts), [completion service](../../../lib/member/courseCompletion.ts), [mission evaluation contract](../../../lib/ai/skillMissionEval.ts), [mission API](../../../app/api/skill-missions/[courseSlug]/evaluate/route.ts).

**Acceptance criteria:** define separate states for provider completion, self-reported activity, submitted evidence, and reviewed mastery. A reviewed result records rubric version, reviewer identity, evidence reference, score, feedback, decision time, and resubmission history. Learners can revise and retry. Provider progress ingestion remains independent. Use a supervised practical or authorized external assessment when claiming mastery beyond the written practice.

## Resolved mapping defect; remaining coverage audit

**Finding.** Seven missions resolve for legacy IBM IT Support, but the seventh retains fallback slug `it-support-course-7`, which is not in the assigned ten-course list. Its title is “Technical Support Case Studies and Capstone Project”; the actual assigned case-study record uses a different title and slug. The global missions view can therefore show a mission that does not unlock from normal assigned-course completion. This pass repairs that exact program-and-legacy-version alias: `it-support-course-7` now unlocks from `technical-support-case-studies`. The original mission event identity remains unchanged; no assignment is rewritten. The workspace still excludes any other unresolved course mapping.

**Sources:** [curriculum mission resolution](../../../lib/member/skillMissionCurriculum.ts), [mission status loading](../../../lib/member/skillMissions.ts), [new assignment projection](../../../lib/member/trainingCoursePractice.ts).

**Acceptance criteria:** audit mission coverage against each active immutable curriculum. The case-study alias was checked against the frozen Coursera slug, course description, and the existing root-cause/documentation scenario. Apply the same source check before adding aliases elsewhere. Tests must prove exact assigned-course completion unlocks it, wrong-program completion does not, historical mission results retain their identity, and unsupported items are not shown as achievable work. Display the real course topic rather than an unrelated nickname.

## Priority 4: complete the human review cycle

**Finding.** Before this change, workspace links opened a generic inbox with no course context. The new editable request closes that handoff. The underlying messages system stores a conversation and can notify an assigned counselor, but it does not create a course-evidence review task, require a rubric decision, or record whether feedback was acted on. The workspace storage loader is member scoped; there is no dedicated staff review view of these new work records.

**Sources:** [member messages page](../../../app/(portal)/dashboard/messages/page.tsx), [message delivery route](../../../app/api/member/messages/route.ts), [workspace storage](../../../lib/member/loadTrainingWorkspace.ts).

**Acceptance criteria:** give an assigned counselor a clear review queue with the member-approved artifact, course and rubric; show requested, reviewing, revision-needed, and reviewed states to the member. Record reassignment and escalation when no counselor is assigned. Preserve tenant access controls. Measure request-to-response time and whether members make a subsequent revision, without promising a response time that staffing cannot support.

## Evidence boundaries and next short improvements

This audit inspected repository behavior and synthetic local fixtures. It did not assess Coursera's entire hosted course content, run a paid AI evaluation, submit real member work, or establish placement/retention outcomes. The existing provider course launches were not invoked.

Small follow-ups after this slice are: audit remaining programs for unreachable missions; make the lab's instruction-availability state visible in the outline; add a course-specific “what I am stuck on” prompt; and surface an honest pending-review state once a real review record exists. None should award training hours or credentials by itself.

## Verification of this slice

- 42 focused Vitest tests passed across the real workspace/composer/challenge, feedback route, practice projection, and existing grading API contract. Eight Node resolver tests passed. TypeScript, targeted ESLint, and `git diff --check` passed.
- Browser handoff used a normal authenticated synthetic member. No message was sent when the draft opened. A deliberately mocked503 retained the edited request; the subsequent real local message POST returned200 and stored exactly one message. Reload retained it. The request contained no private course notes.
- Three real authenticated `quiz-check` calls returned200 and explanations from the server's answer key. The evaluator boundary was mocked503 to test failure and pending-request protection without a paid AI call. Live AI grading was not verified.
- Prior-result rendering was tested using an explicitly seeded synthetic mission event, then reloading the program page. Stored feedback and the resume draft appeared for the owning member only. Another member remained completion-gated. This was a fixture, not a newly achieved learning outcome.
- Course completion stayed at3/10 and114 hours in unfinished courses. No credential or training completion was awarded by saving work, composing a message, or the simulated grading failure.
- Settled viewport captures at375,768, and1440px verified that the practice overlay fills the viewport and its card stays within the visible bounds. Background scrolling is locked while open; closing restores the prior scroll styles and focus. Practice/handoff controls produced no horizontal overflow or JavaScript exceptions. The local GoTrue fixture lacks hosted realtime; its websocket is blocked by the production CSP. The expected mocked503 emits a resource error. Neither is hidden as an application success.

Evidence: [handoff report](learning-handoff-verification.json), [native practice report](native-practice-verification.json), [reviewed request on desktop](feedback-request-desktop.png), [reviewed request on mobile](feedback-request-mobile.png), [server-graded question](course-practice-graded-desktop.png), [stored fixture feedback](course-practice-feedback-desktop.png), [mobile practice](course-practice-mobile.png), [dark practice](course-practice-dark.png).
