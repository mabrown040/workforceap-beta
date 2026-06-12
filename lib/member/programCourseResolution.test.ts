/**
 * Ensures each Coursera-backed program in `PROGRAMS` lines up with
 * `DISCOVERED_COURSERA_PROGRAMS` and that each `courseId` in the discovery
 * catalog matches a row in the built `program.courses` list (same contract as
 * `resolveProgramCourse` after enroll-time catalog merge in `programs.ts`).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { DISCOVERED_COURSERA_PROGRAMS } from '@/lib/content/courseraDiscoveredCatalog';
import { PROGRAMS } from '@/lib/content/programs';

const PROGRAMS_WITHOUT_COURSERA_DISCOVERY = new Set([
  'digital-literacy-empowerment-class',
  'certified-production-technician-cpt',
  'certified-logistics-technician-clt',
  'core-construction-training-certificate',
  // Manually-defined curriculum; no Coursera Learning Path built yet.
  // Remove from this list once the LP exists and is captured in
  // DISCOVERED_COURSERA_PROGRAMS_INNER.
  'it-support-and-entry-level-cyber-security-certificate',
]);

test('every Coursera-backed program has a discovered catalog entry', () => {
  for (const p of PROGRAMS) {
    if (PROGRAMS_WITHOUT_COURSERA_DISCOVERY.has(p.slug)) continue;
    assert.ok(
      DISCOVERED_COURSERA_PROGRAMS[p.slug],
      `missing DISCOVERED_COURSERA_PROGRAMS[${p.slug}] — add an inner entry or WAP_PROGRAM_DISCOVERED_ALIASES`,
    );
  }
});

test('discovered Coursera courseIds line up with PROGRAMS course rows', () => {
  for (const p of PROGRAMS) {
    if (PROGRAMS_WITHOUT_COURSERA_DISCOVERY.has(p.slug)) continue;

    const discovered = DISCOVERED_COURSERA_PROGRAMS[p.slug];
    assert.ok(discovered?.courses?.length, `program ${p.slug} has empty discovery`);

    const byId = new Map(p.courses.map((c) => [c.slug, c]));
    for (const row of discovered.courses) {
      assert.match(row.courseId, /^[A-Za-z0-9_-]{10,}$/, `${p.slug} / ${row.slug} missing real courseId`);
      assert.doesNotMatch(row.courseId, /^TODO_/);
      const catalogRow = byId.get(row.slug);
      assert.ok(catalogRow, `${p.slug}: program.courses missing slug ${row.slug} (rebuild PROGRAMS from catalog)`);
    }
  }
});
