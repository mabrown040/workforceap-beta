import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CHS_PARTNER_NAME,
  CHS_PARTNER_REFERRAL_CODE,
  CHS_PARTNER_SLUG,
  CHS_SPONSORSHIP_ENDS_AT,
  CHS_SPONSORSHIP_STARTS_AT,
  CHS_SPONSORSHIP_TERM_LABEL,
  LEGACY_CHS_PARTNER_SLUG,
} from '@/lib/partners/chsPartner';
import {
  CHS_CONTACT_EMAIL,
  CHS_PARTNER_TYPE,
  formatChsProvisionResult,
  provisionChsPartner,
  type ChsPartnerRow,
  type ChsProvisionDb,
} from '@/lib/partners/chsPartnerProvisioning';

/**
 * CUTOVER TEST. The scenario that matters most here is `adopt-and-rename`.
 *
 * Phase A's runbook told the operator to create the production partner at slug
 * `concordia-high-school`. Phase B2 shortened `CHS_PARTNER_SLUG` to
 * `concordia` — the segment in the printed student link — with no backfill.
 * Against that production database the old script found no `concordia` row,
 * took the create path, hit the `chs2026` referral-code unique constraint, and
 * exited 1 having changed nothing. Permanently: every re-run repeated it. The
 * only way out was hand-editing the row in /admin/partners, on launch day,
 * while a school waited on a link that 404'd.
 *
 * These tests are the reason that can't happen again.
 */

const ORG_ID = 'org-1';

function row(overrides: Partial<ChsPartnerRow> = {}): ChsPartnerRow {
  return {
    id: 'partner-chs',
    name: CHS_PARTNER_NAME,
    slug: CHS_PARTNER_SLUG,
    referralCode: CHS_PARTNER_REFERRAL_CODE,
    partnerType: CHS_PARTNER_TYPE,
    status: 'active',
    active: true,
    contactName: 'Dr. Marianne Rader',
    contactEmail: CHS_CONTACT_EMAIL,
    notes: 'existing admin note',
    sponsoredEnrollment: true,
    sponsorshipFundingSource: 'PARTNER_ORG',
    sponsorshipTermLabel: CHS_SPONSORSHIP_TERM_LABEL,
    sponsorshipStartsAt: CHS_SPONSORSHIP_STARTS_AT,
    sponsorshipEndsAt: CHS_SPONSORSHIP_ENDS_AT,
    sponsorshipSeatCap: null,
    enrollmentPageEnabled: true,
    ...overrides,
  };
}

/**
 * In-memory partner table keyed the way Postgres keys it: unique slug, unique
 * referralCode. Records every write so the tests can assert what was — and
 * crucially, what was NOT — touched.
 */
function stubDb(seed: ChsPartnerRow[] = []) {
  const rows = seed.map((r) => ({ ...r }));
  const creates: Record<string, unknown>[] = [];
  const updates: { id: string; data: Record<string, unknown> }[] = [];

  const db: ChsProvisionDb = {
    partner: {
      async findUnique(args) {
        const where = args.where;
        const found =
          'slug' in where
            ? rows.find((r) => r.slug === where.slug)
            : rows.find((r) => r.referralCode === where.referralCode);
        // Copy, like Prisma: the caller must not hold a live handle on the row.
        return found ? { ...found } : null;
      },
      async create(args) {
        creates.push(args.data);
        const created = { ...(args.data as unknown as ChsPartnerRow), id: 'partner-new' };
        rows.push(created);
        return created;
      },
      async update(args) {
        updates.push({ id: args.where.id, data: args.data });
        const target = rows.find((r) => r.id === args.where.id);
        if (!target) throw new Error(`no such partner: ${args.where.id}`);
        Object.assign(target, args.data);
        return { ...target };
      },
    },
  };

  return { db, rows, creates, updates };
}

function deps(stub: ReturnType<typeof stubDb>) {
  return { db: stub.db, resolveOrganizationId: async () => ORG_ID };
}

// --- 1. fresh create ---------------------------------------------------------

