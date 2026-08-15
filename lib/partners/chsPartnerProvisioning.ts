/**
 * Provisioning rules for the Concordia High School partner row.
 *
 * Extracted from `scripts/create-chs-partner.ts` so the decision logic —
 * create vs adopt-and-rename vs fill-in vs refuse — is unit-testable without a
 * database. The script keeps the Prisma client, the org lookup and the console
 * output; everything that can go wrong in production lives here.
 *
 * Deliberately dependency-light (no `@prisma/client`, no `server-only`, no
 * `next/*`): callers pass a narrow `db` seam, so the tests are a few lines of
 * hand-written stubs.
 *
 * FOUR PATHS, and the third one is why this module exists:
 *
 *  1. CREATE      — no CHS partner anywhere. Write the full launch facts.
 *  2. UPDATE      — a `concordia` partner exists. Fill only what is empty and
 *                   re-assert the launch invariants. Never clobber an admin's
 *                   edits.
 *  3. ADOPT       — no `concordia` partner, but a `concordia-high-school` one
 *                   owns referral code `chs2026`. That is the row Phase A's
 *                   runbook told operators to create in production, before
 *                   Phase B2 shortened the slug to match the printed student
 *                   link. Rename it in place and apply the invariants.
 *
 *                   Without this path the script found no `concordia` row,
 *                   went down the create path, hit the `chs2026` unique
 *                   constraint, and exited 1 having changed nothing — leaving
 *                   production permanently at the wrong slug with an
 *                   enrollment URL that 404s and no remedy but manual admin
 *                   surgery on launch day.
 *  4. CONFLICT    — `chs2026` belongs to a partner that is genuinely not ours.
 *                   Refuse and say who owns it. Never steal a referral code.
 *
 * Every path is idempotent: running twice in a row makes no second change.
 */

import {
  CHS_PARTNER_NAME,
  CHS_PARTNER_REFERRAL_CODE,
  CHS_PARTNER_SLUG,
  CHS_SPONSORSHIP_ENDS_AT,
  CHS_SPONSORSHIP_STARTS_AT,
  CHS_SPONSORSHIP_TERM_LABEL,
  LEGACY_CHS_PARTNER_SLUG,
} from '@/lib/partners/chsPartner';

export const CHS_PARTNER_TYPE = 'high_school';
export const CHS_CONTACT_NAME = 'Dr. Marianne Rader';
export const CHS_CONTACT_EMAIL = 'marianne.rader@chsaustin.org';
export const CHS_NOTES =
  '2026 CHS pilot — no cost to CHS students in 2026; funding: PARTNER_ORG; ' +
  'under-18 consent collected by school; see docs/runbooks/CONCORDIA-LAUNCH.md';

/**
 * Sponsorship block. `isSponsorshipActive()` returns false unless
 * `sponsoredEnrollment` is true and `now` is inside the window, and the signup
 * route gates every funding stamp on it — so without these columns the whole
 * sponsored-enrollment path is inert even for a valid `?ref=chs2026`.
 *
 * `enrollmentPageEnabled` is part of the block for the same reason: the
 * dynamic `/enroll/concordia` page 404s without it.
 *
 * `sponsorshipSeatCap` is deliberately absent (null = uncapped): the real
 * spend control is the manual Coursera activation gate, not a soft cap that
 * silently leaves students unfunded.
 */
export const CHS_SPONSORSHIP = {
  sponsoredEnrollment: true,
  sponsorshipFundingSource: 'PARTNER_ORG',
  sponsorshipTermLabel: CHS_SPONSORSHIP_TERM_LABEL,
  sponsorshipStartsAt: CHS_SPONSORSHIP_STARTS_AT,
  sponsorshipEndsAt: CHS_SPONSORSHIP_ENDS_AT,
  enrollmentPageEnabled: true,
} as const;

/** The `Partner` columns provisioning reads and writes. */
export type ChsPartnerRow = {
  id: string;
  name: string;
  slug: string;
  referralCode: string;
  partnerType: string;
  status: string;
  active: boolean;
  contactName: string | null;
  contactEmail: string | null;
  notes: string | null;
  sponsoredEnrollment: boolean;
  sponsorshipFundingSource: string | null;
  sponsorshipTermLabel: string | null;
  sponsorshipStartsAt: Date | null;
  sponsorshipEndsAt: Date | null;
  sponsorshipSeatCap: number | null;
  enrollmentPageEnabled: boolean;
};

/** Identifying fields of whoever currently owns the referral code. */
export type ReferralCodeOwner = { id: string; name: string; slug: string };

/** Narrow Prisma seam, mirroring `EnrollmentPageDb` in `enrollmentPage.ts`. */
export type ChsProvisionDb = {
  partner: {
    findUnique(args: {
      where: { slug: string } | { referralCode: string };
    }): Promise<ChsPartnerRow | null>;
    create(args: { data: Record<string, unknown> }): Promise<ChsPartnerRow>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<ChsPartnerRow>;
  };
};

