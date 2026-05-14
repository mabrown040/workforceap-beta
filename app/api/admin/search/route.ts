import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { prisma } from '@/lib/db/prisma';

/**
 * GET /api/admin/search?q=keyword&limit=8
 *
 * Fast cross-entity search for admin global search (Cmd+K). Scoped to the
 * caller's tenant for every entity type (members, employers, partners, jobs).
 * Super-admins see the whole platform.
 *
 * Without tenant scope the Cmd+K bar surfaced cross-tenant data: a tenant
 * admin searching "drew" would find members from other orgs.
 */
export async function GET(req: NextRequest) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Resolve tenant scope. Super-admins get no filter. Org-lookup failures
  // surface as an empty result list rather than 500'ing Cmd+K.
  let orgFilterId: string | null = null;
  if (!(await isSuperAdmin(user.id))) {
    try {
      orgFilterId = await getActorOrganizationId(user.id);
    } catch {
      return NextResponse.json({ results: [] });
    }
  }

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '8', 10), 20);

  if (q.length < 2) return NextResponse.json({ results: [] });

  const mode = 'insensitive' as const;

  const [members, employers, partners, jobs] = await Promise.all([
    prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(orgFilterId ? { organizationId: orgFilterId } : {}),
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
        ...(orgFilterId ? { organizationId: orgFilterId } : {}),
      },
      take: 3,
      select: { id: true, companyName: true, industry: true },
    }),
    prisma.partner.findMany({
      where: {
        name: { contains: q, mode },
        active: true,
        ...(orgFilterId ? { organizationId: orgFilterId } : {}),
      },
      take: 3,
      select: { id: true, name: true, organizationType: true },
    }),
    prisma.job.findMany({
      where: {
        title: { contains: q, mode },
        status: 'live',
        ...(orgFilterId ? { organizationId: orgFilterId } : {}),
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
}

