import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { buildDirectorySearchWhere, normalizeDirectorySearch } from '@/lib/admin/directorySearch';
import { rankGlobalSearchResults, userSearchResult } from '@/lib/admin/globalSearch';

export const GET = withApiGuc(async (req: NextRequest) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const q = normalizeDirectorySearch(req.nextUrl.searchParams.get('q') ?? '');
    const requestedLimit = Number.parseInt(req.nextUrl.searchParams.get('limit') ?? '8', 10);
    const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(requestedLimit, 20)) : 8;
    if (q.length < 2) return NextResponse.json({ results: [] });

    const superAdmin = await isSuperAdmin(user.id);
    let orgId: string | null = null;
    if (!superAdmin) {
      try {
        orgId = await getActorOrganizationId(user.id);
      } catch {
        return NextResponse.json({ error: 'Organization access unavailable' }, { status: 403 });
      }
      if (!orgId) return NextResponse.json({ error: 'Organization access unavailable' }, { status: 403 });
    }
    const orgWhere = orgId ? { organizationId: orgId } : {};
    const mode = 'insensitive' as const;
    // Exact matches have their own bounded queries so alphabetically earlier
    // contains matches cannot fill the candidate pool before an exact hit.
    const candidateLimit = Math.max(20, limit * 3);
    const tokens = q.split(' ');
    const userSelect = {
      id: true, fullName: true, email: true, enrolledProgram: true,
      profile: { select: { role: true } },
      userRoles: { select: { role: { select: { name: true } } } },
    } as const;
    const employerSelect = { id: true, companyName: true, industry: true } as const;
    const partnerSelect = { id: true, name: true, organizationType: true } as const;
    const jobSelect = { id: true, title: true, employer: { select: { companyName: true } } } as const;
    const jobScope = { status: 'live' as const, ...orgWhere, ...(orgId ? { employer: { organizationId: orgId } } : {}) };
    const [users, employers, partners, jobs, exactUsers, exactEmployers, exactPartners, exactJobs] = await Promise.all([
      prisma.user.findMany({
        where: { deletedAt: null, ...orgWhere, ...buildDirectorySearchWhere(q) },
        take: candidateLimit,
        orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
        select: userSelect,
      }),
      prisma.employer.findMany({
        where: { ...orgWhere, AND: tokens.map(token => ({ companyName: { contains: token, mode } })) },
        take: candidateLimit,
        orderBy: [{ companyName: 'asc' }, { id: 'asc' }],
        select: employerSelect,
      }),
      prisma.partner.findMany({
        where: { active: true, ...orgWhere, AND: tokens.map(token => ({ name: { contains: token, mode } })) },
        take: candidateLimit,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        select: partnerSelect,
      }),
      prisma.job.findMany({
        where: {
          ...jobScope,
          AND: tokens.map(token => ({ title: { contains: token, mode } })),
        },
        take: candidateLimit,
        orderBy: [{ title: 'asc' }, { id: 'asc' }],
        select: jobSelect,
      }),
      prisma.user.findMany({
        where: {
          deletedAt: null, ...orgWhere,
          OR: [{ fullName: { equals: q, mode } }, { email: { equals: q, mode } }],
        },
        take: limit,
        orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
        select: userSelect,
      }),
      prisma.employer.findMany({
        where: { ...orgWhere, companyName: { equals: q, mode } },
        take: limit,
        orderBy: [{ companyName: 'asc' }, { id: 'asc' }],
        select: employerSelect,
      }),
      prisma.partner.findMany({
        where: { active: true, ...orgWhere, name: { equals: q, mode } },
        take: limit,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        select: partnerSelect,
      }),
      prisma.job.findMany({
        where: { ...jobScope, title: { equals: q, mode } },
        take: limit,
        orderBy: [{ title: 'asc' }, { id: 'asc' }],
        select: jobSelect,
      }),
    ]);
    const results = rankGlobalSearchResults([
      ...[...exactUsers, ...users].map(userSearchResult),
      ...[...exactEmployers, ...employers].map(employer => ({
        id: employer.id, type: 'employer' as const, label: employer.companyName,
        sublabel: employer.industry ?? 'Employer', href: `/admin/employers/${employer.id}`, icon: 'business',
      })),
      ...[...exactPartners, ...partners].map(partner => ({
        id: partner.id, type: 'partner' as const, label: partner.name,
        sublabel: partner.organizationType ?? 'Partner', href: `/admin/partners/${partner.id}`, icon: 'handshake',
      })),
      ...[...exactJobs, ...jobs].map(job => ({
        id: job.id, type: 'job' as const, label: job.title,
        sublabel: job.employer?.companyName ?? 'Job', href: `/admin/jobs/${job.id}`, icon: 'work',
      })),
    ], q, limit);
    return NextResponse.json({ results }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    console.error('/admin/search request failed');
    return NextResponse.json({ error: 'Search unavailable' }, { status: 500 });
  }
});
