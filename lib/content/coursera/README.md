# Coursera Catalog Snapshot

Source-of-truth seed data pulled directly from Coursera's enterprise APIs +
admin UI on 2026-05-05. Used to seed the `courses` table.

## Files

- **`catalog.json`** — All 95 active courses in the `Workforce Advancement Project` program. Pulled via `GET https://api.coursera.org/api/programs.v1?q=slug&slug=workforce-advancement-project-8a3f0` (Bearer auth) → batched `/api/courses.v1?ids=...` for course detail.
- **`lp_mapping.json`** — Mapping from each Coursera Learning Path → constituent courses with WAP `program_slug` linkage. Extracted from the admin UI (Catalog → Learning Paths) because LP API endpoints reject Bearer auth and require session cookie.
- **`curatedCollections.generated.ts`** — The org's **Curriculum download** (`CuratedCollections-<programId>-<ms>.csv`, Coursera admin UI → Curriculum) rendered as code: all 16 collections (Learning Paths) with their short collection ids, display names, and ordered courses (172 course rows, 159 distinct courses, 13 shared by two collections). Generated, never edited by hand: `pnpm coursera:generate-curated-collections -- --csv <file>`; `--check` reports drift. Parser and serializer live in `curatedCollectionsCsv.ts`; read helpers (membership lookups) in `curatedCollections.ts`.
- **`learningPaths.ts`** — Registry mapping each collection / Learning Path to its canonical WAP program (see below).

## Refresh

Course catalog (Bearer-friendly): can run on a cron via `COURSERA_APP_KEY`/`COURSERA_APP_SECRET` against `api.coursera.org` (note: `.org`, not `.com`).

LP→course mapping: requires admin session cookie. No automated path yet — re-extracted from the UI when content changes.

Curated collections: in the Coursera admin UI open the org program's **Curriculum** page and choose *Download*; the ZIP holds `CuratedCollections-<programId>-<ms>.csv` (no learner data). Run `pnpm coursera:generate-curated-collections -- --csv <that file>` and commit the regenerated module together with any `learningPaths.ts` change it calls for (a new collection id, a renamed path). The registry test fails until every exported collection is registered under its exported name.

## Known gaps

- One course in Data Analytics LP (`Data Analysis with R Programming`) is `Disabled` at Coursera and not in the active catalog.
- As of the 2026-09-17 Curriculum download every Coursera-delivered WAP program has a collection (16 in all, including separate Network+, Security+ and combined Net+/Sec+ collections). The board-approved `2026-approved-v2` curricula for UX, DBA and Management Analyst are a different course set and have **no** Coursera collection yet; the collections registered for those slugs are the live legacy learner paths (see `docs/plans/2026-08-30-approved-coursera-curriculum-v2.md`).
- `courseraDiscoveredCatalog.ts` course lists drift from the download for six programs (AI and Software Developer, AWS, Network+, UX, and the two v2 programs' legacy lists); `it-support-and-entry-level-cyber-security-certificate` has no catalog entry at all, and the combined Net+/Sec+ entry lacks ids for its ten networking courses. Refreshing them changes member-visible course keys, so that is a separate, approved change.

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
- every collection id comes from the Curriculum download
  (`curatedCollections.generated.ts`), and a path row on the live feed still
  teaches any collection created since, so a new path works as soon as it is
  registered;
- a course row that arrives with **no** collection falls back to curated
  membership, and only when exactly one collection lists the course. A row
  that names a collection the registry does not know is never guessed.

The combined "Networking and Cybersecurity Professional Certificate (CompTIA
Net+,Sec+)" collection is WAP's own combined program
(`cybersecurity-professional-certificate-google`); Network+ and Security+ have
their own collections. One collection, IT Support and Entry-Level Cybersecurity
(IBM), is registered by collection id only until its path id is captured from
the admin URL.

`lp_mapping.json` remains the per-path *course list* dump for the placeholder
lint; regenerate it from the Coursera admin UI when paths change, and update
`learningPaths.ts` in the same change.
