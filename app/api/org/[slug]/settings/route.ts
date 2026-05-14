import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { resolveSupabasePublicAssetUrl } from '@/lib/storage/publicAssetUrl';
import { clearOrganizationBrandingCache } from '@/lib/tenant/organizationBranding';

const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a 6-digit hex like #1a5f7a')
  .optional()
  .nullable();

const settingsSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  primaryColor: hexColor,
  accentColor: hexColor,
  logo: z.string().max(2000).optional().nullable(),
  customDomain: z.string().max(253).optional().nullable(),
  overviewVideoUrl: z.string().url().max(2000).optional().nullable(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const org = await prisma.organization.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        primaryColor: true,
        accentColor: true,
        customDomain: true,
        overviewVideoUrl: true,
        subscriptionTier: true,
        subscriptionStatus: true,
      },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...org,
      logo: resolveSupabasePublicAssetUrl('organization-branding', org.logo),
    });
  } catch (error) {
    console.error('[org/[slug]/settings] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json().catch(() => null);
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Invalid body' },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.primaryColor !== undefined) data.primaryColor = parsed.data.primaryColor;
    if (parsed.data.accentColor !== undefined) data.accentColor = parsed.data.accentColor;
    if (parsed.data.logo !== undefined) data.logo = parsed.data.logo;
    if (parsed.data.customDomain !== undefined) data.customDomain = parsed.data.customDomain;
    if (parsed.data.overviewVideoUrl !== undefined) data.overviewVideoUrl = parsed.data.overviewVideoUrl;

    const org = await prisma.organization.update({
      where: { slug },
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        primaryColor: true,
        accentColor: true,
        customDomain: true,
        overviewVideoUrl: true,
      },
    });

    clearOrganizationBrandingCache(org.id);

    return NextResponse.json({
      ...org,
      logo: resolveSupabasePublicAssetUrl('organization-branding', org.logo),
    });
  } catch (error) {
    console.error('[org/[slug]/settings] PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
