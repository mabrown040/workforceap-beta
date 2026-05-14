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
    if (statusFilter) where.status = statusFilter;
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const employers = await prisma.employer.findMany({
      where,
      orderBy: { companyName: 'asc' },
      take: 5000,
      include: {
        user: { select: { email: true, fullName: true } },
        _count: { select: { jobs: true } },
      },
    });

    const csv = dataToCsv(
      [
        { key: 'id', header: 'ID', accessor: (r) => r.id },
        { key: 'companyName', header: 'Company', accessor: (r) => r.companyName },
        { key: 'contactName', header: 'Contact Name', accessor: (r) => r.contactName ?? '' },
        { key: 'contactEmail', header: 'Contact Email', accessor: (r) => r.contactEmail ?? '' },
        { key: 'portalUser', header: 'Portal User', accessor: (r) => r.user?.fullName ?? '' },
        { key: 'portalEmail', header: 'Portal Email', accessor: (r) => r.user?.email ?? '' },
        { key: 'status', header: 'Status', accessor: (r) => r.status },
        { key: 'tier', header: 'Tier', accessor: (r) => r.tier ?? '' },
        { key: 'jobsCount', header: 'Jobs Posted', accessor: (r) => r._count.jobs },
        { key: 'placementAgreementSigned', header: 'Placement Agreement', accessor: (r) => r.placementAgreementSigned },
        { key: 'hiringPipelineActive', header: 'Hiring Pipeline Active', accessor: (r) => r.hiringPipelineActive },
        { key: 'createdAt', header: 'Created', accessor: (r) => r.createdAt },
      ],
      employers,
      { reportTitle: 'Employer Directory Export', notes: 'Workforce Advancement Project' },
    );

    return csvDownloadResponse(csv, exportFilename('employers'), { truncated: employers.length >= 5000, limit: 5000 });
  } catch (error) {
    console.error('[admin/employers/export] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