test('create: an empty database gets the full launch facts', async () => {
  const stub = stubDb([]);
  const result = await provisionChsPartner(deps(stub));

  assert.equal(result.kind, 'created');
  assert.equal(stub.creates.length, 1);
  const data = stub.creates[0];
  assert.equal(data.organizationId, ORG_ID);
  assert.equal(data.slug, CHS_PARTNER_SLUG);
  assert.equal(data.referralCode, CHS_PARTNER_REFERRAL_CODE);
  assert.equal(data.partnerType, CHS_PARTNER_TYPE);
  assert.equal(data.status, 'active');
  assert.equal(data.active, true);
  // Without these the funding stamp is inert and /enroll/concordia 404s.
  assert.equal(data.sponsoredEnrollment, true);
  assert.equal(data.enrollmentPageEnabled, true);
  assert.equal(data.sponsorshipTermLabel, CHS_SPONSORSHIP_TERM_LABEL);
  // Uncapped: the Coursera activation gate is the real spend control.
  assert.equal(data.sponsorshipSeatCap, null);
});

// --- 2. adopt and rename (the cutover path) ----------------------------------

test('adopt: a legacy concordia-high-school row owning chs2026 is RENAMED, not duplicated', async () => {
  const legacy = row({
    id: 'partner-legacy',
    slug: LEGACY_CHS_PARTNER_SLUG,
    // A Phase A row predates the Phase B1 sponsorship columns entirely.
    sponsoredEnrollment: false,
    sponsorshipFundingSource: null,
    sponsorshipTermLabel: null,
    sponsorshipStartsAt: null,
    sponsorshipEndsAt: null,
    enrollmentPageEnabled: false,
  });
  const stub = stubDb([legacy]);

  const result = await provisionChsPartner(deps(stub));

  assert.equal(result.kind, 'adopted');
  if (result.kind !== 'adopted') return;
  assert.equal(result.previousSlug, LEGACY_CHS_PARTNER_SLUG);
  assert.equal(result.partner.id, 'partner-legacy');
  assert.equal(result.partner.slug, CHS_PARTNER_SLUG);

  // Renamed in place — exactly one row, no second partner created.
  assert.equal(stub.creates.length, 0);
  assert.equal(stub.rows.length, 1);

  // …and the launch invariants were applied on the way through.
  assert.equal(result.partner.sponsoredEnrollment, true);
  assert.equal(result.partner.enrollmentPageEnabled, true);
  assert.equal(result.partner.sponsorshipTermLabel, CHS_SPONSORSHIP_TERM_LABEL);
  assert.deepEqual(result.partner.sponsorshipStartsAt, CHS_SPONSORSHIP_STARTS_AT);
  assert.deepEqual(result.partner.sponsorshipEndsAt, CHS_SPONSORSHIP_ENDS_AT);

  // The operator sees an unmistakable line.
  assert.match(
    formatChsProvisionResult(result),
    /^ADOPTED \(renamed concordia-high-school → concordia\)/
  );
});

test('adopt: keeps admin-edited values, fill-if-empty only', async () => {
  const stub = stubDb([
    row({
      id: 'partner-legacy',
      slug: LEGACY_CHS_PARTNER_SLUG,
      contactName: 'Counselor Someone Else',
      notes: 'do not clobber me',
      // An admin narrowed the window in /admin/partners.
      sponsorshipEndsAt: new Date('2026-06-30T23:59:59Z'),
      sponsorshipSeatCap: 40,
      enrollmentPageEnabled: false,
    }),
  ]);

  const result = await provisionChsPartner(deps(stub));
  assert.equal(result.kind, 'adopted');
  if (result.kind !== 'adopted') return;

  assert.equal(result.partner.contactName, 'Counselor Someone Else');
  assert.equal(result.partner.notes, 'do not clobber me');
  assert.deepEqual(result.partner.sponsorshipEndsAt, new Date('2026-06-30T23:59:59Z'));
  // Never written, so an admin's cap survives.
  assert.equal(result.partner.sponsorshipSeatCap, 40);
  // But the page switch is not an opinion — off means the feature is off.
  assert.equal(result.partner.enrollmentPageEnabled, true);
  assert.deepEqual(result.fields.sort(), ['enrollmentPageEnabled', 'slug']);
});

