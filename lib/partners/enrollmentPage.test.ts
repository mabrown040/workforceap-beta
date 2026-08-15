import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SCHOOL_DEFAULT_SLUGS,
  formatSalaryRange,
  getEnrollmentPageData,
  type EnrollmentCatalogRow,
  type EnrollmentPageDb,
  type EnrollmentPartnerRecord,
} from '@/lib/partners/enrollmentPage';

const NOW = new Date('2026-08-15T12:00:00Z');
const TERM_START = new Date('2026-01-01T00:00:00Z');
const TERM_END = new Date('2026-12-31T23:59:59Z');

function partnerRecord(
  overrides: Partial<EnrollmentPartnerRecord> = {}
): EnrollmentPartnerRecord {
  return {
    id: 'partner-1',
    name: 'Concordia High School',
    slug: 'concordia',
    referralCode: 'chs2026',
    active: true,
    status: 'active',
    logoUrl: null,
    brandColor: null,
    schoolDistrict: null,
    enrollmentPageEnabled: true,
    enrollmentHeadline: null,
    enrollmentBlurb: null,
    sponsoredEnrollment: true,
    sponsorshipFundingSource: null,
    sponsorshipTermLabel: '2026',
    sponsorshipStartsAt: TERM_START,
    sponsorshipEndsAt: TERM_END,
    sponsorshipSeatCap: null,
    programCatalog: [],
    ...overrides,
  };
}

function catalogRow(
  programSlug: string,
  overrides: Partial<EnrollmentCatalogRow> = {}
): EnrollmentCatalogRow {
  return { programSlug, displayOrder: 0, featured: false, note: null, ...overrides };
}

/**
 * Minimal hand-written Prisma seam. Records the args it was called with so the
 * tests can assert the query shape without a database anywhere in sight.
 */
function stubDb(
  partner: EnrollmentPartnerRecord | null,
  usedSeats = 0
): EnrollmentPageDb & {
  findUniqueArgs: unknown[];
  countArgs: unknown[];
} {
  const findUniqueArgs: unknown[] = [];
  const countArgs: unknown[] = [];
  return {
    findUniqueArgs,
    countArgs,
    partner: {
      async findUnique(args) {
        findUniqueArgs.push(args);
        return partner;
      },
    },
    courseEnrollment: {
      async count(args) {
        countArgs.push(args);
        return usedSeats;
      },
    },
  };
}

test('formatSalaryRange normalizes the canonical salary string to a compact range', () => {
  assert.equal(formatSalaryRange('Starting salary: $55K-$72K'), '$55K–$72K');
  assert.equal(formatSalaryRange('Starting salary: $88K – $120K'), '$88K–$120K');
  // No parseable range — fall back to the label-stripped text rather than lying.
  assert.equal(formatSalaryRange('Starting salary: varies by employer'), 'varies by employer');
});

test('not-found when no partner row matches the slug', async () => {
  const db = stubDb(null);
  const result = await getEnrollmentPageData('nope', { db, now: NOW });
  assert.equal(result.kind, 'not-found');
  assert.deepEqual(db.findUniqueArgs, [
    {
      where: { slug: 'nope' },
      include: {
        programCatalog: { orderBy: [{ displayOrder: 'asc' }, { programSlug: 'asc' }] },
      },
    },
  ]);
});

test('not-found when the partner exists but its enrollment page is disabled', async () => {
  const db = stubDb(partnerRecord({ enrollmentPageEnabled: false }));
  const result = await getEnrollmentPageData('concordia', { db, now: NOW });
  assert.equal(result.kind, 'not-found');
});

test('paused (never 404) when the partner row is inactive — students hold printed links', async () => {
  const db = stubDb(partnerRecord({ active: false }));
  const result = await getEnrollmentPageData('concordia', { db, now: NOW });
  assert.equal(result.kind, 'paused');
  if (result.kind !== 'paused') return;
  assert.equal(result.partner.name, 'Concordia High School');
});

test('paused when the partner status is anything other than active', async () => {
  for (const status of ['pending_approval', 'rejected', 'inactive']) {
    const db = stubDb(partnerRecord({ status }));
    const result = await getEnrollmentPageData('concordia', { db, now: NOW });
    assert.equal(result.kind, 'paused', `status=${status} must render the paused explainer`);
  }
});

test('ok: hydrates the partner catalog in order and keeps featured + note', async () => {
  const db = stubDb(
    partnerRecord({
      programCatalog: [
        catalogRow('ux-design-professional-certificate-google', {
          displayOrder: 0,
          featured: true,
          note: 'Counselor pick for the design pathway.',
        }),
        catalogRow('it-support-professional-certificate-ibm', { displayOrder: 1 }),
      ],
    })
  );

  const result = await getEnrollmentPageData('concordia', { db, now: NOW });
  assert.equal(result.kind, 'ok');
  if (result.kind !== 'ok') return;

  assert.deepEqual(
    result.cards.map((c) => c.slug),
    ['ux-design-professional-certificate-google', 'it-support-professional-certificate-ibm']
  );
  assert.equal(result.cards[0].featured, true);
  assert.equal(result.cards[0].note, 'Counselor pick for the design pathway.');
  // Card content is hydrated from the canonical catalog, never the DB row.
  assert.ok(result.cards[0].title.length > 0);
  assert.ok(result.cards[0].duration.length > 0);
  assert.match(result.cards[0].salaryRange, /^\$\d+K–\$\d+K$/);
  assert.ok(result.cards[0].skills.length <= 3);
});

