# TWC syllabus accuracy implementation plan

**Goal:** Make the 12 regulated training-program pages match the supplied syllabi exactly while preserving existing URLs, enrollment routing, and Coursera identifiers.

## Source lock

- Treat the 12 uploaded `.docx` files as the governing source.
- Store a SHA-256 manifest and exact structured transcription in version control.
- Preserve source wording, course order, course hours, descriptions, titles, delivery format, prerequisites, total hours, and published tuition/fees.
- Do not infer or silently correct source inconsistencies. Record them in the manifest.

## Implementation

1. Add failing regression tests that assert:
   - all 12 expected slugs have a syllabus record;
   - titles and declared totals match the supplied documents;
   - each course-hour sum equals the declared program total;
   - the public Astro data and Next/portal data resolve title, course order, hours, and descriptions from the same syllabus source;
   - the public detail template renders syllabus delivery, hours, tuition, prerequisites, and exact course descriptions instead of placeholder copy.
2. Add `shared/programSyllabi.ts`, a dependency-free canonical transcription importable by Next and Astro.
3. Extend the Next `Program`/`ProgramCourse` model with syllabus metadata and course descriptions. Overlay syllabus facts after Coursera discovery so Coursera IDs/slugs remain intact but public curriculum facts cannot be replaced by discovery data.
4. Overlay the same source onto `marketing/src/data/programs.ts` so the public catalog and detail pages use identical titles, durations, descriptions, course order, hours, and course descriptions.
5. Update `marketing/src/pages/programs/[slug].astro` with a syllabus snapshot and exact descriptions; retain routes and application links.
6. Add an auditable source manifest documenting filenames, hashes, mappings, and source inconsistencies.

## Verification

1. Run focused syllabus regression tests.
2. Run TypeScript, unit tests, ESLint, Next production build, and Astro production build with pnpm 10.
3. Preview representative pages (IT Support, Cybersecurity, AI Developer, MBCHIT) and compare rendered text/order/hours to the transcriptions.
4. Commit, push, open PR, wait for required CI, merge, verify Vercel production deployment, and postflight live pages.
