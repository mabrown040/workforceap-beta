You are a data-integrity engineer for WorkforceAP. Employers pay to post jobs and find candidates. Data accuracy is revenue-adjacent.

Your task: Fix the employer data accuracy and labeling issues. Create a single PR.

## Issues to fix (from employer audit)

1. **Split matches vs applications in pipeline** — `app/(portal)/employer/page.tsx:66-118` counts AI matches and applications as one "Talent Pipeline". Split into two metrics: "AI-suggested profiles" (matches) and "Applications received" (applications). Keep raw counts for ops but label semantics explicitly.

2. **Candidate profile split stats** — `app/(portal)/employer/candidates/[studentId]/page.tsx:115-120` folds matches + applications into "Roles in pipeline". Split into: "Applications submitted" (`applications.length`), "Suggested matches" (`matches.length`), and "Distinct roles" (union with labels).

3. **Fix application count drift** — `app/(portal)/employer/jobs/[id]/page.tsx` uses denormalized `applicationsCount`. Load `include: { _count: { select: { applications: true } } }` and use `_count.applications` (or reconcile in a migration). The apply route increments but deletions don't decrement.

4. **"Applied" column includes declined** — `components/employer/EmployerApplicationsClient.tsx:229-237` header "Applied" wraps submission date, including rejected rows. Rename header to "Submitted" or add sublabel "Not current stage".

5. **Candidate profile shows "Applied" for rejected** — `app/(portal)/employer/candidates/[studentId]/page.tsx:271-284` shows "Applied {date}" for every row. If `application.status === 'rejected'`, use "Submitted …" plus "Outcome: declined".

6. **Status selector human labels** — `components/employer/EmployerApplicationsClient.tsx:220-224` shows raw DB enums (`rejected`, `pending`). Use `employerJobPostingApplicationStatusLabel` from `lib/employer/jobPostingApplicationStatus.ts`.

7. **Fix AI match "declined" label** — `lib/employer/aiMatchPipelineLabels.ts:4-8` maps `rejected → 'Passed'`. Change to `Declined` or `Not moving forward` to align with kanban.

8. **Add training completion filter** — `app/(portal)/employer/applications/page.tsx`: extend `searchParams` with `certCompleted`/`trainingComplete`. In `jobPostingApplication.findMany`, add `where` on `student` relations: `userCertifications`, `MemberProgramProgress`, or `CourseProgress.status === COMPLETED`. Add chips in `MobileApplicationsClient` / desktop.

9. **Add credentials to candidate profile** — `app/(portal)/employer/candidates/[studentId]/page.tsx`: in `prisma.user.findUnique`, add `select`/`include` for:
   - `userCertifications: { select: { certName, issuer, earnedAt } }`
   - `memberProgramProgress` for enrolled program
   - `CourseProgress` rows for completed courses
   Add a "Training & credentials" section showing certs + completion evidence.

10. **Match score tooltip** — Employer pages using `matchScoreAsPercent` (e.g. `EmployerKanban.tsx`, `matches/page.tsx`). Add contextual microcopy: "Weighted fit score (0-100)" or tooltip from `matchReasons`.

## Rules
- One PR, one concern: employer data accuracy and labeling
- Don't change match scoring algorithm (just presentation)
- Don't change auth or role checks
- Build must pass
- PR title: "fix(employer): separate matches from applications, honest labels, and training filters"
