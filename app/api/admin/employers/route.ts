import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getUser } from '@/lib/auth/server';
import { isAdminInOrg } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { withTenantScope, crossTenantOK } from '@/lib/tenant/withTenantScope';
import { resolveOrgFromRequest } from '@/lib/tenant/resolveOrgFromRequest';
import { z } from 'zod';

import { withApiGuc } from '@/lib/db/withRequestGuc';

/**
 * Track A — Tenant Isolation Hardening (Sprint A.2 batch 1).
 * See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`.
 *
 * Migrated to use `withTenantScope` so the Prisma reads/writes against
 * `Employer` and `User` are tenant-scoped at the helper level. The
 * `Role` and `UserRole` models are platform-level (not tenant-scoped),
 * so those calls remain on the raw `prisma` client.
 *
 * Org resolution: `resolveOrgFromRequest(request.headers)` reads the
 * `x-wap-org-id` / `x-wap-host` headers set by middleware (Track E.1).
 * Falls back to the default org for canonical hosts. Codex P2 catch on
 * PR #1046 — earlier this called `getDefaultOrganizationId()` directly,
 * so the new resolver was dead code and `customDomain` requests still
 * hit the default org. This is the first production wire-up.
 *
 * EXCEPTION: the duplicate-`userId` check is run GLOBALLY via
 * `crossTenantOK`. Codex P2 catch on PR #1042 — `Employer.userId` is
 * still `@unique` globally in the schema, so a scoped pre-check would
 * miss collisions in other orgs and the create would then 500 on
 * Prisma's P2002 instead of returning a friendly 400. Once the schema
 * migrates to per-tenant uniqueness in Sprint A.3, this check moves
 * back inside `withTenantScope`. The route also catches P2002 as
 * belt-and-braces in case a race slips past the pre-check.
 */

const employerSchema = z.object({
  userId: z.string().uuid(),
  companyName: z.string().min(1).max(200),
  companyWebsite: z.string().url().optional().nullable(),
  companyDescription: z.string().min(1).optional().nullable(),
  contactName: z.string().min(1).max(200),
  contactEmail: z.string().email(),
  contactPhone: z.string().max(50).optional().nullable(),
});async function _GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Org-aware authz: resolve the tenant first, THEN verify the user is
    // an admin in that tenant. Codex P1 catch on PR #1046 — the global
    // `isAdmin()` would let a default-org admin hit a custom-domain URL
    // and read another tenant's data.
    const orgId = await resolveOrgFromRequest(request.headers);
    if (!(await isAdminInOrg(user.id, orgId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const employers = await withTenantScope(orgId, (db) =>
      db.employer.findMany({
        take: 1000,
        orderBy: { companyName: 'asc' },
        include: {
          user: { select: { email: true, fullName: true } },
          _count: { select: { jobs: true } },
        },
      }),
    );

    return NextResponse.json(employers);
  } catch (error) {
    console.error('[admin/employers GET] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);async function _POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => null);
    const parsed = employerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });
    }

    const orgId = await resolveOrgFromRequest(request.headers);
    if (!(await isAdminInOrg(user.id, orgId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Global uniqueness pre-check — Employer.userId is @unique across ALL
    // orgs in the current schema. crossTenantOK marks the intentional bypass
    // for the audit script.
    const existingEmployerGlobal = await crossTenantOK(() =>
      prisma.$transaction((tx) => tx.employer.findUnique({
        where: { userId: parsed.data.userId },
        select: { id: true },
      })),
    );
    if (existingEmployerGlobal) {
      return NextResponse.json({ error: 'User is already an employer' }, { status: 400 });
    }

    const employer = await withTenantScope(orgId, async (db) => {
      const existingUser = await db.user.findUnique({
        where: { id: parsed.data.userId },
        select: { id: true },
      });
      if (!existingUser) {
        throw new Error('USER_NOT_FOUND');
      }

      return db.employer.create({
        data: {
          // organizationId passed explicitly to satisfy Prisma's required-
          // field type; withTenantScope verifies it matches the active scope.
          organizationId: orgId,
          userId: parsed.data.userId,
          companyName: parsed.data.companyName,
          companyWebsite: parsed.data.companyWebsite ?? undefined,
          companyDescription: parsed.data.companyDescription ?? undefined,
          contactName: parsed.data.contactName,
          contactEmail: parsed.data.contactEmail,
          contactPhone: parsed.data.contactPhone ?? undefined,
        },
      });
    });

    // Role and UserRole are platform-level — not tenant-scoped.
    const employerRole = await prisma.$transaction((tx) => tx.role.findUnique({ where: { name: 'employer' } }));
    if (employerRole) {
      await prisma.$transaction((tx) => tx.userRole.upsert({
        where: { userId_roleId: { userId: parsed.data.userId, roleId: employerRole.id } },
        create: { userId: parsed.data.userId, roleId: employerRole.id },
        update: {},
      }));
    }

    return NextResponse.json(employer, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
      return NextResponse.json({ error: 'User not found' }, { status: 400 });
    }
    // Belt-and-braces: catch the unique-constraint race that the global
    // pre-check might miss between check and insert.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = (error.meta?.target as string[] | undefined) ?? [];
      if (target.includes('userId') || target.includes('user_id')) {
        return NextResponse.json({ error: 'User is already an employer' }, { status: 400 });
      }
      return NextResponse.json({ error: 'An employer with these details already exists' }, { status: 400 });
    }
    console.error('[admin/employers POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);
