#!/usr/bin/env npx tsx
/**
 * Create (or repair) the Concordia High School partner record.
 *
 * Idempotent and non-clobbering:
 * - Keyed on slug 'concordia' (CHS_PARTNER_SLUG). The slug MUST equal the
 *   `/enroll/<segment>` in the student link — middleware derives the partner
 *   ref straight from that URL segment and the signup route resolves it
 *   against `Partner.slug`. See lib/partners/chsPartner.ts.
 * - If the partner does not exist, creates it with the full launch facts,
 *   including the sponsorship block that makes the automatic funding stamp
 *   fire (`sponsoredEnrollment` etc. — without these nothing stamps).
 * - If it exists, only fills fields that are missing/empty and ensures the
 *   launch-critical invariants (status 'active', active true, referralCode
 *   'chs2026', partnerType 'high_school'). Never overwrites non-empty
 *   admin-edited contact/notes/sponsorship fields.
 * - If another partner already owns the 'chs2026' referral code, prints an
 *   actionable error instead of crashing with a raw unique-constraint error.
 *
 * SEAT CAP: intentionally left NULL (uncapped). Spend is controlled by the
 * manual Coursera activation gate — an admin flips `courseraEnrollmentApproved`
 * per consented student — so a seat cap here would only add a second, silently
 * failing limiter on top of the real one. See docs/runbooks/CONCORDIA-LAUNCH.md.
 *
 * Run: node scripts/prisma-env.js npx tsx scripts/create-chs-partner.ts
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { getDefaultOrganizationId } from '../lib/tenant/organization';
import {
  CHS_PARTNER_NAME,
  CHS_PARTNER_REFERRAL_CODE,
  CHS_PARTNER_SLUG,
  CHS_SPONSORSHIP_ENDS_AT,
  CHS_PROGRAM_SLUGS,
  CHS_SPONSORSHIP_STARTS_AT,
  CHS_SPONSORSHIP_TERM_LABEL,
} from '../lib/partners/chsPartner';

const prisma = new PrismaClient();

const SLUG = CHS_PARTNER_SLUG;
const REFERRAL_CODE = CHS_PARTNER_REFERRAL_CODE;
const NAME = CHS_PARTNER_NAME;
const PARTNER_TYPE = 'high_school';
const CONTACT_NAME = 'Dr. Marianne Rader';
const CONTACT_EMAIL = 'marianne.rader@chsaustin.org';
const NOTES =
  '2026 CHS pilot — no cost to CHS students in 2026; funding: PARTNER_ORG; ' +
  'under-18 consent collected by school; see docs/runbooks/CONCORDIA-LAUNCH.md';
const TERM_LABEL = '2026';
const HEADLINE = 'Start your career training with Concordia High School';
const BLURB =
  'Career training and certifications offered at no cost to Concordia High School students for 2026 — sponsored through the WorkforceAP–Concordia partnership.';
const DISTRICT = 'Concordia';
const PROGRAM_SLUGS = CHS_PROGRAM_SLUGS;

function sponsorshipWindow(termLabel: string): { startsAt: Date; endsAt: Date } {
  const year = Number(/^(\d{4})/.exec(termLabel)?.[1]) || new Date().getFullYear();
  return {
    startsAt: new Date(Date.UTC(year, 0, 1, 0, 0, 0)),
    endsAt: new Date(Date.UTC(year, 11, 31, 23, 59, 59)),
  };
}

/**
 * Sponsorship block. `isSponsorshipActive()` returns false unless
 * `sponsoredEnrollment` is true and `now` is inside the window, and the signup
 * route gates every funding stamp on it — so without these columns the whole
 * sponsored-enrollment path is inert even for a valid `?ref=chs2026`.
 *
 * `sponsorshipSeatCap` is deliberately absent (null = uncapped): the real
 * spend control is the manual Coursera activation gate, not a soft cap that
 * silently leaves students unfunded.
 */
