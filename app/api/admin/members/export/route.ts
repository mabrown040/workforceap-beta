import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { auditLog } from '@/lib/audit';
import { auditRequestMeta, logAuditEvent } from '@/lib/audit/log';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getProgramBySlug } from '@/lib/content/programs';
import { formatPhone } from '@/lib/formatPhone';
import { MEMBER_OR_DOGFOOD_WHERE } from '@/lib/admin/memberOnlyWhere';

const MAX_EXPORT = 5000;

function csvEscape(s: string | number | null | undefined): string {
  const str = s == null ? '' : String(s);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function formatDate(value: Date | string | null | undefined): string {
  if (value == null) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString();
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') ?? '';
    const programFilter = searchParams.get('program') ?? '';
    const partnerFilter = searchParams.get('partner') ?? '';
    const healthFilter = searchParams.get('health') ?? '';
    const notInCourse = searchParams.get('notInCourse') === '1';
    const needsAttention = searchParams.get('needsAttention') === '1';
    const startDate = searchParams.get('startDate') ?? '';
    const endDate = searchParams.get('endDate') ?? '';

    const orgId = await getActorOrganizationId(user.id);

    const dateWhere: { enrolledAt?: { gte?: Date; lte?: Date } } = {};
    if (startDate) {
      const d = new Date(startDate);
      if (!Number.isNaN(d.getTime())) dateWhere.enrolledAt = { ...dateWhere.enrolledAt, gte: d };
    }
    if (endDate) {
      const d = new Date(endDate);
      if (!Number.isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999);
        dateWhere.enrolledAt = { ...dateWhere.enrolledAt, lte: d };
      }
    }

    // Fetch all members (same base query as the page, but we apply client-side filtering
    // to match the exact logic in MembersTable)
    const members = await withTenantScope(orgId, (db) =>
      db.user.findMany({
        where: { deletedAt: null, ...MEMBER_OR_DOGFOOD_WHERE, ...dateWhere },
        orderBy: { createdAt: 'desc' },
        take: MAX_EXPORT,
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          enrolledProgram: true,
          enrolledAt: true,
          staleTrainingDetectedAt: true,
          assessmentScorePct: true,
          assessmentCompleted: true,
          updatedAt: true,
          createdAt: true,
          lastLoginAt: true,
          pipelineBoardStage: true,
          profile: {
            select: {
              profilePhone: true,
              employmentStatus: true,
              educationLevel: true,
            },
          },
          courseEnrollments: {
            select: { programSlug: true, isPrimary: true },
          },
          partnerReferrals: {
            take: 1,
            orderBy: { referredAt: 'desc' },
            select: { partner: { select: { id: true, name: true } } },
          },
          placementRecord: {
            select: {
              employerName: true,
              jobTitle: true,
              startDate: true,
            },
          },
        },
      }),
    );

    // Get last activity events for health calculation
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const lastEvents = await prisma.memberEvent.groupBy({
      by: ['userId'],
      where: { userId: { in: members.map((m) => m.id) }, createdAt: { gte: thirtyDaysAgo } },
      _max: { createdAt: true },
    });
    const lastEventMap = new Map<string, Date>();
    for (const e of lastEvents) {
      if (e._max.createdAt) lastEventMap.set(e.userId, e._max.createdAt);
    }

    const recentEvents = await prisma.memberEvent.groupBy({
      by: ['userId'],
      where: { userId: { in: members.map((m) => m.id) }, createdAt: { gte: thirtyDaysAgo } },
      _count: { _all: true },
    });
    const recentEventMap = new Map<string, number>();
    for (const e of recentEvents) {
      recentEventMap.set(e.userId, e._count._all);
    }

    // Apply filters matching MembersTable logic exactly
    const filtered = members.filter((m) => {
      const q = search.toLowerCase();
      const matchSearch = !search || m.fullName?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q);
      const enrollmentSlugs = [
        ...(m.enrolledProgram ? [m.enrolledProgram] : []),
        ...m.courseEnrollments.map((e) => e.programSlug),
      ];
      const matchProgram = !programFilter || enrollmentSlugs.includes(programFilter);
      const matchPartner = !partnerFilter || (partnerFilter === '__none' ? !m.partnerReferrals[0]?.partner.id : m.partnerReferrals[0]?.partner.id === partnerFilter);

      // Health calculation (mirrors calculateHealthStatus in lib/admin/healthScore)
      let healthStatus: 'green' | 'yellow' | 'red' | undefined;
      const lastEventAt = lastEventMap.get(m.id) ?? null;
      const recentEventCount = recentEventMap.get(m.id) ?? 0;
      const enrolledAt = m.enrolledAt;
      if (lastEventAt || recentEventCount > 0) {
        healthStatus = 'green';
      } else if (enrolledAt) {
        const enrolledTime = typeof enrolledAt === 'string' ? new Date(enrolledAt).getTime() : enrolledAt.getTime();
        const daysSinceEnrollment = (Date.now() - enrolledTime) / (1000 * 60 * 60 * 24);
        healthStatus = daysSinceEnrollment > 14 ? 'red' : 'yellow';
      } else {
        healthStatus = 'red';
      }
      const matchHealth = !healthFilter || healthStatus === healthFilter;

      const isNotInCourse = !m.enrolledProgram && enrollmentSlugs.length === 0;
      const matchNotInCourse = !notInCourse || isNotInCourse;

      const NEW_MEMBER_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
      const isNew = m.createdAt.getTime() > 0 && Date.now() - m.createdAt.getTime() <= NEW_MEMBER_WINDOW_MS;
      const reasons: string[] = [];
      if (healthStatus === 'red') reasons.push('Inactive');
      if (m.staleTrainingDetectedAt) reasons.push('Stale training');
      if (isNotInCourse) reasons.push('No course');
      if (isNew) reasons.push('New');
      const matchAttention = !needsAttention || reasons.length > 0;

      return matchSearch && matchProgram && matchPartner && matchHealth && matchNotInCourse && matchAttention;
    });

    const headers = [
      'Name',
      'Email',
      'Program',
      'Status',
      'Enrollment Date',
      'Last Login',
      'Placement Status',
    ];

    const rows = filtered.map((m) => {
      const programTitle = m.enrolledProgram ? getProgramBySlug(m.enrolledProgram)?.title ?? m.enrolledProgram : '';
      const status = m.pipelineBoardStage ?? 'Active';
      const placementStatus = m.placementRecord
        ? `Placed at ${m.placementRecord.employerName} — ${m.placementRecord.jobTitle}`
        : 'Not placed';

      return [
        m.fullName,
        m.email,
        programTitle,
        status,
        formatDate(m.enrolledAt),
        formatDate(m.lastLoginAt),
        placementStatus,
      ];
    });

    const lines = [headers.map(csvEscape).join(','), ...rows.map((r) => r.map(csvEscape).join(','))];
    const csv = lines.join('\n');

    await auditLog({
      actorUserId: user.id,
      action: 'admin.export.members',
      targetType: 'MemberRoster',
      metadata: {
        orgId,
        rowCount: filtered.length,
        truncated: members.length >= MAX_EXPORT,
        filters: {
          search: search || null,
          program: programFilter || null,
          partner: partnerFilter || null,
          health: healthFilter || null,
          notInCourse,
          needsAttention,
        },
      },
    });
    await logAuditEvent({
      user: { id: user.id, role: 'admin' },
      verb: 'exported',
      object: { type: 'MemberRoster', id: 'members' },
      result: {
        success: true,
        extensions: {
          orgId,
          rowCount: filtered.length,
          truncated: members.length >= MAX_EXPORT,
          filters: {
            search: search || null,
            program: programFilter || null,
            partner: partnerFilter || null,
            health: healthFilter || null,
            notInCourse,
            needsAttention,
          },
        },
      },
      request: auditRequestMeta(request),
      orgId,
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="students-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error('/api/admin/members/export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
