import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';
import { z } from 'zod';

/**
 * Track A — Tenant Isolation Hardening (Sprint A.2 batch 1).
 * See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`.
 *
 * All Prisma reads/writes against `Partner` are now wrapped in
 * `withTenantScope` so the helper auto-injects `organizationId`. Note
 * that `slug` and `referralCode` are claimed to be globally unique in
 * the schema (`@unique`); however, they SHOULD be unique-per-tenant in
 * a real multi-tenant world. That schema migration is queued for
 * Sprint A.3 — this PR only changes query scoping, not constraints.
 */

const partnerSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  referralCode: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Referral code must be lowercase letters, numbers, and hyphens only')
    .optional(),
  logoUrl: z.string().url().optional().nullable(),
  contactName: z.string().max(200).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
  active: z.boolean().optional().default(true),
});

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const orgId = await getDefaultOrganizationId();
  const partners = await withTenantScope(orgId, (db) =>
    db.partner.findMany({
      take: 500,
      orderBy: { name: 'asc' },
      include: { _count: { select: { counselors: true, referrals: true } } },
    }),
  );
  return NextResponse.json(partners);
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = partnerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });

  const orgId = await getDefaultOrganizationId();
  const referralCode = parsed.data.referralCode ?? parsed.data.slug;

  try {
    const partner = await withTenantScope(orgId, async (db) => {
      // Slug uniqueness — currently global per schema, will be per-tenant in A.3.
      // The findUnique by `slug` doesn't auto-scope (since slug is the
      // unique key), but we re-check via findFirst-with-org for safety.
      const existing = await db.partner.findFirst({ where: { slug: parsed.data.slug } });
      if (existing) {
        throw new Error('SLUG_TAKEN');
      }

      const codeTaken = await db.partner.findFirst({
        where: { OR: [{ referralCode }, { slug: referralCode }] },
      });
      if (codeTaken) {
        throw new Error('CODE_TAKEN');
      }

      const { referralCode: _rc, ...rest } = parsed.data;
      // organizationId passed explicitly to satisfy Prisma's required-
      // field type; withTenantScope verifies it matches the active scope.
      return db.partner.create({ data: { ...rest, referralCode, organizationId: orgId } });
    });

    return NextResponse.json(partner, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'SLUG_TAKEN') {
        return NextResponse.json({ error: 'A partner with this slug already exists' }, { status: 400 });
      }
      if (error.message === 'CODE_TAKEN') {
        return NextResponse.json(
          { error: 'Referral code must be unique and different from other partners slugs' },
          { status: 400 },
        );
      }
    }
    console.error('[admin/partners POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
