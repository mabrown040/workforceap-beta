import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const schema = z.object({
  companyName: z.string().min(1).max(200),
  industry: z.string().max(100).optional().nullable(),
  companySize: z.string().max(50).optional().nullable(),
  companyWebsite: z.string().url().max(500).optional().nullable().or(z.literal('')),
});export const PATCH = withApiGuc(async (request: NextRequest) => {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });
  }

  const { companyName, industry, companySize, companyWebsite } = parsed.data;
  const website = companyWebsite?.trim() || null;

  await prisma.$transaction((tx) => tx.employer.update({
    where: { id: ctx.employerId },
    data: {
      companyName: companyName.trim(),
      industry: industry?.trim() || null,
      companySize: companySize?.trim() || null,
      companyWebsite: website,
    },
  }));

  auditLog({
    actorUserId: user.id,
    action: 'employer_onboarding_profile_updated',
    targetType: 'Employer',
    targetId: ctx.employerId,
    metadata: { companyName, industry: industry ?? null, companySize: companySize ?? null },
  }).catch(() => {});
  logAuditEvent({
    user: { id: user.id, role: 'employer' },
    verb: 'updated',
    object: { type: 'EmployerOnboardingProfile', id: ctx.employerId },
    result: { success: true },
  }).catch(() => {});

  return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('/employer/onboarding-profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

