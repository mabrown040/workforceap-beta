# Coursera integration — audit notes & backlog

Production checks used **workforceap.org** (member + admin-capable session). **Coursera admin / Enterprise API portals** are the source of truth for program IDs, skillset ordering, and public program URLs when validating env (`COURSERA_*`) and `DISCOVERED_COURSERA_PROGRAMS`. Never commit secrets.

## Audit plan — completion snapshot

Rough coverage against the original integration audit brief (repo currency, prod browser matrix, findings doc, prioritized backlog, P0/P1 implementation):

| Track | Status | Notes |
|-------|--------|--------|
| Repo sync / `npm run build` | Done | Build passes after changes; uses repo Prisma 5 via `scripts/prisma-env.js`. |
| Production browser matrix | Partial | Prior session exercised login, `/dashboard/coursera`, launch, `/dashboard/training`, `/admin/coursera`. Full responsive/accessibility matrix not automated here. |
| Findings documented | Done | This file + `docs/coursera-prep.md`. |
| Prioritized backlog | Done | P0/P1 closed in code; P2/P3 listed below. |
| P0 correctness (launch, sync merge, identity, URLs) | Done | Extended further in follow-up (merge tiers, pagination, webhook/name parity). |
| P1 migrations (Coursera xAPI tables) | Done | `prisma/migrations/20260506120000_add_coursera_xapi_tables/` — run **`npm run db:migrate:deploy`** on Supabase-backed envs. |
| Platform verification (Supabase / Vercel) | Partial | **Prisma:** Cursor Prisma MCP may invoke global Prisma 7 CLI (schema incompatibility); use **`node scripts/prisma-env.js prisma migrate status`** locally with valid `POSTGRES_PRISMA_URL`. This workspace had **no DB** → `P1001`. **Supabase:** no MCP tool descriptors in this project’s MCP bundle (metadata-only server entry). **Vercel:** deploy readiness inferred from successful `npm run build`; preview smoke not run from CI here. |

**Estimate:** ~**85–90%** of the technical audit + backlog closure for Coursera-specific scope; remaining gap is mostly **live QA cadence**, **prod migrate confirmation**, and **observability** (structured logs/metrics).

## Course catalog coverage audit

- Workforce program tracks: **19**
- Discovered Coursera catalog mappings in repo: **8**
- Programs still using placeholder `-course-N` slugs: **11**

**Programs missing discovered catalog entries**

- `digital-literacy-empowerment-class`
- `aws-cloud-technology-amazon`
- `software-developer-professional-certificate-ibm`
- `it-automation-with-python-google`
- `comptia-network-professional-certificate`
- `comptia-security-professional-certificate`
- `cybersecurity-professional-certificate-google`
- `ux-design-professional-certificate-google`
- `certified-production-technician-cpt`
- `certified-logistics-technician-clt`
- `core-construction-training-certificate`

**Hardening shipped for these gaps**

- Program catalog can now ingest runtime course overrides from `NEXT_PUBLIC_COURSERA_PROGRAM_COURSES_MAP` / `COURSERA_PROGRAM_COURSES_MAP` in `lib/content/programs.ts`.
- Launch fallback now attempts `/learn/{currentCourseSlug}` only when slug is non-placeholder, after template/program URL fallbacks (`lib/coursera/config.ts`).
- Member launch/status routes now pass `currentCourseSlug` so launch fallback works consistently (`app/api/member/coursera/launch/route.ts`, `app/api/member/coursera/route.ts`).
- Added a ready-to-edit override seed file for all 11 missing programs: `docs/coursera-course-overrides.generated.json` (slugified draft; validate each slug in Coursera admin before production use).
- `/api/member/coursera` and `/api/member/coursera/sync` now include `catalogHealth` to surface placeholder slug risk to UI/ops.

## Enterprise skillset → portal course slug (best-practice coverage)

Matching uses **stacked signals** (implemented in `resolveCompletedCourseSlugsFromEnterpriseSkillsets`):

