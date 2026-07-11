# Program Slug Compatibility Implementation Plan

> **For execution:** Follow test-driven development and verification-before-completion.

**Goal:** Make every legacy program slug currently present in the production WorkforceAP catalog resolve to its intended canonical static program without mutating production data.

**Architecture:** Extend the existing `PROGRAM_SLUG_ALIASES` compatibility boundary and add focused unit tests around `getProgramBySlug`. This release is read-compatibility only: no catalog renames, migrations, backfills, RLS changes, or production writes.

**Tech Stack:** TypeScript, Node test runner, pnpm 10, Next.js 15.

---

### Task 1: Add failing compatibility tests

**Files:**
- Create: `tests/lib/program-slug-compatibility.spec.ts`

**Steps:**
1. Add table-driven tests asserting all five production legacy slugs resolve to the approved canonical program slug.
2. Add a control test asserting canonical slugs resolve directly.
3. Run the focused test and confirm it fails specifically for the three currently missing aliases.

### Task 2: Add minimal legacy aliases

**Files:**
- Modify: `lib/content/programs.ts:411-429`

**Steps:**
1. Remove the member email from the source comment.
2. Add only these missing aliases:
   - `construction-readiness-certificate-osha-10` → `core-construction-training-certificate`
   - `logistics-and-supply-chain-certificate-clt` → `certified-logistics-technician-clt`
   - `production-technology-certificate-cpt` → `certified-production-technician-cpt`
3. Keep existing mappings unchanged.
4. Run the focused test and confirm it passes.

### Task 3: Verify the compatibility release

**Steps:**
1. Run focused tests.
2. Run typecheck.
3. Run lint scoped to changed files, then full lint if feasible.
4. Run `git diff --check`.
5. Review the diff to confirm there are no DB writes, migrations, or unrelated changes.
