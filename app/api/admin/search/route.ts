import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getActorOrganizationId } from '@/lib/tenant/organization';

import { withApiGuc } from '@/lib/db/withRequestGuc';
export const GET = withApiGuc(async (req: NextRequest) => {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '8', 10), 20);

  if (q.length < 2) return NextResponse.json({ results: [] });

  const mode = 'insensitive' as const;

  const superAdmin = await isSuperAdmin(user.id);
  const orgId = superAdmin ? null : await getActorOrganizationId(user.id).catch(() => null);

  const [members, employers, partners, jobs] = await Promise.all([
    prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(orgId ? { organizationId: orgId } : {}),
        OR: [
          { fullName: { contains: q, mode } },
          { email: { contains: q, mode } },
        ],
      },
      take: Math.ceil(limit / 2),
      select: { id: true, fullName: true, email: true, enrolledProgram: true },
    }),
    prisma.employer.findMany({
      where: {
        companyName: { contains: q, mode },
        ...(orgId ? { organizationId: orgId } : {}),
      },
      take: 3,
      select: { id: true, companyName: true, industry: true },
    }),
    prisma.partner.findMany({
      where: {
        name: { contains: q, mode },
        active: true,
        ...(orgId ? { organizationId: orgId } : {}),
      },
      take: 3,
      select: { id: true, name: true, organizationType: true },
    }),
    prisma.job.findMany({
      where: {
        title: { contains: q, mode },
        status: 'live',
        ...(orgId ? { employer: { organizationId: orgId } } : {}),
      },
      take: 3,
      select: { id: true, title: true, employer: { select: { companyName: true } } },
    }),
  ]);

  const results = [
    ...members.map(m => ({
      id: m.id,
      type: 'member' as const,
      label: m.fullName ?? m.email,
      sublabel: m.email + (m.enrolledProgram ? ` · ${m.enrolledProgram}` : ''),
      href: `/admin/members/${m.id}`,
      icon: 'person',
    })),
    ...employers.map(e => ({
      id: e.id,
      type: 'employer' as const,
      label: e.companyName,
      sublabel: e.industry ?? 'Employer',
      href: `/admin/employers`,
      icon: 'business',
    })),
    ...partners.map(p => ({
      id: p.id,
      type: 'partner' as const,
      label: p.name,
      sublabel: p.organizationType ?? 'Partner',
      href: `/admin/partners/${p.id}`,
      icon: 'handshake',
    })),
    ...jobs.map(j => ({
      id: j.id,
      type: 'job' as const,
      label: j.title,
      sublabel: j.employer?.companyName ?? 'Job',
      href: `/admin/jobs/${j.id}`,
      icon: 'work',
    })),
  ].slice(0, limit);

  return NextResponse.json({ results });

  } catch (error) {
    console.error('/admin/search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

