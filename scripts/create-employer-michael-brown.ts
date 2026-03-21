#!/usr/bin/env npx tsx
/**
 * Create employer record and user for Michael Brown (Techvera).
 * - Company: Techvera
 * - Email: michael.brown@workforceap.org
 * - Phone: (512) 777-1808
 *
 * If user exists: creates Employer record and links. If not: creates user via Supabase + Employer.
 * Run: node scripts/prisma-env.js npx tsx scripts/create-employer-michael-brown.ts
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();
const EMAIL = 'michael.brown@workforceap.org';
const FULL_NAME = 'Michael Brown';
const PHONE = '(512) 777-1808';
const COMPANY_NAME = 'Techvera';

async function main() {
  // Ensure employer role exists
  await prisma.role.upsert({
    where: { name: 'employer' },
    create: { name: 'employer' },
    update: {},
  });

  let userId: string;

  const existingUser = await prisma.user.findUnique({
    where: { email: EMAIL },
    include: { profile: true, employer: true, userRoles: { include: { role: true } } },
  });

  if (existingUser) {
    console.log('User exists:', existingUser.email);
    userId = existingUser.id;

    // Update user details if needed
    await prisma.user.update({
      where: { id: userId },
      data: { fullName: FULL_NAME, phone: PHONE },
    });

    if (existingUser.employer) {
      await prisma.employer.update({
        where: { id: existingUser.employer.id },
        data: {
          companyName: COMPANY_NAME,
          contactName: FULL_NAME,
          contactEmail: EMAIL,
          contactPhone: PHONE,
        },
      });
      console.log('Updated existing employer record');
    }
  } else {
    // Create user via Supabase Auth
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required to create new user. ' +
          'Alternatively, create the user via Admin > Members first, then re-run this script.'
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const tempPassword = `WfAP${Date.now().toString(36)}!`;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: EMAIL,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: FULL_NAME, phone: PHONE },
    });

    if (authError) {
      if (authError.message.includes('already') || authError.code === 'user_already_exists') {
        throw new Error(
          `User ${EMAIL} already exists in Supabase Auth but not in our DB. ` +
            'Check for sync issues or create manually.'
        );
      }
      throw new Error(`Supabase createUser failed: ${authError.message}`);
    }

    userId = authData.user!.id;
    console.log('Created user in Supabase Auth:', EMAIL);

    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id: userId,
          email: EMAIL,
          fullName: FULL_NAME,
          phone: PHONE,
        },
      });
      await tx.profile.create({
        data: {
          userId,
          profilePhone: PHONE,
          role: 'member',
        },
      });
    });
    console.log('Created user and profile in database');

    await supabase.auth.resetPasswordForEmail(EMAIL, { redirectTo: `${siteUrl}/dashboard` });
    console.log('Password reset email sent');
  }

  // Create or update employer record
  const employer = await prisma.employer.upsert({
    where: { userId },
    update: {
      companyName: COMPANY_NAME,
      contactName: FULL_NAME,
      contactEmail: EMAIL,
      contactPhone: PHONE,
      status: 'active',
    },
    create: {
      userId,
      companyName: COMPANY_NAME,
      contactName: FULL_NAME,
      contactEmail: EMAIL,
      contactPhone: PHONE,
      status: 'active',
    },
  });
  console.log('Employer record:', employer.companyName, '-', employer.id);

  // Assign employer role via UserRole
  const employerRole = await prisma.role.findUnique({ where: { name: 'employer' } });
  if (employerRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: employerRole.id } },
      create: { userId, roleId: employerRole.id },
      update: {},
    });
    console.log('Assigned employer role');
  }

  console.log('Done. Michael Brown (Techvera) employer record created and linked.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
