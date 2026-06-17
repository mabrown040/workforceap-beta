import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdminInOrg } from '@/lib/auth/roles';
import { dataToCsv, csvDownloadResponse, exportFilename } from '@/lib/csv/export';
import { auditLog } from '@/lib/audit';
import { auditRequestMeta, logAuditEvent } from '@/lib/audit/log';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { resolveOrgFromRequest } from '@/lib/tenant/resolveOrgFromRequest';
import { withApiGuc } from '@/lib/db/withRequestGuc';

async function _GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = await resolveOrgFromRequest(request.headers);
    if (!(await isAdminInOrg(user.id, orgId))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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

    const employers = await withTenantScope(orgId, (db) =>
      db.employer.findMany({
        where,
        orderBy: { companyName: 'asc' },
        take: 500,
        include: {
          user: { select: { email: true, fullName: true } },
          _count: { select: { jobs: true } },
        },
      }),
    );

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

    // AUDIT §H-DEP4 / PLAN-2026-Q3 §P4: federal-grant exports must leave
    // an audit trail. Wrapped so logging failures never block the export.
    await auditLog({
      actorUserId: user.id,
      action: 'admin.export.employers',
      targetType: 'EmployerDirectoryExport',
      metadata: {
        orgId,
        rowCount: employers.length,
        truncated: employers.length >= 500,
        limit: 500,
        filters: {
          status: statusFilter || null,
          search: search || null,
        },
      },
    }).catch((err) => console.error('[admin/employers/export] audit log failed:', err));
    await logAuditEvent({
      user: { id: user.id, role: 'admin' },
      verb: 'exported',
      object: { type: 'EmployerDirectoryExport', id: 'employers' },
      result: {
        success: true,
        extensions: {
          orgId,
          rowCount: employers.length,
          truncated: employers.length >= 500,
          limit: 500,
          filters: {
            status: statusFilter || null,
            search: search || null,
          },
        },
      },
      request: auditRequestMeta(request),
      orgId,
    }).catch((err) => console.error('[admin/employers/export] xAPI audit log failed:', err));

    return csvDownloadResponse(csv, exportFilename('employers'), { truncated: employers.length >= 5000, limit: 5000 });
  } catch (error) {
    console.error('[admin/employers/export] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);
