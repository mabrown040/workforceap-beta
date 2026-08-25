#!/usr/bin/env npx tsx
/**
 * Ensure CHS partner admin contact + enrollment notifications for Dr. Marianne Rader.
 *
 * Idempotent companion to scripts/create-chs-partner.ts. Run both in production
 * before the school email goes out:
 *
 *   node scripts/prisma-env.js npx tsx scripts/create-chs-partner.ts
 *   node scripts/prisma-env.js npx tsx scripts/invite-chs-partner-admin.ts
 *
 * - Sets contactEmail to marianne.rader@chsaustin.org (Mike explicitly requested;
 *   always applied for CHS, not fill-if-empty)
 * - Ensures notifyOnEnrollment=true
 * - Optionally links a PartnerUser when Supabase is configured; otherwise prints
 *   manual portal invite steps (POST /api/admin/partners/[id]/invite from admin UI)
 */

import { PrismaClient } from '@prisma/client';
import {
  CHS_PARTNER_CONTACT_EMAIL,
  CHS_PARTNER_NAME,
  CHS_PARTNER_SLUG,
} from '../lib/partners/chsPartner';

const CONTACT_NAME = 'Dr. Marianne Rader';
const INVITE_EMAIL = CHS_PARTNER_CONTACT_EMAIL;

const prisma = new PrismaClient();

async function main() {
  const partner = await prisma.partner.findUnique({
    where: { slug: CHS_PARTNER_SLUG },
    select: {
      id: true,
      name: true,
      slug: true,
      contactEmail: true,
      contactName: true,
      notifyOnEnrollment: true,
    },
  });

  if (!partner) {
    console.error(
      `ERROR: Partner slug "${CHS_PARTNER_SLUG}" not found. Run scripts/create-chs-partner.ts first.`,
    );
    process.exitCode = 1;
    return;
  }

  const updates: {
    contactEmail?: string;
    contactName?: string;
    notifyOnEnrollment?: boolean;
  } = {};

  if (partner.contactEmail?.trim().toLowerCase() !== INVITE_EMAIL.toLowerCase()) {
    updates.contactEmail = INVITE_EMAIL;
  }
  if (!partner.contactName?.trim()) {
    updates.contactName = CONTACT_NAME;
  }
  if (!partner.notifyOnEnrollment) {
    updates.notifyOnEnrollment = true;
  }

  if (Object.keys(updates).length > 0) {
    const updated = await prisma.partner.update({
      where: { id: partner.id },
      data: updates,
    });
    console.log(
      `UPDATED partner "${updated.name}" (id=${updated.id}) — ` +
        `contactEmail=${updated.contactEmail}, notifyOnEnrollment=${updated.notifyOnEnrollment} ` +
        `(fields: ${Object.keys(updates).join(', ')})`,
    );
  } else {
    console.log(
      `OK (no changes needed) partner "${partner.name}" — contactEmail=${partner.contactEmail}, ` +
        `notifyOnEnrollment=${partner.notifyOnEnrollment}`,
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl?.trim() || !serviceKey?.trim()) {
    console.log('');
    console.log('Supabase not configured in this environment — skip automatic portal invite.');
    console.log('Manual steps for production (Mike / admin):');
    console.log(`  1. Open /admin/partners and find "${CHS_PARTNER_NAME}" (slug: ${CHS_PARTNER_SLUG})`);
    console.log(`  2. Click Invite and send portal access to ${INVITE_EMAIL}`);
    console.log('  3. Dr. Rader will receive enrollment ack emails at that address on each student signup');
    console.log('     (sendSchoolEnrollmentPartnerAckEmail when notifyOnEnrollment=true).');
    return;
  }

  // Supabase present: check if partner user already linked
  const existingLink = await prisma.partnerUser.findFirst({
    where: {
      partnerId: partner.id,
      user: { email: { equals: INVITE_EMAIL, mode: 'insensitive' } },
    },
    select: { id: true, userId: true },
  });

  if (existingLink) {
    console.log(`Partner portal user already linked for ${INVITE_EMAIL} (userId=${existingLink.userId}).`);
    return;
  }

  console.log('');
  console.log(`No PartnerUser link found for ${INVITE_EMAIL}.`);
  console.log('Invite via admin UI (recommended — sends branded invite email):');
  console.log(`  POST /api/admin/partners/${partner.id}/invite  { "email": "${INVITE_EMAIL}" }`);
  console.log(`  Or: /admin/partners → "${CHS_PARTNER_NAME}" → Invite → ${INVITE_EMAIL}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