export type ChsProvisionDeps = {
  db: ChsProvisionDb;
  /** Resolves the org id for a fresh create. Only called on the create path. */
  resolveOrganizationId: () => Promise<string>;
};

/**
 * Outcome of one run. `fields` lists exactly what was written so the script can
 * print it and an operator can see that nothing they edited was clobbered.
 */
export type ChsProvisionResult =
  | { kind: 'created'; partner: ChsPartnerRow }
  | { kind: 'adopted'; partner: ChsPartnerRow; previousSlug: string; fields: string[] }
  | { kind: 'updated'; partner: ChsPartnerRow; fields: string[] }
  | { kind: 'unchanged'; partner: ChsPartnerRow }
  | { kind: 'conflict'; owner: ReferralCodeOwner };

function isEmpty(value: string | null | undefined): boolean {
  return value == null || value.trim() === '';
}

/**
 * Prisma's unique-constraint code, duck-typed. Checking `.code` rather than
 * `instanceof Prisma.PrismaClientKnownRequestError` keeps `@prisma/client` out
 * of this module; the script that owns the client still sees the same error.
 */
export function isUniqueConstraintError(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: unknown }).code === 'P2002';
}

/**
 * The launch invariants, expressed as "what still needs writing".
 *
 * FILL-IF-EMPTY for contact/notes and the sponsorship window: an admin who
 * narrowed the term or corrected the counselor's email in /admin/partners keeps
 * their values. HARD-SET for the four things the launch cannot work without —
 * status, active, referralCode, partnerType — plus `sponsoredEnrollment` and
 * `enrollmentPageEnabled`, because a false there is not an opinion, it is the
 * feature being off.
 *
 * `sponsorshipSeatCap` and `schoolDistrict` are never written: null is both the
 * intended value and the column default, so writing them could only clobber.
 */
export function buildChsInvariantUpdate(existing: ChsPartnerRow): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  if (existing.status !== 'active') data.status = 'active';
  if (!existing.active) data.active = true;
  if (existing.referralCode !== CHS_PARTNER_REFERRAL_CODE) {
    data.referralCode = CHS_PARTNER_REFERRAL_CODE;
  }
  if (existing.partnerType !== CHS_PARTNER_TYPE) data.partnerType = CHS_PARTNER_TYPE;
  if (isEmpty(existing.name)) data.name = CHS_PARTNER_NAME;
  if (isEmpty(existing.contactName)) data.contactName = CHS_CONTACT_NAME;
  if (isEmpty(existing.contactEmail)) data.contactEmail = CHS_CONTACT_EMAIL;
  if (isEmpty(existing.notes)) data.notes = CHS_NOTES;

  if (!existing.sponsoredEnrollment) data.sponsoredEnrollment = true;
  if (existing.sponsorshipFundingSource == null) {
    data.sponsorshipFundingSource = CHS_SPONSORSHIP.sponsorshipFundingSource;
  }
  if (isEmpty(existing.sponsorshipTermLabel)) {
    data.sponsorshipTermLabel = CHS_SPONSORSHIP.sponsorshipTermLabel;
  }
  if (existing.sponsorshipStartsAt == null) {
    data.sponsorshipStartsAt = CHS_SPONSORSHIP.sponsorshipStartsAt;
  }
  if (existing.sponsorshipEndsAt == null) {
    data.sponsorshipEndsAt = CHS_SPONSORSHIP.sponsorshipEndsAt;
  }
  if (!existing.enrollmentPageEnabled) data.enrollmentPageEnabled = true;

  return data;
}

/** Who owns `chs2026` right now, ignoring `excludeId` (usually our own row). */
async function findReferralCodeOwner(
  db: ChsProvisionDb,
  excludeId?: string
): Promise<ReferralCodeOwner | null> {
  const owner = await db.partner.findUnique({
    where: { referralCode: CHS_PARTNER_REFERRAL_CODE },
  });
  if (owner && owner.id !== excludeId) {
    return { id: owner.id, name: owner.name, slug: owner.slug };
  }
  return null;
}

/** Human-readable refusal for the conflict path. */
export function referralCodeConflictMessage(owner: ReferralCodeOwner): string {
  return (
    `ERROR: referral code '${CHS_PARTNER_REFERRAL_CODE}' is already owned by another partner: ` +
    `"${owner.name}" (slug: ${owner.slug}, id: ${owner.id}).\n` +
    `Action: in /admin/partners, either change that partner's referral code or remove the ` +
    `conflicting record, then re-run this script. No changes were made to the Concordia partner.`
  );
}