const SPONSORSHIP = {
  sponsoredEnrollment: true,
  sponsorshipFundingSource: 'PARTNER_ORG',
  sponsorshipTermLabel: CHS_SPONSORSHIP_TERM_LABEL,
  sponsorshipStartsAt: CHS_SPONSORSHIP_STARTS_AT,
  sponsorshipEndsAt: CHS_SPONSORSHIP_ENDS_AT,
  sponsorshipSeatCap: null,
  enrollmentPageEnabled: true,
  schoolDistrict: null,
} satisfies Partial<Prisma.PartnerUncheckedCreateInput>;

function isEmpty(value: string | null | undefined): boolean {
  return value == null || value.trim() === '';
}

function isUniqueConstraintError(e: unknown): e is Prisma.PrismaClientKnownRequestError {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}

async function findReferralCodeOwner(excludeId?: string) {
  const owner = await prisma.partner.findUnique({
    where: { referralCode: REFERRAL_CODE },
    select: { id: true, name: true, slug: true },
  });
  if (owner && owner.id !== excludeId) return owner;
  return null;
}

function referralCodeConflictMessage(owner: { id: string; name: string; slug: string }): string {
  return (
    `ERROR: referral code '${REFERRAL_CODE}' is already owned by another partner: ` +
    `"${owner.name}" (slug: ${owner.slug}, id: ${owner.id}).\n` +
    `Action: in /admin/partners, either change that partner's referral code or remove the ` +
    `conflicting record, then re-run this script. No changes were made to the Concordia partner.`
  );
}