test('adopt: re-running after an adoption is a no-op (idempotent cutover)', async () => {
  const stub = stubDb([
    row({ id: 'partner-legacy', slug: LEGACY_CHS_PARTNER_SLUG, enrollmentPageEnabled: false }),
  ]);

  const first = await provisionChsPartner(deps(stub));
  assert.equal(first.kind, 'adopted');

  const second = await provisionChsPartner(deps(stub));
  assert.equal(second.kind, 'unchanged');
  assert.equal(stub.updates.length, 1, 'second run must write nothing');
  assert.equal(stub.creates.length, 0);
});

test('adopt: a legacy-slug partner that does NOT own chs2026 is left alone', async () => {
  // Some other school that happens to sit at the legacy slug. Renaming it
  // would steal a stranger's partner row.
  const stranger = row({
    id: 'partner-stranger',
    name: 'Concordia Lutheran',
    slug: LEGACY_CHS_PARTNER_SLUG,
    referralCode: 'clhs-2027',
  });
  const stub = stubDb([stranger]);

  const result = await provisionChsPartner(deps(stub));

  // chs2026 is unclaimed, so we create our own row and leave theirs untouched.
  assert.equal(result.kind, 'created');
  assert.equal(stub.updates.length, 0);
  assert.equal(stub.rows.find((r) => r.id === 'partner-stranger')?.slug, LEGACY_CHS_PARTNER_SLUG);
});

// --- 3. already correct ------------------------------------------------------

test('no-op: an already-correct partner reports unchanged and writes nothing', async () => {
  const stub = stubDb([row()]);
  const result = await provisionChsPartner(deps(stub));

  assert.equal(result.kind, 'unchanged');
  assert.equal(stub.updates.length, 0);
  assert.equal(stub.creates.length, 0);
  assert.match(formatChsProvisionResult(result), /^OK \(no changes needed\)/);
});

test('repair: an existing concordia row gets the invariants re-asserted', async () => {
  const stub = stubDb([
    row({ status: 'pending_approval', active: false, enrollmentPageEnabled: false }),
  ]);

  const result = await provisionChsPartner(deps(stub));
  assert.equal(result.kind, 'updated');
  if (result.kind !== 'updated') return;
  assert.equal(result.partner.status, 'active');
  assert.equal(result.partner.active, true);
  assert.equal(result.partner.enrollmentPageEnabled, true);
  assert.deepEqual(result.fields.sort(), ['active', 'enrollmentPageEnabled', 'status']);
});

// --- 4. genuine third-party conflict ----------------------------------------

test('conflict: another partner owning chs2026 errors and changes nothing', async () => {
  const stub = stubDb([
    row({
      id: 'partner-other',
      name: 'Riverside Career Academy',
      slug: 'riverside',
      referralCode: CHS_PARTNER_REFERRAL_CODE,
    }),
  ]);

  const result = await provisionChsPartner(deps(stub));

  assert.equal(result.kind, 'conflict');
  if (result.kind !== 'conflict') return;
  assert.equal(result.owner.name, 'Riverside Career Academy');
  assert.equal(result.owner.slug, 'riverside');
  assert.equal(stub.creates.length, 0, 'must not create while the code is taken');
  assert.equal(stub.updates.length, 0, 'must not touch the other partner');
  assert.match(formatChsProvisionResult(result), /^ERROR: referral code 'chs2026' is already owned/);
  assert.match(formatChsProvisionResult(result), /No changes were made to the Concordia partner/);
});

test('conflict: an existing concordia row cannot steal chs2026 from someone else', async () => {
  const stub = stubDb([
    // Ours, but with the wrong code — so the update wants to claim chs2026…
    row({ id: 'partner-chs', referralCode: 'chs-old' }),
    // …which somebody else already holds.
    row({ id: 'partner-other', name: 'Riverside', slug: 'riverside' }),
  ]);

  const result = await provisionChsPartner(deps(stub));
  assert.equal(result.kind, 'conflict');
  assert.equal(stub.updates.length, 0);
});

test('output: every non-conflict line reports enrollmentPageEnabled', async () => {
  // The runbook's expected-output checklist keys off this — a launch with the
  // flag false is a 404 for every student holding the link.
  for (const seed of [[], [row({ enrollmentPageEnabled: false })], [row()]]) {
    const result = await provisionChsPartner(deps(stubDb(seed)));
    assert.match(formatChsProvisionResult(result), /enrollmentPageEnabled=true/);
  }
});
