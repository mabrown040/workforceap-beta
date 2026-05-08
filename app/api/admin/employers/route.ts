import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';
import { z } from 'zod';

/**
 * Track A — Tenant Isolation Hardening (Sprint A.2 batch 1).
 * See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`.
 *
 * Migrated to use `withTenantScope` so the Prisma reads/writes against
 * `Employer` and `User` are tenant-scoped at the helper level. The
 * `Role` and `UserRole` models are platform-level (not tenant-scoped),
 * so those calls remain on the raw `prisma` client.
 */

const employerSchema = z.object({
  userId: z.string().uuid(),
  companyName: z.string().min(1).max(200),
  companyWebsite: z.string().url().optional().nullable(),
  companyDescription: z.string().min(1).optional().nullable(),
  contactName: z.string().min(1).max(200),
  contactEmail: z.string().email(),
  contactPhone: z.string().max(50).optional().nullable(),
});

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const orgId = await getDefaultOrganizationId();
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

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json().catch(() => null);
    const parsed = employerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });
    }

    const orgId = await getDefaultOrganizationId();

    const employer = await withTenantScope(orgId, async (db) => {
      const existingUser = await db.user.findUnique({
        where: { id: parsed.data.userId },
        select: { id: true },
      });
      if (!existingUser) {
        throw new Error('USER_NOT_FOUND');
      }

      const existingEmployer = await db.employer.findUnique({
        where: { userId: parsed.data.userId },
        select: { id: true },
      });
      if (existingEmployer) {
        throw new Error('ALREADY_EMPLOYER');
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
    const employerRole = await prisma.role.findUnique({ where: { name: 'employer' } });
    if (employerRole) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: parsed.data.userId, roleId: employerRole.id } },
        create: { userId: parsed.data.userId, roleId: employerRole.id },
        update: {},
      });
    }

    return NextResponse.json(employer, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'USER_NOT_FOUND') {
        return NextResponse.json({ error: 'User not found' }, { status: 400 });
      }
      if (error.message === 'ALREADY_EMPLOYER') {
        return NextResponse.json({ error: 'User is already an employer' }, { status: 400 });
      }
    }
    console.error('[admin/employers POST] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