1. **`COURSERA_SKILLSET_SLUG_MAP`** — JSON map `programSlug → skillsetId → internalCourseSlug` (explicit overrides when Coursera naming/order diverges from catalog).
2. **Positional** — `COURSERA_SKILLSET_ID_MAP` / `COURSERA_DEFAULT_SKILLSET_IDS` order aligns with `program.courses` indices; works for **`min(skillsets, courses)`** so partial lists still contribute.
3. **Exact normalized title** — punctuation/case-insensitive equality with catalog course `name`.
4. **Loose title containment** — only when normalized strings exceed **`COURSERA_TITLE_LOOSE_MIN_LEN`** (reduces false positives).
5. **Slug-token overlap** — significant tokens derived from internal course `slug` appear in the skillset title.

**Unmatched** completed Enterprise skillsets are returned as **`unmatchedCompletedSkillsets`** on `/api/member/coursera/sync` and surfaced lightly in **`CourseraSyncCard`**.

**API pagination:** `fetchCourseraLearnerSkillsetProgress` follows **`pagination.nextPageLink`** up to **40** pages and merges rows by `skillsetId` (keeps max progress).

**Webhook / `completeMemberCourse`:** Course resolution now mirrors Enterprise fuzzy titles via **`normalizeTitleForMatch`** containment (`lib/member/courseCompletion.ts`) so webhook `courseName` variants align with sync behavior.

## Findings (evidence-backed)

| Area | Observation | Code / route |
|------|-------------|--------------|
| Launch URL | Opaque Enterprise **program** IDs can 404 in browser; catalog **`publicProgramUrl`** is the safest learner-visible fallback when templates omit HTTPS slug URLs. | `lib/coursera/config.ts`, `app/api/member/coursera/launch/route.ts` |
| Progress UX | “Current course” follows **catalog order + completion**, not raw completed count. | `lib/member/courseraCourseProgress.ts`, `/dashboard/coursera` |
| Enterprise sync | Merge uses **`coursera-enterprise-sync`** with **`notify`** off by default; diagnostics expose unmatched skillsets. | `app/api/member/coursera/sync/route.ts`, `lib/member/courseCompletion.ts` |
| Identity | xAPI direct-email match uses **case-insensitive** lookup + **`deletedAt: null`**; webhook member lookup matches. | `lib/xapi/mappings.ts`, `app/api/webhooks/coursera/route.ts` |
| Training links | Per-course CTAs use **`/learn/{slug}`**; placeholder-course programs can be corrected via runtime course-map env override. | `components/portal/TrainingCourseList.tsx`, `lib/content/programs.ts` |
| Schema | Coursera mapping / xAPI tables tracked in **Prisma** (+ legacy bootstrap for older DBs). | `prisma/migrations/20260506120000_add_coursera_xapi_tables/`, `lib/xapi/mappings.ts` |

## Backlog

**Done (P0/P1 + hardening)**

- Launch fallbacks, enrollment gate, first-incomplete index for templates/course maps.
- Sync merges completions; multi-tier skillset matching + **`COURSERA_SKILLSET_SLUG_MAP`** + unmatched diagnostics.
- Learner-progress **pagination** client merge.
- Webhook / completion loose title parity with Enterprise fuzzy tier.
- Case-insensitive member resolution (webhook + xAPI email path).
- Prisma migration for Coursera tables.
- Member **Coursera** nav; training/learn URLs; sync card merged counts + refresh + unmatched hint.

**P2**

- Document / enforce **single bootstrap path** (`ensureCourseraMappingTables` vs migrate-only).
- Add Prisma `@@index` for xAPI email index if introspection drift matters for your tooling.
- Reconcile `/admin/coursera` **prod vs repo** if UIs diverge.

**P3**

- Structured logging for launch/sync/webhook outcomes (program slug, HTTP status categories — **no PII**).
- Runbook: Coursera program ID / public URL rotation + env update checklist.
- Optional unit tests for `fetchCourseraLearnerSkillsetProgress` pagination (HTTP mock).