async function main() {
  const existing =
    (await prisma.partner.findUnique({ where: { slug: SLUG } })) ??
    (await prisma.partner.findUnique({ where: { referralCode: REFERRAL_CODE } }));

  if (!existing) {
    // Pre-check the referral code so we can fail with a clear message.
    const owner = await findReferralCodeOwner();
    if (owner) {
      console.error(referralCodeConflictMessage(owner));
      process.exitCode = 1;
      return;
    }

    const organizationId = await getDefaultOrganizationId();
    try {
      const created = await prisma.partner.create({
        data: {
          organizationId,
          name: NAME,
          slug: SLUG,
          referralCode: REFERRAL_CODE,
          partnerType: PARTNER_TYPE,
          status: 'active',
          active: true,
          contactName: CONTACT_NAME,
          contactEmail: CONTACT_EMAIL,
          notes: NOTES,
          ...SPONSORSHIP,
          sponsorshipNotes: 'Sponsored by Concordia High School (2026)',
          enrollmentHeadline: HEADLINE,
          enrollmentBlurb: BLURB,
          schoolDistrict: DISTRICT,
        },
      });
      await syncCatalog(created.id);
      console.log(
        `CREATED partner "${created.name}" — id=${created.id}, slug=${created.slug}, ` +
          `referralCode=${created.referralCode}, status=${created.status}, ` +
          `sponsoredEnrollment=${created.sponsoredEnrollment}, ` +
          `seatCap=${created.sponsorshipSeatCap ?? 'uncapped'}`
      );
    } catch (e) {
      if (isUniqueConstraintError(e)) {
        // Race: another record claimed the slug/referral code between our check and create.
        const owner = await findReferralCodeOwner();
        if (owner) {
          console.error(referralCodeConflictMessage(owner));
          process.exitCode = 1;
          return;
        }
      }
      throw e;
    }
    return;
  }

  // Partner exists: only fill missing/empty fields and enforce launch invariants.
  // Never overwrite non-empty admin-edited contact/notes fields.
  const data: Prisma.PartnerUpdateInput = {};

  if (existing.status !== 'active') data.status = 'active';
  if (!existing.active) data.active = true;
  if (existing.slug !== SLUG) data.slug = SLUG;
  if (existing.referralCode !== REFERRAL_CODE) data.referralCode = REFERRAL_CODE;
  if (existing.partnerType !== PARTNER_TYPE) data.partnerType = PARTNER_TYPE;
  if (isEmpty(existing.name)) data.name = NAME;
  if (isEmpty(existing.contactName)) data.contactName = CONTACT_NAME;
  if (isEmpty(existing.contactEmail)) data.contactEmail = CONTACT_EMAIL;
  if (isEmpty(existing.notes)) data.notes = NOTES;
  if (!existing.sponsoredEnrollment) data.sponsoredEnrollment = true;
  if (!existing.sponsorshipFundingSource) data.sponsorshipFundingSource = 'PARTNER_ORG';
  if (isEmpty(existing.sponsorshipTermLabel)) data.sponsorshipTermLabel = TERM_LABEL;
  if (!existing.sponsorshipStartsAt || !existing.sponsorshipEndsAt) {
    const window = sponsorshipWindow(existing.sponsorshipTermLabel || TERM_LABEL);
    if (!existing.sponsorshipStartsAt) data.sponsorshipStartsAt = window.startsAt;
    if (!existing.sponsorshipEndsAt) data.sponsorshipEndsAt = window.endsAt;
  }
  if (isEmpty(existing.sponsorshipNotes)) data.sponsorshipNotes = 'Sponsored by Concordia High School (2026)';
  if (!existing.enrollmentPageEnabled) data.enrollmentPageEnabled = true;
  if (isEmpty(existing.enrollmentHeadline)) data.enrollmentHeadline = HEADLINE;
  if (isEmpty(existing.enrollmentBlurb)) data.enrollmentBlurb = BLURB;
  if (isEmpty(existing.schoolDistrict)) data.schoolDistrict = DISTRICT;

  await syncCatalog(existing.id);

  // Sponsorship block: fill-if-empty, same non-clobbering rule as above. An
  // admin who narrowed the window or set a seat cap in /admin/partners keeps
  // their values; we only supply what is still unset. `sponsorshipSeatCap`
  // and `schoolDistrict` are intentionally never written here — null is both
  // the intended value and the default, so writing them could only clobber.
  if (!existing.sponsoredEnrollment) data.sponsoredEnrollment = true;
  if (existing.sponsorshipFundingSource == null) {
    data.sponsorshipFundingSource = SPONSORSHIP.sponsorshipFundingSource;
  }
  if (isEmpty(existing.sponsorshipTermLabel)) {
    data.sponsorshipTermLabel = SPONSORSHIP.sponsorshipTermLabel;
  }
  if (existing.sponsorshipStartsAt == null) {
    data.sponsorshipStartsAt = SPONSORSHIP.sponsorshipStartsAt;
  }
  if (existing.sponsorshipEndsAt == null) {
    data.sponsorshipEndsAt = SPONSORSHIP.sponsorshipEndsAt;
  }
  if (!existing.enrollmentPageEnabled) data.enrollmentPageEnabled = true;

  if (Object.keys(data).length === 0) {
    console.log(
      `OK (no changes needed) partner "${existing.name}" — id=${existing.id}, referralCode=${existing.referralCode}, status=${existing.status}`
    );
    return;
  }

  // If we're about to (re)claim the referral code, make sure nobody else owns it.
  if (data.referralCode) {
    const owner = await findReferralCodeOwner(existing.id);
    if (owner) {
      console.error(referralCodeConflictMessage(owner));
      process.exitCode = 1;
      return;
    }
  }

  try {
    const updated = await prisma.partner.update({ where: { id: existing.id }, data });
    console.log(
      `UPDATED partner "${updated.name}" — id=${updated.id}, slug=${updated.slug}, ` +
        `referralCode=${updated.referralCode}, status=${updated.status}, ` +
        `sponsoredEnrollment=${updated.sponsoredEnrollment}, ` +
        `seatCap=${updated.sponsorshipSeatCap ?? 'uncapped'} ` +
        `(fields set: ${Object.keys(data).join(', ')})`
    );
  } catch (e) {
    if (isUniqueConstraintError(e)) {
      const owner = await findReferralCodeOwner(existing.id);
      if (owner) {
        console.error(referralCodeConflictMessage(owner));
        process.exitCode = 1;
        return;
      }
    }
    throw e;
  }
}

async function syncCatalog(partnerId: string): Promise<void> {
  for (const [index, programSlug] of PROGRAM_SLUGS.entries()) {
    await prisma.partnerProgramCatalog.upsert({
      where: { partnerId_programSlug: { partnerId, programSlug } },
      create: { partnerId, programSlug, displayOrder: index, featured: index === 0 },
      update: { displayOrder: index, featured: index === 0 },
    });
  }
  await prisma.partnerProgramCatalog.deleteMany({
    where: { partnerId, programSlug: { notIn: [...PROGRAM_SLUGS] } },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
