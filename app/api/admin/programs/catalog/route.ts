import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';
import { getProgramBySlug } from '@/lib/content/programs';

const catalogRowSchema = z.object({
  programSlug: z.string().min(1).max(200),
  name: z.string().min(1).max(300),
  description: z.string().max(20_000).optional().nullable(),
  category: z.string().min(1).max(100),
  deliveryType: z.enum(['external_lms', 'youtube', 'in_person', 'virtual', 'internal']),
  deliveryUrl: z.string().url().max(2000).optional().nullable(),
  deliveryDetails: z.string().max(20_000).optional().nullable(),
  certifications: z.array(z.string().max(200)).optional().default([]),
  duration: z.string().max(100).optional().nullable(),
  cost: z.number().optional().nullable(),
  certCost: z.number().optional().nullable(),
  bookCost: z.number().optional().nullable(),
  miscCost: z.number().optional().nullable(),
  status: z.enum(['active', 'coming_soon', 'inactive']).optional().default('active'),
  displayOrder: z.number().int().optional(),
  featured: z.boolean().optional().default(false),
});

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const organizationId = await getDefaultOrganizationId();
  const rows = await prisma.organizationProgramCatalog.findMany({
    where: { organizationId },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
  });
  return NextResponse.json({ programs: rows });
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = catalogRowSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid body' }, { status: 400 });
  }

  const staticRef = getProgramBySlug(parsed.data.programSlug);
  if (!staticRef) {
    return NextResponse.json(
      { error: 'programSlug must match an existing static program slug (see /programs).' },
      { status: 400 }
    );
  }

  const organizationId = await getDefaultOrganizationId();
  const maxOrder = await prisma.organizationProgramCatalog.aggregate({
    where: { organizationId },
    _max: { displayOrder: true },
  });
  const displayOrder =
    parsed.data.displayOrder ?? (maxOrder._max.displayOrder ?? -1) + 1;
  try {
    const row = await prisma.organizationProgramCatalog.create({
      data: {
        organizationId,
        programSlug: parsed.data.programSlug,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        category: parsed.data.category,
        deliveryType: parsed.data.deliveryType,
        deliveryUrl: parsed.data.deliveryUrl ?? null,
        deliveryDetails: parsed.data.deliveryDetails ?? null,
        certifications: parsed.data.certifications ?? [],
        duration: parsed.data.duration ?? null,
        cost: parsed.data.cost ?? null,
        certCost: parsed.data.certCost ?? null,
        bookCost: parsed.data.bookCost ?? null,
        miscCost: parsed.data.miscCost ?? null,
        status: parsed.data.status ?? 'active',
        displayOrder,
        featured: parsed.data.featured ?? false,
      },
    });
    return NextResponse.json(row, { status: 201 });
  } catch (e: unknown) {
    const code = typeof e === 'object' && e && 'code' in e ? (e as { code: string }).code : '';
    if (code === 'P2002') {
      return NextResponse.json({ error: 'A catalog row for this program slug already exists.' }, { status: 400 });
    }
    throw e;
  }
}

const patchSchema = catalogRowSchema.partial().extend({
  id: z.string().uuid(),
});

export async function PATCH(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid body' }, { status: 400 });
  }

  const organizationId = await getDefaultOrganizationId();
  const { id, ...rest } = parsed.data;

  const existing = await prisma.organizationProgramCatalog.findFirst({
    where: { id, organizationId },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (rest.programSlug && rest.programSlug !== existing.programSlug) {
    return NextResponse.json({ error: 'programSlug cannot be changed; create a new row instead.' }, { status: 400 });
  }

  const row = await prisma.organizationProgramCatalog.update({
    where: { id },
    data: {
      ...(rest.name !== undefined ? { name: rest.name } : {}),
      ...(rest.description !== undefined ? { description: rest.description } : {}),
      ...(rest.category !== undefined ? { category: rest.category } : {}),
      ...(rest.deliveryType !== undefined ? { deliveryType: rest.deliveryType } : {}),
      ...(rest.deliveryUrl !== undefined ? { deliveryUrl: rest.deliveryUrl } : {}),
      ...(rest.deliveryDetails !== undefined ? { deliveryDetails: rest.deliveryDetails } : {}),
      ...(rest.certifications !== undefined ? { certifications: rest.certifications } : {}),
      ...(rest.duration !== undefined ? { duration: rest.duration } : {}),
      ...(rest.cost !== undefined ? { cost: rest.cost } : {}),
      ...(rest.certCost !== undefined ? { certCost: rest.certCost } : {}),
      ...(rest.bookCost !== undefined ? { bookCost: rest.bookCost } : {}),
      ...(rest.miscCost !== undefined ? { miscCost: rest.miscCost } : {}),
      ...(rest.status !== undefined ? { status: rest.status } : {}),
      ...(rest.displayOrder !== undefined ? { displayOrder: rest.displayOrder } : {}),
      ...(rest.featured !== undefined ? { featured: rest.featured } : {}),
    },
  });

  return NextResponse.json(row);
}
