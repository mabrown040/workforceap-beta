# Coursera Catalog Snapshot

Source-of-truth seed data pulled directly from Coursera's enterprise APIs +
admin UI on 2026-05-05. Used to seed the `courses` table.

## Files

- **`catalog.json`** — All 95 active courses in the `Workforce Advancement Project` program. Pulled via `GET https://api.coursera.org/api/programs.v1?q=slug&slug=workforce-advancement-project-8a3f0` (Bearer auth) → batched `/api/courses.v1?ids=...` for course detail.
- **`lp_mapping.json`** — Mapping from each Coursera Learning Path → constituent courses with WAP `program_slug` linkage. Extracted from the admin UI (Catalog → Learning Paths) because LP API endpoints reject Bearer auth and require session cookie.

## Refresh

Course catalog (Bearer-friendly): can run on a cron via `COURSERA_APP_KEY`/`COURSERA_APP_SECRET` against `api.coursera.org` (note: `.org`, not `.com`).

LP→course mapping: requires admin session cookie. No automated path yet — re-extracted from the UI when content changes.

## Known gaps

- One course in Data Analytics LP (`Data Analysis with R Programming`) is `Disabled` at Coursera and not in the active catalog.
- 11 WAP programs in `organization_program_catalog` have no Coursera Learning Path yet (CompTIA Network+/Security+, AWS Cloud, Cybersecurity Google, etc.).

## Learning Paths (`learningPaths.ts`)

Coursera reports every WAP program inside the single "Workforce Advancement
Project" B4B program as a **Learning Path** (the enrollment feed calls it a
*collection*). `learningPaths.ts` is the registry that maps each path to its
canonical WAP program and is the only place ingestion consults for that link:

- a path's own enrollment row (`contentId` = the 22-character path id) is
  program-level progress, never an "unknown course";
- a course row's `collectionId` / `collectionName` says which path the learner
  took it under, and `lib/coursera/learningPathAttribution.ts` uses that to
  attribute raw progress and to keep shared courses from being credited to a
  neighbouring program by guess;
- collection ids are learned from the live feed (a path row carries its own),
  so a new path works as soon as it is registered by id.

`lp_mapping.json` remains the per-path *course list* dump for the placeholder
lint; regenerate it from the Coursera admin UI when paths change, and update
`learningPaths.ts` in the same change.
