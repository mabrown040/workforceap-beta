# Workforce AP Digital Literacy Course (DigitalLearn.org pathway)

_Added 9/3/26; provider links and truth labels reverified 9/12/26._

The Digital Literacy program is a free, beginner-friendly, online and
self-paced WorkforceAP pathway. Its ten stable modules link to current
[DigitalLearn.org](https://www.digitallearn.org/courses) course pages or to a
clearly labeled course-material fallback when no healthy self-paced deep link
is available.

DigitalLearn course pages can be opened without signing in, and the site
provides an English/Español control. A provider account is optional. WorkforceAP
does not iframe, copy, or host DigitalLearn videos, and it does not receive or
claim provider-side progress.

## Stable module sequence

| # | WorkforceAP module | Linked learning | Minutes |
|---|---|---|---:|
| 1 | Computer Basics | Getting Started on a Computer | 21 |
| 2 | File Management Basics | File/course materials fallback; Microsoft Word introduction and picture lessons | 14 |
| 3 | Internet Basics | Basic Search; Navigating a Website | 13 |
| 4 | Email Basics | Intro to Email; Beyond the Basics | 43 |
| 5 | Accounts and Passwords | Accounts and Passwords | 20 |
| 6 | Video Conferencing Basics | Current course-details page plus course-material fallback | 21 |
| 7 | Cybersecurity Basics: Online Scams and Fraud | Online Frauds and Scams (2025) | 28 |
| 8 | Cloud Storage | Cloud Storage | 22 |
| 9 | Microsoft Word Basics | Microsoft Word | 17 |
| 10 | Online Job Searching and Applications | Online Job Searching; Applying for Jobs Online | 36 |

Deterministic linked-learning estimate: **235 minutes (about 4 hours)**, well
under 25 hours. The estimate does not claim measured attendance.

## Provider health and fallbacks

Manual browser verification on 2026-09-12 treats an HTTP 200 page as unhealthy
when the application itself reports `Course failed to load: 404` or exposes no
playable lesson rows.

- Removed `courses/creating-documents`; the current Microsoft Word page contains
  the supplied Introduction and Add a Picture lessons.
- Replaced `courses/video-conferencing` with the current
  `courses/basics-of-video-conferencing` details page and an explicit
  `training.digitallearn.org/courses/video-conferencing-basics` materials
  fallback. The inspected details page did not expose playable lesson rows.
- Replaced the superseded 2016 `courses/online-scams` destination with
  `courses/online-frauds-and-scams-2025`.
- Accounts and Passwords remains on its current details page, but the UI labels
  the available text copies because the inspected page exposed no playable
  lesson rows.
- File Management uses a current DigitalLearn course-materials page because no
  healthy self-paced page matching the supplied file-management sequence was
  verified.

If DigitalLearn changes a destination, update
`shared/digitalLiteracyPathway.ts` only after checking the rendered page, not
just the HTTP status.

## Member UI

Lessons on `/dashboard/learning/modules/[courseSlug]` are stacked crimson
`.wa-kit-cta--lg` buttons. The first control is **Start this lesson**. Remaining
lessons use **Open [lesson title]**. Title and minutes stay supporting copy, not
the click target. **Mark module complete in WorkforceAP** is a ghost/outline
control so it cannot outrank Start.

## Completion and certificate boundary

Members return to WorkforceAP and use **Mark module complete in WorkforceAP**.
That existing local flow records course progress, points, counselor-visible
completion, and program-completion milestones. It does not verify activity on
DigitalLearn or issue/claim a DigitalLearn certificate.

The member certificate area remains the WorkforceAP record surface. Live
provider certificate issuance/download behavior still requires an attended
acceptance journey before any printable-certificate claim may return.

## Attribution and license

Linked course content and materials are provided by DigitalLearn.org.
DigitalLearn identifies course content as
[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) in its
[current terms](https://training.digitallearn.org/terms_of_use): attribution and
a license link are required; commercial use is not permitted; adaptations must
use the same license; attribution must not imply endorsement. WorkforceAP links
to original provider pages and does not copy, host, or adapt the content here.
