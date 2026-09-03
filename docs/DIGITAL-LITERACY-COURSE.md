# Workforce AP Digital Literacy Course (DigitalLearn.org pathway)

_Added 9/3/26. Replaces the Microsoft Digital Literacy link shipped in #2230._

The Digital Literacy program is an online, self-paced class built from
[DigitalLearn.org](https://www.digitallearn.org/) (Public Library Association):
free, English and Spanish, printable certificate of completion per DigitalLearn
course, well under 25 hours in total (about 4 hours of video lessons).

Members enroll on our platform like any other program. Their training page
lists ten modules; each module is a WorkforceAP portal page
(`/dashboard/learning/modules/<course-slug>?program=digital-literacy-empowerment-class`)
with the linked DigitalLearn lessons, the topics practised, and a
"Mark complete" button that feeds the normal progress, points, and counselor
views.

## Recommended sequence

| # | Module | Lessons (DigitalLearn) | Minutes |
|---|---|---|---|
| 1 | Computer Basics | Introduction; What is a Computer; Getting Started with a Computer | 25 |
| 2 | File Management Basics | Files and Folders; Saving and Closing; Deleting Files; How to Begin to Create Documents; Add a Picture | 14 |
| 3 | Internet Basics | Search Engines; Basic Search; Navigating a Website | 14 |
| 4 | Email Basics | Intro to Email; Intro to Email 2: Beyond the Basics | 43 |
| 5 | Accounts and Passwords | Accounts and Passwords | 20 |
| 6 | Video Conferencing Basics | Video Conferencing | 21 |
| 7 | Cybersecurity Basics: Online Scams and Fraud | Online Scams and Fraud | 28 |
| 8 | Cloud Storage | Cloud Storage | 22 |
| 9 | Microsoft Word Basics | Microsoft Word | 17 |
| 10 | Online Job Searching and Applications | Online Job Searching | 22 |

Total: 226 minutes.

## Where it lives in code

- Content (single source for the Next portal and the Astro site):
  `shared/digitalLiteracyPathway.ts` (+ `.test.ts`).
- Catalog wiring: `lib/content/programs.ts` and `marketing/src/data/programs.ts`
  (both call `digitalLiteracyCatalogCourses()`), description in
  `lib/content/programDescriptions.ts`.
- Member module page: `app/(portal)/dashboard/learning/modules/[courseSlug]/page.tsx`
  renders `lessons`, `topics`, and `provider` when a course carries them.
- Launch route: courses are `kind: 'workforceap'`, so
  `lib/coursera/launchRouteCore.ts` sends members to the module page, never to
  Coursera.

## Maintenance

- Lesson URLs point at DigitalLearn course pages. If DigitalLearn renames a
  course, update the slug in `shared/digitalLiteracyPathway.ts`; the module
  page also links to the full course index as a fallback.
- Skill missions, checkpoints, and the course skill map join to Digital
  Literacy courses by course name. The first four modules reuse the four
  existing mission/checkpoint records (renamed 9/3/26); modules 5–10 have no
  missions yet.
