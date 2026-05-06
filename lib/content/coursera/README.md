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