test('ok: an EMPTY catalog falls back to the school defaults instead of a blank page', async () => {
  const db = stubDb(partnerRecord({ programCatalog: [] }));
  const result = await getEnrollmentPageData('concordia', { db, now: NOW });
  assert.equal(result.kind, 'ok');
  if (result.kind !== 'ok') return;

  assert.deepEqual(result.cards.map((c) => c.slug), [...SCHOOL_DEFAULT_SLUGS]);
  assert.equal(result.cards.length, 5);
});

test('every SCHOOL_DEFAULT_SLUGS entry resolves against the canonical program catalog', async () => {
  // A typo here would silently shrink the fallback page instead of failing.
  const db = stubDb(partnerRecord({ programCatalog: [] }));
  const result = await getEnrollmentPageData('concordia', { db, now: NOW });
  if (result.kind !== 'ok') throw new Error('expected ok');
  assert.equal(result.cards.length, SCHOOL_DEFAULT_SLUGS.length);
});

test('ok: an unknown catalog slug is skipped, not thrown — one bad row must not 500 the page', async () => {
  const db = stubDb(
    partnerRecord({
      programCatalog: [
        catalogRow('it-support-professional-certificate-ibm'),
        catalogRow('typo-not-a-real-program', { displayOrder: 1 }),
      ],
    })
  );

  const result = await getEnrollmentPageData('concordia', { db, now: NOW });
  assert.equal(result.kind, 'ok');
  if (result.kind !== 'ok') return;
  assert.deepEqual(result.cards.map((c) => c.slug), ['it-support-professional-certificate-ibm']);
});

test('sponsorship: banner present inside the window, generated by the shared helper', async () => {
  const db = stubDb(partnerRecord());
  const result = await getEnrollmentPageData('concordia', { db, now: NOW });
  if (result.kind !== 'ok') throw new Error('expected ok');

  assert.ok(result.sponsorship);
  assert.equal(
    result.sponsorship?.message,
    'There is no cost to Concordia High School students for 2026 — enrollment is sponsored through our partnership with Concordia High School.'
  );
  assert.equal(result.sponsorship?.termLabel, '2026');
  // Uncapped sponsorship must not run a seat count at all.
  assert.equal(result.sponsorship?.seatsRemaining, null);
  assert.equal(db.countArgs.length, 0);
});

test('sponsorship: absent before the window opens and after it closes', async () => {
  const before = await getEnrollmentPageData('concordia', {
    db: stubDb(partnerRecord()),
    now: new Date('2025-12-31T23:59:59Z'),
  });
  if (before.kind !== 'ok') throw new Error('expected ok');
  assert.equal(before.sponsorship, null);

  const after = await getEnrollmentPageData('concordia', {
    db: stubDb(partnerRecord()),
    now: new Date('2027-01-01T00:00:01Z'),
  });
  if (after.kind !== 'ok') throw new Error('expected ok');
  assert.equal(after.sponsorship, null);
});

test('sponsorship: absent when the partner does not sponsor enrollment at all', async () => {
  const db = stubDb(partnerRecord({ sponsoredEnrollment: false }));
  const result = await getEnrollmentPageData('concordia', { db, now: NOW });
  if (result.kind !== 'ok') throw new Error('expected ok');
  assert.equal(result.sponsorship, null);
  // The page still renders — it just makes no cost claim.
  assert.equal(result.cards.length, 5);
});

test('sponsorship: seat count is scoped to the sponsorship window', async () => {
  const db = stubDb(partnerRecord({ sponsorshipSeatCap: 50 }), 12);
  const result = await getEnrollmentPageData('concordia', { db, now: NOW });
  if (result.kind !== 'ok') throw new Error('expected ok');

  assert.equal(result.sponsorship?.seatsRemaining, 38);
  assert.deepEqual(db.countArgs, [
    {
      where: {
        sponsoredByPartnerId: 'partner-1',
        enrolledAt: { gte: TERM_START, lte: TERM_END },
      },
    },
  ]);
});

test('sponsorship: a reached seat cap suppresses the banner — no promise we cannot keep', async () => {
  const db = stubDb(partnerRecord({ sponsorshipSeatCap: 25 }), 25);
  const result = await getEnrollmentPageData('concordia', { db, now: NOW });
  if (result.kind !== 'ok') throw new Error('expected ok');

  assert.equal(result.sponsorship, null);
  // The programs still render; only the cost claim goes away.
  assert.equal(result.cards.length, 5);
});
