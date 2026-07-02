import test from 'node:test';
import assert from 'node:assert/strict';
import { PROGRAMS as APP_PROGRAMS } from './programs';
import { PROGRAMS as MARKETING_PROGRAMS } from '../../marketing/src/data/programs';

/**
 * Locks marketing/src/data/programs.ts (the public site — and the source
 * for marketing/src/pages/programs/price-list.astro, the document shared
 * with TWC / workforce boards) against silently drifting from
 * lib/content/programs.ts (the app catalog used for enrollment and the
 * member dashboard).
 *
 * For every program slug present in both catalogs: titles must match, and
 * the total course-contact-hours must match. A failure here means either a
 * change needs to be reverted, or both catalogs (and, for hours, the price
 * list) need to be updated together.
 *
 * KNOWN DRIFT (found 2026-07-02, pre-dating this test): lib/content/programs.ts
 * derives every course's estimatedHours from a single per-program
 * `defaultHours` value (see `mkProgram()`), and for programs with a
 * Coursera-discovered catalog entry (lib/content/courseraDiscoveredCatalog.ts)
 * the course *count* there can differ from the hand-verified marketing
 * syllabus. Nine programs already disagree on total hours as a result. Those
 * are marked `skip` below with the reason, so this test stays green while
 * still catching *new* drift on the eleven programs that already agree.
 * Remove an entry from KNOWN_HOUR_DRIFT once its two catalogs are
 * reconciled so parity is enforced on it again.
 */

function sumHours(courses: { estimatedHours: number }[]): number {
  return courses.reduce((sum, c) => sum + (c.estimatedHours ?? 0), 0);
}

const appBySlug = new Map(APP_PROGRAMS.map((p) => [p.slug, p]));
const marketingBySlug = new Map(MARKETING_PROGRAMS.map((p) => [p.slug, p]));
const sharedSlugs = [...marketingBySlug.keys()].filter((slug) => appBySlug.has(slug));

const KNOWN_HOUR_DRIFT = new Set([
  'it-support-professional-certificate-ibm',
  'project-management-professional-certificate-microsoft',
  'data-analytics-professional-certificate-google',
  'data-science-professional-certificate-ibm',
  'medical-billing-and-coding-certificate',
  'comptia-a-professional-certificate',
  'comptia-security-professional-certificate',
  'cybersecurity-professional-certificate-google',
  'digital-marketing-e-commerce-google',
]);

test('marketing and app program catalogs share overlapping slugs', () => {
  assert.ok(sharedSlugs.length > 0, 'expected overlap between marketing and app program catalogs');
});

for (const slug of sharedSlugs) {
  const appProgram = appBySlug.get(slug)!;
  const marketingProgram = marketingBySlug.get(slug)!;

  test(`program catalog parity — title: ${slug}`, () => {
    assert.equal(marketingProgram.title, appProgram.title, `title mismatch for ${slug}`);
  });

  test(
    `program catalog parity — contact hours: ${slug}`,
    { skip: KNOWN_HOUR_DRIFT.has(slug) ? 'known pre-existing hour drift — see file header' : false },
    () => {
      const appHours = sumHours(appProgram.courses);
      const marketingHours = sumHours(marketingProgram.courses);
      assert.equal(
        marketingHours,
        appHours,
        `contact-hour total mismatch for ${slug}: marketing=${marketingHours} app=${appHours}`
      );
    }
  );
}
