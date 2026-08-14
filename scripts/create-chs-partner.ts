#!/usr/bin/env npx tsx
/**
 * Create (or repair) the Concordia High School partner record.
 *
 * Idempotent and non-clobbering:
 * - Keyed on slug 'concordia-high-school'.
 * - If the partner does not exist, creates it with the full launch facts.
 * - If it exists, only fills fields that are missing/empty and ensures the
 *   launch-critical invariants (status 'active', active true, referralCode
 *   'chs2026', partnerType 'high_school'). Never overwrites non-empty
 *   admin-edited contact/notes fields.
 * - If another partner already owns the 'chs2026' referral code, prints an
 *   actionable error instead of crashing with a raw unique-constraint error.
 *
 * Run: node scripts/prisma-env.js npx tsx scripts/create-chs-partner.ts
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { getDefaultOrganizationId } from '../lib/tenant/organization';

const prisma = new PrismaClient();

const SLUG = 'concordia-high-school';
const REFERRAL_CODE = 'chs2026';
const NAME = 'Concordia High School';
const PARTNER_TYPE = 'high_school';
const CONTACT_NAME = 'Dr. Marianne Rader';
const CONTACT_EMAIL = 'marianne.rader@chsaustin.org';
const NOTES =
  '2026 CHS pilot — no cost to CHS students in 2026; funding: PARTNER_ORG; ' +
  'under-18 consent collected by school; see docs/runbooks/CONCORDIA-LAUNCH.md';

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
  const existing = await prisma.partner.findUnique({ where: { slug: SLUG } });

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
        },
      });
      console.log(
        `CREATED partner "${created.name}" — id=${created.id}, referralCode=${created.referralCode}, status=${created.status}`
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
  if (existing.referralCode !== REFERRAL_CODE) data.referralCode = REFERRAL_CODE;
  if (existing.partnerType !== PARTNER_TYPE) data.partnerType = PARTNER_TYPE;
  if (isEmpty(existing.name)) data.name = NAME;
  if (isEmpty(existing.contactName)) data.contactName = CONTACT_NAME;
  if (isEmpty(existing.contactEmail)) data.contactEmail = CONTACT_EMAIL;
  if (isEmpty(existing.notes)) data.notes = NOTES;

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
      `UPDATED partner "${updated.name}" — id=${updated.id}, referralCode=${updated.referralCode}, status=${updated.status} (fields set: ${Object.keys(data).join(', ')})`
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

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
