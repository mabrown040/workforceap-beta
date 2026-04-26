#!/usr/bin/env npx tsx
/**
 * One-shot repair script for Michael Brown's WorkforceAP login.
 *
 * What it does:
 * 1. Ensures a Supabase Auth user exists for michael.brown@workforceap.org
 * 2. Ensures the Prisma user row uses the same auth user id
 * 3. Promotes the profile to super_admin
 * 4. Ensures admin + employer roles and an active employer record exist
 * 5. Sends a password-reset email so he can set a fresh password
 *
 * Required env:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - DATABASE_URL or POSTGRES_PRISMA_URL
 *
 * Run:
 *   node scripts/prisma-env.js npx tsx scripts/fix-michael-brown-login.ts
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { getDefaultOrganizationId } from '../lib/tenant/organization';

const prisma = new PrismaClient();

const EMAIL = 'michael.brown@workforceap.org';
const FULL_NAME = 'Michael Brown';
const PHONE = '(512) 777-1808';
const COMPANY_NAME = 'Techvera';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

async function getSupabaseAdmin() {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function ensureRole(name: string) {
  return prisma.role.upsert({
    where: { name },
    create: { name },
    update: {},
  });
}

async function ensureAuthUser() {
  const supabase = await getSupabaseAdmin();

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: EMAIL,
    email_confirm: true,
    user_metadata: { full_name: FULL_NAME, phone: PHONE },
  });

  if (!createError && created.user) {
    console.log(`Auth user created for ${EMAIL}`);
    return { supabase, userId: created.user.id };
  }

  if (
    createError &&
    (createError.message.includes('already') ||
      createError.message.includes('registered') ||
      (createError as { code?: string }).code === 'email_exists' ||
      (createError as { code?: string }).code === 'user_already_exists')
  ) {
    const { data: list, error: listError } = await supabase.auth.admin.listUsers({ perPage: 200 });
    if (listError) throw new Error(`Could not list auth users: ${listError.message}`);

    const existing = list.users.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase());
    if (!existing) {
      throw new Error(`Auth says ${EMAIL} exists, but it was not returned by listUsers`);
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
      email: EMAIL,
      email_confirm: true,
      user_metadata: { full_name: FULL_NAME, phone: PHONE },
    });
    if (updateError) {
      throw new Error(`Could not update auth user ${EMAIL}: ${updateError.message}`);
    }

    console.log(`Auth user already existed for ${EMAIL}, metadata refreshed`);
    return { supabase, userId: existing.id };
  }

  throw new Error(`Could not create auth user: ${createError?.message ?? 'unknown error'}`);
}

async function main() {
  const { supabase, userId } = await ensureAuthUser();
  const organizationId = await getDefaultOrganizationId();

  const [adminRole, employerRole] = await Promise.all([
    ensureRole('admin'),
    ensureRole('employer'),
  ]);

  const existingByEmail = await prisma.user.findUnique({
    where: { email: EMAIL },
    include: {
      profile: true,
      employer: true,
      userRoles: true,
    },
  });

  if (existingByEmail && existingByEmail.id !== userId) {
    throw new Error(
      `DB row for ${EMAIL} uses id ${existingByEmail.id}, but auth user id is ${userId}. ` +
        'This needs a one-time data repair before login will work cleanly.'
    );
  }

  await prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      organizationId,
      email: EMAIL,
      fullName: FULL_NAME,
      phone: PHONE,
    },
    update: {
      email: EMAIL,
      fullName: FULL_NAME,
      phone: PHONE,
    },
  });

  await prisma.profile.upsert({
    where: { userId },
    create: {
      userId,
      profilePhone: PHONE,
      consentTerms: true,
      role: 'super_admin',
    },
    update: {
      profilePhone: PHONE,
      role: 'super_admin',
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId: adminRole.id } },
    create: { userId, roleId: adminRole.id },
    update: {},
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId: employerRole.id } },
    create: { userId, roleId: employerRole.id },
    update: {},
  });

  await prisma.employer.upsert({
    where: { userId },
    create: {
      organizationId,
      userId,
      companyName: COMPANY_NAME,
      contactName: FULL_NAME,
      contactEmail: EMAIL,
      contactPhone: PHONE,
      status: 'active',
      tier: 'partner',
    },
    update: {
      companyName: COMPANY_NAME,
      contactName: FULL_NAME,
      contactEmail: EMAIL,
      contactPhone: PHONE,
      status: 'active',
      tier: 'partner',
    },
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://www.workforceap.org';
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(EMAIL, {
    redirectTo: `${siteUrl}/login?redirectTo=/admin`,
  });
  if (resetError) {
    throw new Error(`Failed to send password reset email: ${resetError.message}`);
  }

  console.log(`Login repaired for ${EMAIL}`);
  console.log('Profile role: super_admin');
  console.log('Roles ensured: admin, employer');
  console.log(`Password reset email sent with redirect to ${siteUrl}/login?redirectTo=/admin`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
