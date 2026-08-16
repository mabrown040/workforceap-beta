#!/usr/bin/env npx tsx
/**
 * Stamp PARTNER_ORG funding onto Concordia High School members' primary enrollments.
 *
 * Idempotent bridge script (until Phase B automates funding attribution):
 * - Finds the CHS partner by slug 'concordia' (CHS_PARTNER_SLUG).
 * - For every user with an Application whose referralPartnerId is that partner,
 *   sets their PRIMARY CourseEnrollment (isPrimary = true):
 *     fundingSource = PARTNER_ORG
 *     fundingNotes  = 'Sponsored by Concordia High School (2026)'
 *   ONLY where fundingSource is currently null. Non-null fundingSource values
 *   (admin- or grant-set) are never touched.
 *
 * Run: node scripts/prisma-env.js npx tsx scripts/stamp-chs-funding.ts
 */

import { PrismaClient } from '@prisma/client';
import {
  CHS_PARTNER_NAME,
  CHS_PARTNER_SLUG,
  CHS_SPONSORSHIP_TERM_LABEL,
} from '../lib/partners/chsPartner';

const prisma = new PrismaClient();

const SLUG = CHS_PARTNER_SLUG;
const FUNDING_NOTES = `Sponsored by ${CHS_PARTNER_NAME} (${CHS_SPONSORSHIP_TERM_LABEL})`;

async function main() {
  const partner = await prisma.partner.findUnique({
    where: { slug: SLUG },
    select: { id: true, name: true },
  });
  if (!partner) {
    console.error(
      `ERROR: partner with slug '${SLUG}' not found. ` +
        'Run scripts/create-chs-partner.ts first (see docs/runbooks/CONCORDIA-LAUNCH.md).'
    );
    process.exitCode = 1;
    return;
  }

  const applications = await prisma.application.findMany({
    where: { referralPartnerId: partner.id },
    select: { userId: true },
  });
  const userIds = Array.from(new Set(applications.map((a) => a.userId)));

  let updated = 0;
  let skippedAlreadySet = 0;
  let noPrimaryEnrollment = 0;

  for (const userId of userIds) {
    const primary = await prisma.courseEnrollment.findFirst({
      where: { userId, isPrimary: true },
      select: { id: true, fundingSource: true },
    });

    if (!primary) {
      noPrimaryEnrollment++;
      continue;
    }
    if (primary.fundingSource !== null) {
      skippedAlreadySet++;
      continue;
    }

    // Guard the write on fundingSource still being null (safe under concurrency).
    const result = await prisma.courseEnrollment.updateMany({
      where: { id: primary.id, fundingSource: null },
      data: { fundingSource: 'PARTNER_ORG', fundingNotes: FUNDING_NOTES },
    });
    if (result.count === 1) {
      updated++;
    } else {
      skippedAlreadySet++;
    }
  }

  console.log(`Partner: ${partner.name} (${partner.id})`);
  console.log(`Members matched (via Application.referralPartnerId): ${userIds.length}`);
  console.log(`Primary enrollments updated to PARTNER_ORG: ${updated}`);
  console.log(`Skipped (fundingSource already set): ${skippedAlreadySet}`);
  console.log(`No primary enrollment yet: ${noPrimaryEnrollment}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
