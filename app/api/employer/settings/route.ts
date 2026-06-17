import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { employerSettingsPatchSchema } from '@/lib/employer/employerSettingsSchema';
import { resolveSupabasePublicAssetUrl } from '@/lib/storage/publicAssetUrl';

import { withApiGuc } from '@/lib/db/withRequestGuc';
export const PATCH = withApiGuc(async (request: NextRequest) => {
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

  const parsed = employerSettingsPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });
  }

  const d = parsed.data;
  const website = d.companyWebsite?.trim() || null;

  const updated = await prisma.$transaction((tx) => tx.employer.update({
    where: { id: ctx.employerId },
    data: {
      companyName: d.companyName,
      companyDescription: d.companyDescription?.trim() || null,
      companyWebsite: website,
      companySize: d.companySize?.trim() || null,
      industry: d.industry?.trim() || null,
      contactName: d.contactName,
      contactEmail: d.contactEmail,
      contactPhone: d.contactPhone?.trim() || null,
      ...(d.logoUrl !== undefined && { logoUrl: d.logoUrl?.trim() || null }),
    },
  }));

  return NextResponse.json({
    id: updated.id,
    companyName: updated.companyName,
    logoUrl: resolveSupabasePublicAssetUrl('employer-logos', updated.logoUrl),
    companyDescription: updated.companyDescription,
    companyWebsite: updated.companyWebsite,
    companySize: updated.companySize,
    industry: updated.industry,
    contactName: updated.contactName,
    contactEmail: updated.contactEmail,
    contactPhone: updated.contactPhone,
  });

  } catch (error) {
    console.error('/employer/settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

