# MSSC curriculum manifest — CPT and CLT

**Authored:** August 2026
**Canonical content:** `shared/programCurricula.ts`
**Status:** `draft-pending-owner-verification`

## What this is (and what it is not)

`docs/source-of-truth/TWC-PROGRAM-SYLLABI-2026-07.md` covers the **twelve** programs
whose syllabi were supplied as `.docx` files by the program owner in July 2026. Each
of those is a verbatim transcription carrying the SHA-256 of its source document, and
`shared/programSyllabi.ts` is locked to exactly those twelve records by
`tests/lib/twc-syllabus-accuracy.spec.ts`.

Certified Production Technician (CPT) and Certified Logistics Technician (CLT) were
**not** part of that submission. No program-owner-supplied syllabus is on file for
either record, so this curriculum is **authored in-house by the WorkforceAP program
team** rather than transcribed. This statement is limited to the source set supplied
to WorkforceAP; it does not claim that no syllabus exists elsewhere. The curriculum
lives in a separate module (`shared/programCurricula.ts`) with
`authoredBy` / `status` provenance instead of `sourceDocument` / `sourceSha256`, so
in-house class content can never be mistaken for a regulated transcription.

If a CPT or CLT syllabus is later supplied as a source document, transcribe it into
`shared/programSyllabi.ts` under the normal source-lock rules and delete the
corresponding record here — the catalog gives a syllabus precedence over a curriculum,
so the two must never both exist for one slug.

## Records

| Website slug | Credential | Total hours | Courses | Status |
|---|---|---|---|---|
| `certified-production-technician-cpt` | MSSC Certified Production Technician (CPT) | 160 (104 clock + 56 lab) | 8 | Draft — owner verification pending |
| `certified-logistics-technician-clt` | MSSC Certified Logistics Technician (CLT) | 160 (110 clock + 50 lab) | 8 | Draft — owner verification pending |

The numeric values above are retained as internal draft planning data. While a record
has `draft-pending-owner-verification` status, the public program detail page labels it
as WorkforceAP-authored and withholds hours, delivery format, and tuition. The official
price list omits the record entirely and names the verification gate.

## Needs program-owner sign-off before the next EdVera / TWC submission

These three figures would reach funders through `/programs/price-list`, which is shared
with TWC and Workforce Solutions as an EdVera attachment, if they were published. They
are program-design decisions, not transcribed facts, and remain **internal drafts**
until the program owner confirms them:

1. **Hour allocation per course** (both programs total 160 hours, matching the twelve
   submitted programs; previously each course carried the catalog's 10-hour placeholder
   default, publishing 80 contact hours per program).
2. **Delivery format** — recorded as *Hybrid, Instructor-Supported* for both.
3. **Tuition and fees** — recorded as $7,500, matching the maximum program cost already
   published for every other program on the price list.

Once confirmed, change `status` to `owner-verified` in `shared/programCurricula.ts`,
drop the draft note, re-verify the detail and price-list output, and re-date
`CONTENT_VERIFIED` in `marketing/src/pages/programs/price-list.astro`.

## Certification alignment

Course content is mapped to the MSSC assessment areas each course prepares a member for.
Alignment is published per course on the program detail page.

- **CPT** — four assessment modules: Safety; Quality Practices and Measurement;
  Manufacturing Processes and Production; Maintenance Awareness. A member must pass all
  four to hold the full CPT credential.
- **CLT** — two tiers: the Certified Logistics Associate (CLA) covers foundational areas
  and is the prerequisite for the Certified Logistics Technician (CLT). The sequence
  prepares members for both. The assessment-domain manifest was verified on
  **2026-08-30** against the official MSSC
  [CLT Key Activities PDF](https://www.msscusa.org/wp-content/uploads/2015/11/CLT-Key-Activities.pdf).
  `shared/programCurricula.ts` carries the same URL and verification date.

The exact CLA domains are: Global supply chain logistics life cycle; Logistics
environment; Material handling equipment; Safety principles; Safe material handling
and equipment operation; Quality control principles; Workplace communications;
Teamwork and workplace behavior to solve problems; Using computers.

The exact CLT domains are: Product receiving; Product storage; Order processing;
Packaging and shipment; Inventory control; Safe handling of hazmat materials;
Evaluation of transportation modes; Dispatch and tracking; Measurements and metric
conversions.

## Course names are a join key — do not rename

Skill missions (`lib/content/skillMissionCatalog.ts`), skill checkpoints
(`lib/content/checkpoints/tradesAndHealth.ts`), and the course skill map
(`lib/content/courseSkillMap.ts`) all join to these courses by **normalized course
name** (`lib/member/missionCourseUnlock.ts`). Renaming a course in
`shared/programCurricula.ts` without updating all three silently locks a member out of
the mission attached to that course. `tests/lib/mssc-curriculum-accuracy.spec.ts` pins
the generated course slugs for the same reason.
