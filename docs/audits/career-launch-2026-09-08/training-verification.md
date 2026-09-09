# Authenticated training workspace verification

The actual `/dashboard/program` workflow passed local browser → API → database verification with two synthetic members. The 160-hour legacy IT Support assignment remains unchanged. Study planning and course evidence persist independently of official completion.

## Functional evidence

- The seeded member has three of ten assigned courses complete: 30%, 46 completed course hours, and 114 estimated hours in unfinished courses.
- At 10 hours per week, the unfinished course schedule spans 12 weeks. Changing the input to eight hours shows 15 weeks. Zero hours disables saving.
- Updating the study start date and saving persisted the values across a page reload. The browser remained on `/dashboard/program`.
- Notes and a project URL saved against the selected Networking course and returned after reload, with the selected course preserved in the URL.
- Different unsaved drafts survived switching between Networking and Cloud Computing. Saving each retained its own content.
- The saved-work filter showed the two saved courses; unfinished showed seven; all courses showed ten.
- A separately authenticated second member saw no first-member notes, artifact URL, saved-course entries, or persisted study plan.
- Course and schedule saves left the enrollment version, recorded completions, and remaining-hour calculation unchanged.
- The Coursera launch URL matched the selected assigned course. It was inspected only; no provider launch, enrollment, paid request, or external submission was performed.

## API and data checks

The authenticated API persisted one study-plan row and one course-work row in the initial API verification. Browser verification then saved work on a second course. Direct database reads confirmed persistence; reads under the second member confirmed isolation.

Eleven invalid or unauthorized requests were rejected: unauthenticated read (401), user identity injection in query/body (400), curriculum-version conflict (409), unassigned program/course (403), zero weekly hours (400), impossible date (400), unsafe artifact URL (400), oversized notes (400), and malformed JSON (400). Responses use private, no-store caching.

See [the API report](training-api-verification.json) and [the browser report](training-browser-verification.json).

## Browser and visual checks

- Light mode: 375, 768, and 1440 pixels; dark mode: 1440 pixels.
- No horizontal page overflow at any tested width.
- Mobile Continue this course moved focus to the editor. Back to all courses returned focus to the curriculum.
- No JavaScript exceptions or application console errors.
- Four resource errors came from deliberately aborting the existing Google Tag Manager script during reloads. A separate request/console-location trace attributed them to `gtm.js`; analytics was blocked to avoid transmitting fixture activity. The initial test harness flagged these until attribution was complete.
- Screenshots were inspected and include the development-server indicator. A subsequent caption whitespace correction is the only visual change after capture.

[Desktop](training-workspace-desktop.png) · [Tablet](training-workspace-tablet.png) · [Mobile](training-workspace-mobile.png) · [Dark](training-workspace-dark.png) · [Study schedule](training-workspace-schedule.png)

## Local fixture boundary

Verification used disposable PostgreSQL on `127.0.0.1:55437` and a GoTrue-compatible fixture bound to `127.0.0.1:54327`. The normal Supabase client issued and verified real SSR session cookies; protected middleware and server authentication remained enabled. Both members, approved enrollment records, and course-progress records were synthetic. No production data was loaded, and no authentication bypass or fixture credentials were committed.

Temporary utilities, environment, and browser states live under `/tmp/wap-platform-auth` with restricted credential-file permissions. The application ran at `http://localhost:4323` with the local auth/database environment. The development server and browser sessions were stopped after verification; the local auth/database services remained available for production-build verification.

## Optimized build and hosted preview

The optimized Next.js production build passed with 499 generated pages. The
production server then passed the same authenticated workspace flow: both UI
save requests returned 200, the schedule and coursework returned after reload,
and member isolation and all eleven rejected API cases still passed. No
application JavaScript exceptions occurred. Vercel Insights scripts are absent
on localhost, and the disposable environment has no Upstash credentials; those
local dependency warnings are recorded separately from application failures.
See [production browser proof](production-browser-verification.json) and
[production API proof](production-api-verification.json).

Vercel preview for application commit `b5c1b6ce` deployed successfully. Hosted
checks confirmed the original homepage hero, actual program recommendations,
absence of the removed preparation-plan controls, and the IBM application
handoff with its selected program intact. The new workspace API returned 401
and private/no-store headers without a session. No remote member data was read
or submitted. The preview remains separate from production.

All temporary local application, authentication, and database services were
stopped after verification. The existing system database was left running.
