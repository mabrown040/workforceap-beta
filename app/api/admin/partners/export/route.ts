import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { dataToCsv, csvDownloadResponse, exportFilename } from '@/lib/csv/export';
import { auditLog } from '@/lib/audit';
import { auditRequestMeta, logAuditEvent } from '@/lib/audit/log';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { withApiGuc } from '@/lib/db/withRequestGuc';

async function _GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const orgId = await getActorOrganizationId(user.id);

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

    const partners = await withTenantScope(orgId, (db) =>
      db.partner.findMany({
        where,
        orderBy: { name: 'asc' },
        take: 500,
        include: {
          _count: { select: { counselors: true, referrals: true } },
        },
      })
    );

    const partnerIds = partners.map((p) => p.id);
    const subgroups = await withTenantScope(orgId, (db) =>
      db.subgroup.findMany({
        where: { type: 'partner', partnerId: { in: partnerIds } },
        select: { id: true, name: true, partnerId: true },
      })
    );

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

    // AUDIT §H-DEP4 / PLAN-2026-Q3 §P4: federal-grant exports must leave
    // an audit trail. Wrapped so logging failures never block the export.
    await auditLog({
      actorUserId: user.id,
      action: 'admin.export.partners',
      targetType: 'PartnerDirectoryExport',
      metadata: {
        orgId,
        rowCount: partners.length,
        truncated: partners.length >= 500,
        limit: 500,
        filters: {
          status: statusFilter || null,
          search: search || null,
        },
      },
    }).catch((err) => console.error('[admin/partners/export] audit log failed:', err));
    await logAuditEvent({
      user: { id: user.id, role: 'admin' },
      verb: 'exported',
      object: { type: 'PartnerDirectoryExport', id: 'partners' },
      result: {
        success: true,
        extensions: {
          orgId,
          rowCount: partners.length,
          truncated: partners.length >= 500,
          limit: 500,
          filters: {
            status: statusFilter || null,
            search: search || null,
          },
        },
      },
      request: auditRequestMeta(request),
      orgId,
    }).catch((err) => console.error('[admin/partners/export] xAPI audit log failed:', err));

    return csvDownloadResponse(csv, exportFilename('partners'), { truncated: partners.length >= 5000, limit: 5000 });
  } catch (error) {
    console.error('[admin/partners/export] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);
