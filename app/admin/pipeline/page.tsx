import { prisma } from '@/lib/db/prisma';
import { getPipelineStage, type PipelineStage } from '@/lib/pipeline/stage';
import Link from 'next/link';
import PageHeader from '@/components/portal/PageHeader';
import AdminPipelineKanban, {
  type PipelineKanbanMember,
} from '@/components/admin/AdminPipelineKanban';

import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin - Hiring Pipeline',
  description: 'View and manage the hiring pipeline.',
  path: '/admin/pipeline',
});

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
  const students = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      enrolledProgram: true,
      enrolledAt: true,
      assessmentCompleted: true,
      coursesCompleted: true,
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
    },
  });

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

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <PageHeader
        title="Student Pipeline"
        subtitle="Drag cards between columns like a Trello board. Positions are saved for all admins. With no manual column set, a student’s stage is derived from enrollment, courses, certifications, and placement."
        action={
          <Link
            href="/admin/placements/new"
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--color-blue)',
              color: 'white',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Record Placement
          </Link>
        }
      />

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Active', value: totalActive },
          { label: 'Placed', value: totalPlaced },
          {
            label: 'Placement Rate',
            value: totalActive > 0 ? `${Math.round((totalPlaced / totalActive) * 100)}%` : '—',
          },
          { label: 'Avg Salary', value: avgSalary ? `$${avgSalary.toLocaleString()}` : '—' },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: '1.5rem',
              background: 'var(--surface-container)',
              borderRadius: '8px',
              minWidth: '120px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.2 }}>{stat.value}</div>
            <div
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-on-surface-variant)',
                marginTop: '0.25rem',
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <AdminPipelineKanban initialByStage={initialByStage} />
    </div>
  );
}
