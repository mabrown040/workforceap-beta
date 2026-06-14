import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { calculateFitScore } from '@/lib/admin/fitScore';
import { calculateHealthStatus } from '@/lib/admin/healthScore';
import { dataToCsv, csvDownloadResponse, exportFilename } from '@/lib/csv/export';
import { MEMBER_OR_DOGFOOD_WHERE } from '@/lib/admin/memberOnlyWhere';
import { formatPhone } from '@/lib/formatPhone';
import { auditLog } from '@/lib/audit';
import { auditRequestMeta, logAuditEvent } from '@/lib/audit/log';
import { getActorOrganizationId } from '@/lib/tenant/organization';

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const orgId = await getActorOrganizationId(user.id);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() ?? '';
    const programFilter = searchParams.get('program')?.trim() ?? '';
    const partnerFilter = searchParams.get('partner')?.trim() ?? '';
    const healthFilter = searchParams.get('health')?.trim() ?? '';

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      members,
      lastEvents,
      recentEvents,
      canonicalCompletions,
      programProgress,
      activeCourseProgress,
    ] = await Promise.all([
      prisma.user.findMany({
        where: { deletedAt: null, ...MEMBER_OR_DOGFOOD_WHERE },
        orderBy: { createdAt: 'desc' },
        take: 2000,
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          enrolledProgram: true,
          enrolledAt: true,
          assessmentScorePct: true,
          assessmentCompleted: true,
          programInterest: true,
          updatedAt: true,
          createdAt: true,
          courseEnrollments: { select: { programSlug: true, isPrimary: true } },
          profile: {
            select: {
              profilePhone: true,
              profileAddress: true,
              city: true,
              state: true,
              zip: true,
              address: true,
              employmentStatus: true,
              educationLevel: true,
              financialAidInterest: true,
            },
          },
          partnerReferrals: {
            take: 1,
            orderBy: { referredAt: 'desc' },
            select: { partner: { select: { id: true, name: true } } },
          },
        },
      }),
      prisma.memberEvent.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: thirtyDaysAgo } },
        _max: { createdAt: true },
      }),
      prisma.memberEvent.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: thirtyDaysAgo } },
        _count: { _all: true },
      }),
      prisma.courseProgress.groupBy({
        by: ['userId'],
        where: { status: 'COMPLETED' },
        _count: { _all: true },
      }),
      prisma.memberProgramProgress.findMany({
        take: 500,
        select: {
          userId: true,
          programSlug: true,
          averagePercent: true,
          coursesCompleted: true,
          lastUpdatedAt: true,
        },
      }),
      prisma.courseProgress.groupBy({
        by: ['userId'],
        where: { status: { in: ['IN_PROGRESS', 'COMPLETED'] } },
        _count: { _all: true },
      }),
    ]);

    const lastEventMap = new Map<string, Date | null>();
    for (const row of lastEvents) lastEventMap.set(row.userId, row._max.createdAt);

    const recentEventMap = new Map<string, number>();
    for (const row of recentEvents) recentEventMap.set(row.userId, row._count._all);

    const canonicalCompletionMap = new Map<string, number>();
    for (const row of canonicalCompletions) canonicalCompletionMap.set(row.userId, row._count._all);

    const programProgressMap = new Map<string, { averagePercent: number; coursesCompleted: number; lastUpdatedAt: Date }>();
    for (const row of programProgress) {
      programProgressMap.set(`${row.userId}:${row.programSlug}`, {
        averagePercent: row.averagePercent,
        coursesCompleted: row.coursesCompleted,
        lastUpdatedAt: row.lastUpdatedAt,
      });
    }

    const activeCourseCountMap = new Map<string, number>();
    for (const row of activeCourseProgress) activeCourseCountMap.set(row.userId, row._count._all);

    let rows = members.map((m) => {
      const enrollmentProgramSlugs = Array.from(
        new Set<string>([
          ...(m.enrolledProgram ? [m.enrolledProgram] : []),
          ...m.courseEnrollments.map((e) => e.programSlug),
        ]),
      );
      const programTitle = m.enrolledProgram ? getProgramBySlug(m.enrolledProgram)?.title ?? m.enrolledProgram : null;
      const totalCourses = m.enrolledProgram ? getProgramBySlug(m.enrolledProgram)?.courses.length ?? 0 : 0;
      const liveProgress = m.enrolledProgram ? programProgressMap.get(`${m.id}:${m.enrolledProgram}`) ?? null : null;
      const activeCourses = activeCourseCountMap.get(m.id) ?? 0;
      const canonicalCount = canonicalCompletionMap.get(m.id) ?? 0;

      const fitScore = calculateFitScore({
        enrolledProgram: m.enrolledProgram,
        programInterest: m.programInterest,
        assessmentScorePct: m.assessmentScorePct,
        profile: m.profile,
        fullName: m.fullName,
        email: m.email,
        phone: m.phone,
      });

      const healthStatus = calculateHealthStatus({
        lastEventAt: lastEventMap.get(m.id) ?? null,
        recentEventCount: recentEventMap.get(m.id) ?? 0,
        enrolledAt: m.enrolledAt,
      });

      return {
        ...m,
        programTitle,
        totalCourses,
        liveProgress,
        activeCourses,
        coursesCompletedCount: canonicalCount,
        fitScore,
        healthStatus,
        enrollmentProgramSlugs,
        partnerName: m.partnerReferrals[0]?.partner.name ?? null,
        partnerId: m.partnerReferrals[0]?.partner.id ?? null,
      };
    });

    // Apply filters server-side to match what the table shows
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => r.fullName.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
    }
    if (programFilter) {
      rows = rows.filter((r) => r.enrollmentProgramSlugs.includes(programFilter));
    }
    if (partnerFilter) {
      if (partnerFilter === '__none') {
        rows = rows.filter((r) => !r.partnerId);
      } else {
        rows = rows.filter((r) => r.partnerId === partnerFilter);
      }
    }
    if (healthFilter) {
      rows = rows.filter((r) => r.healthStatus === healthFilter);
    }

    const csv = dataToCsv(
      [
        { key: 'name', header: 'Full Name', accessor: (r) => r.fullName },
        { key: 'email', header: 'Email', accessor: (r) => r.email },
        { key: 'phone', header: 'Phone', accessor: (r) => formatPhone(r.profile?.profilePhone ?? r.phone) },
        { key: 'program', header: 'Program', accessor: (r) => r.programTitle ?? '—' },
        { key: 'partner', header: 'Partner', accessor: (r) => r.partnerName ?? '—' },
        { key: 'fitScore', header: 'Fit Score', accessor: (r) => r.fitScore ?? '' },
        { key: 'health', header: 'Health', accessor: (r) => r.healthStatus ?? '' },
        { key: 'enrolledAt', header: 'Enrolled', accessor: (r) => r.enrolledAt },
        { key: 'assessmentScore', header: 'Assessment Score', accessor: (r) => r.assessmentScorePct != null ? `${r.assessmentScorePct}%` : '' },
        { key: 'training', header: 'Training', accessor: (r) => {
          if (r.liveProgress) return `${r.liveProgress.averagePercent}% · ${r.liveProgress.coursesCompleted}/${r.totalCourses} done · ${r.activeCourses} active`;
          if (r.assessmentCompleted) return `${r.coursesCompletedCount}/${r.totalCourses}`;
          return '—';
        }},
        { key: 'lastActive', header: 'Last Active', accessor: (r) => r.updatedAt },
        { key: 'signupDate', header: 'Signup Date', accessor: (r) => r.createdAt },
        { key: 'city', header: 'City', accessor: (r) => r.profile?.city ?? '' },
        { key: 'state', header: 'State', accessor: (r) => r.profile?.state ?? '' },
        { key: 'employment', header: 'Employment Status', accessor: (r) => r.profile?.employmentStatus ?? '' },
        { key: 'education', header: 'Education Level', accessor: (r) => r.profile?.educationLevel ?? '' },
      ],
      rows,
      { reportTitle: 'Member Directory Export', notes: 'Filtered admin member list — Workforce Advancement Project' },
    );

    const filename = exportFilename('members');

    // Federal grant programs (WIOA) require an audit trail on every PII
    // export. Without this the admin roster can be siphoned with no record.
    // AUDIT §H-DEP4.
    try {
      await auditLog({
        actorUserId: user.id,
        action: 'admin.export.members',
        targetType: 'MemberRoster',
        metadata: {
          orgId,
          rowCount: rows.length,
          truncated: members.length >= 2000,
          filters: {
            search: search || null,
            program: programFilter || null,
            partner: partnerFilter || null,
            health: healthFilter || null,
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
            rowCount: rows.length,
            truncated: members.length >= 2000,
            filters: {
              search: search || null,
              program: programFilter || null,
              partner: partnerFilter || null,
              health: healthFilter || null,
            },
          },
        },
        request: auditRequestMeta(request),
        orgId,
      });
    } catch (err) {
      console.error('[admin/members/export] audit log failed:', err);
      return NextResponse.json(
        { error: 'Export audit failed — member data not delivered. Please retry or contact support.' },
        { status: 503 }
      );
    }

    return csvDownloadResponse(csv, filename, { truncated: members.length >= 2000, limit: 2000 });
  } catch (error) {
    console.error('[admin/members/export] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
