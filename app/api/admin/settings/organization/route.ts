import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { resolveSupabasePublicAssetUrl } from '@/lib/storage/publicAssetUrl';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';

const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Primary color must be a 6-digit hex like #1a5f7a')
  .optional()
  .nullable();

const patchSchema = z.object({
  overviewVideoUrl: z.string().url().max(2000).optional().nullable(),
  name: z.string().min(1).max(200).optional(),
  primaryColor: hexColor,
});

export async function GET() {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const organizationId = await getDefaultOrganizationId();
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      primaryColor: true,
      overviewVideoUrl: true,
    },
  });
  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  return NextResponse.json({
    ...org,
    logo: resolveSupabasePublicAssetUrl('organization-branding', org.logo),
  });

  } catch (error) {
    console.error('/admin/settings/organization error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


export async function PATCH(request: NextRequest) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid body' }, { status: 400 });
  }

  const organizationId = await getDefaultOrganizationId();
  const org = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      ...(parsed.data.overviewVideoUrl !== undefined ? { overviewVideoUrl: parsed.data.overviewVideoUrl } : {}),
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.primaryColor !== undefined ? { primaryColor: parsed.data.primaryColor } : {}),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      primaryColor: true,
      overviewVideoUrl: true,
    },
  });

  return NextResponse.json({
    ...org,
    logo: resolveSupabasePublicAssetUrl('organization-branding', org.logo),
  });

  } catch (error) {
    console.error('/admin/settings/organization error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

