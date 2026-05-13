import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { dataToCsv, csvDownloadResponse, exportFilename } from '@/lib/csv/export';

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status')?.trim() ?? '';
    const search = searchParams.get('search')?.trim() ?? '';

    const where: Record<string, unknown> = {};
    if (statusFilter === 'active') where.active = true;
    if (statusFilter === 'inactive') where.active = false;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const partners = await prisma.partner.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 5000,
      include: {
        _count: { select: { counselors: true, referrals: true } },
      },
    });

    const subgroups = await prisma.subgroup.findMany({
      where: { type: 'partner' },
      select: { id: true, name: true, partnerId: true },
    });

    const rows = partners.map((p) => ({
      ...p,
      subgroupNames: subgroups
        .filter((s) => s.partnerId === p.id)
        .map((s) => s.name)
        .join('; ') || '—',
    }));

    const csv = dataToCsv(
      [
        { key: 'id', header: 'ID', accessor: (r) => r.id },
        { key: 'name', header: 'Name', accessor: (r) => r.name },
        { key: 'slug', header: 'Slug', accessor: (r) => r.slug },
        { key: 'contactName', header: 'Contact Name', accessor: (r) => r.contactName ?? '' },
        { key: 'contactEmail', header: 'Contact Email', accessor: (r) => r.contactEmail ?? '' },
        { key: 'contactPhone', header: 'Contact Phone', accessor: (r) => r.contactPhone ?? '' },
        { key: 'subgroups', header: 'Subgroups', accessor: (r) => r.subgroupNames },
        { key: 'counselors', header: 'Counselors', accessor: (r) => r._count.counselors },
        { key: 'referrals', header: 'Members Referred', accessor: (r) => r._count.referrals },
        { key: 'active', header: 'Active', accessor: (r) => r.active },
        { key: 'createdAt', header: 'Created', accessor: (r) => r.createdAt },
      ],
      rows,
      { reportTitle: 'Partner Directory Export', notes: 'Workforce Advancement Project' },
    );

    return csvDownloadResponse(csv, exportFilename('partners'), { truncated: partners.length >= 5000, limit: 5000 });
  } catch (error) {
    console.error('[admin/partners/export] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