/** Create the partner from scratch, refusing if the referral code is taken. */
async function createChsPartner(deps: ChsProvisionDeps): Promise<ChsProvisionResult> {
  const { db } = deps;

  // Pre-check the referral code so we can fail with a clear message.
  const owner = await findReferralCodeOwner(db);
  if (owner) return { kind: 'conflict', owner };

  const organizationId = await deps.resolveOrganizationId();
  try {
    const partner = await db.partner.create({
      data: {
        organizationId,
        name: CHS_PARTNER_NAME,
        slug: CHS_PARTNER_SLUG,
        referralCode: CHS_PARTNER_REFERRAL_CODE,
        partnerType: CHS_PARTNER_TYPE,
        status: 'active',
        active: true,
        contactName: CHS_CONTACT_NAME,
        contactEmail: CHS_CONTACT_EMAIL,
        notes: CHS_NOTES,
        ...CHS_SPONSORSHIP,
        sponsorshipSeatCap: null,
        schoolDistrict: null,
      },
    });
    return { kind: 'created', partner };
  } catch (e) {
    if (isUniqueConstraintError(e)) {
      // Race: something claimed the slug/referral code between check and create.
      const raceOwner = await findReferralCodeOwner(db);
      if (raceOwner) return { kind: 'conflict', owner: raceOwner };
    }
    throw e;
  }
}

/** Apply a computed diff, re-checking the referral code if we are claiming it. */
async function applyUpdate(
  db: ChsProvisionDb,
  existing: ChsPartnerRow,
  data: Record<string, unknown>
): Promise<{ partner: ChsPartnerRow } | { conflict: ReferralCodeOwner }> {
  if (data.referralCode) {
    const owner = await findReferralCodeOwner(db, existing.id);
    if (owner) return { conflict: owner };
  }
  try {
    return { partner: await db.partner.update({ where: { id: existing.id }, data }) };
  } catch (e) {
    if (isUniqueConstraintError(e)) {
      const owner = await findReferralCodeOwner(db, existing.id);
      if (owner) return { conflict: owner };
    }
    throw e;
  }
}

/**
 * Create, adopt, repair or refuse — see the module header for the four paths.
 * Safe to re-run; a second run against a correct row reports `unchanged`.
 */
export async function provisionChsPartner(
  deps: ChsProvisionDeps
): Promise<ChsProvisionResult> {
  const { db } = deps;
  const existing = await db.partner.findUnique({ where: { slug: CHS_PARTNER_SLUG } });

  if (!existing) {
    // ADOPT-AND-RENAME. Only when the legacy row is unambiguously ours, which
    // means it owns `chs2026`. A `concordia-high-school` partner with some
    // other referral code is somebody else's row and must not be renamed out
    // from under them — fall through and let the create path decide.
    const legacy = await db.partner.findUnique({ where: { slug: LEGACY_CHS_PARTNER_SLUG } });
    if (legacy && legacy.referralCode === CHS_PARTNER_REFERRAL_CODE) {
      // Read the old slug BEFORE the write — that string is the whole point of
      // the `ADOPTED (renamed X → Y)` line an operator reads on launch day.
      const previousSlug = legacy.slug;
      const data = { slug: CHS_PARTNER_SLUG, ...buildChsInvariantUpdate(legacy) };
      const result = await applyUpdate(db, legacy, data);
      if ('conflict' in result) return { kind: 'conflict', owner: result.conflict };
      return {
        kind: 'adopted',
        partner: result.partner,
        previousSlug,
        fields: Object.keys(data),
      };
    }

    return createChsPartner(deps);
  }

  const data = buildChsInvariantUpdate(existing);
  if (Object.keys(data).length === 0) return { kind: 'unchanged', partner: existing };

  const result = await applyUpdate(db, existing, data);
  if ('conflict' in result) return { kind: 'conflict', owner: result.conflict };
  return { kind: 'updated', partner: result.partner, fields: Object.keys(data) };
}

/** One-line operator summary. The `ADOPTED` line is the one to look for on launch day. */
export function formatChsProvisionResult(result: ChsProvisionResult): string {
  if (result.kind === 'conflict') return referralCodeConflictMessage(result.owner);

  const p = result.partner;
  const facts =
    `id=${p.id}, slug=${p.slug}, referralCode=${p.referralCode}, status=${p.status}, ` +
    `sponsoredEnrollment=${p.sponsoredEnrollment}, ` +
    `enrollmentPageEnabled=${p.enrollmentPageEnabled}, ` +
    `seatCap=${p.sponsorshipSeatCap ?? 'uncapped'}`;

  switch (result.kind) {
    case 'created':
      return `CREATED partner "${p.name}" — ${facts}`;
    case 'adopted':
      return (
        `ADOPTED (renamed ${result.previousSlug} → ${CHS_PARTNER_SLUG}) partner "${p.name}" — ` +
        `${facts} (fields set: ${result.fields.join(', ')})`
      );
    case 'updated':
      return `UPDATED partner "${p.name}" — ${facts} (fields set: ${result.fields.join(', ')})`;
    case 'unchanged':
      return `OK (no changes needed) partner "${p.name}" — ${facts}`;
  }
}
