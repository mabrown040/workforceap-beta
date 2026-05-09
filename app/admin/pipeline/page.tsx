import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { getPipelineStage, type PipelineStage } from '@/lib/pipeline/stage';
import Link from 'next/link';
import PageHeader from '@/components/portal/PageHeader';
import PortalKpiCard from '@/components/portal/PortalKpiCard';
import AdminPipelineKanban, {
  type PipelineKanbanMember,
} from '@/components/admin/AdminPipelineKanban';
import AdminDataLoadError from '@/components/admin/AdminDataLoadError';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { MEMBER_OR_DOGFOOD_WHERE } from '@/lib/admin/memberOnlyWhere';
import { getStaleApplications } from '@/lib/data/applications';
import StaleApplicationsBanner from './StaleApplicationsBanner';

import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Admin - Hiring Pipeline',
  description: 'View and manage the hiring pipeline.',
  path: '/admin/pipeline',
});
}

function toKanbanMember(s: {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  enrolledProgram: string | null;
  placementRecord: {
    employerName: string;
    jobTitle: string;
    salaryOffered: number | null;
  } | null;
}): PipelineKanbanMember {
  return {
    id: s.id,
    fullName: s.fullName,
    email: s.email,
    phone: s.phone,
    enrolledProgram: s.enrolledProgram,
    placementRecord: s.placementRecord
      ? {
          employerName: s.placementRecord.employerName,
          jobTitle: s.placementRecord.jobTitle,
          salaryOffered: s.placementRecord.salaryOffered,
        }
      : null,
  };
}

export default async function AdminPipelinePage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/pipeline');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  let students;
  try {
    students = await prisma.user.findMany({
      where: { deletedAt: null, ...MEMBER_OR_DOGFOOD_WHERE },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        enrolledProgram: true,
        enrolledAt: true,
        assessmentCompleted: true,
        deletedAt: true,
        createdAt: true,
        pipelineBoardStage: true,
        placementRecord: {
          select: { employerName: true, jobTitle: true, salaryOffered: true, placedAt: true },
        },
        userCertifications: {
          select: { certName: true, earnedAt: true },
        },
        applications: {
          select: { status: true, submittedAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        memberProgramProgress: {
          select: { programSlug: true, averagePercent: true, coursesCompleted: true },
        },
      },
    });
  } catch (e) {
    console.error('[admin/pipeline] load failed', e);
    return <AdminDataLoadError title="Pipeline unavailable" message="We could not load pipeline data. Try again shortly." />;
  }

  const byStage: Record<PipelineStage, PipelineKanbanMember[]> = {
    applied: [],
    enrolled: [],
    in_training: [],
    certified: [],
    job_searching: [],
    placed: [],
    closed: [],
  };

  for (const s of students) {
    const stage = getPipelineStage(s);
    byStage[stage].push(toKanbanMember(s));
  }

  const totalActive = students.length;
  const totalPlaced = byStage.placed.length;
  const placedWithSalary = byStage.placed.filter((s) => s.placementRecord?.salaryOffered);
  const avgSalary =
    placedWithSalary.length > 0
      ? Math.round(
          placedWithSalary.reduce((sum, s) => sum + (s.placementRecord?.salaryOffered ?? 0), 0) /
            placedWithSalary.length
        )
      : null;

  const initialByStage = JSON.parse(JSON.stringify(byStage)) as Record<PipelineStage, PipelineKanbanMember[]>;
  const staleApps = await getStaleApplications();

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <PageHeader
        title="Member Pipeline"
        subtitle="Drag cards between columns like a Trello board. Positions are saved for all admins. With no manual column set, a member's stage is derived from enrollment, courses, certifications, and placement."
        action={
          <Link href="/admin/placements/new" className="btn btn-primary">
            Record Placement
          </Link>
        }
      />

      <div className="portal-grid-metrics" style={{ marginBottom: '1.5rem' }}>
        <PortalKpiCard label="Total Active" value={totalActive} accent="neutral" />
        <PortalKpiCard label="Placed" value={totalPlaced} accent="green" />
        <PortalKpiCard
          label="Placement Rate"
          value={totalActive > 0 ? `${Math.round((totalPlaced / totalActive) * 100)}%` : '-'}
          accent="blue"
        />
        <PortalKpiCard label="Avg Salary" value={avgSalary ? `$${avgSalary.toLocaleString()}` : '-'} accent="gold" />
      </div>

      <StaleApplicationsBanner staleApps={staleApps} />

      <AdminPipelineKanban initialByStage={initialByStage} />
    </div>
  );
}
