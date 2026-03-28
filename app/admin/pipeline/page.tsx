import { prisma } from '@/lib/db/prisma';
import { getPipelineStage, PIPELINE_STAGE_LABELS, PIPELINE_STAGE_COLORS, PIPELINE_STAGES_ORDERED, type PipelineStage } from '@/lib/pipeline/stage';
import Link from 'next/link';
import PageHeader from '@/components/portal/PageHeader';

import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin - Hiring Pipeline',
  description: 'View and manage the hiring pipeline.',
  path: '/admin/pipeline',
});

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

  // Group by pipeline stage
  const byStage: Record<PipelineStage, typeof students> = {
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
    byStage[stage].push(s);
  }

  const totalActive = students.filter((s) => !s.deletedAt).length;
  const totalPlaced = byStage.placed.length;
  const placedWithSalary = byStage.placed.filter((s) => s.placementRecord?.salaryOffered);
  const avgSalary = placedWithSalary.length > 0
    ? Math.round(placedWithSalary.reduce((sum, s) => sum + (s.placementRecord?.salaryOffered ?? 0), 0) / placedWithSalary.length)
    : null;

  return (
    <div className="pipeline-page-wrap">
      <PageHeader
        title="Student Pipeline"
        action={<Link href="/admin/placements/new" className="pipeline-record-btn">Record Placement</Link>}
      />

      {/* Stats bar */}
      <div className="pipeline-stats-bar">
        {[
          { label: 'Total Active', value: totalActive },
          { label: 'Placed', value: totalPlaced },
          { label: 'Placement Rate', value: totalActive > 0 ? `${Math.round((totalPlaced / totalActive) * 100)}%` : '—' },
          { label: 'Avg Salary', value: avgSalary ? `$${avgSalary.toLocaleString()}` : '—' },
        ].map((stat) => (
          <div key={stat.label} className="pipeline-stat-card">
            <div className="pipeline-stat-value">{stat.value}</div>
            <div className="pipeline-stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Pipeline columns */}
      <div className="pipeline-columns">
        {PIPELINE_STAGES_ORDERED.map((stage) => {
          const stageStudents = byStage[stage];
          const color = PIPELINE_STAGE_COLORS[stage];
          return (
            <div key={stage} className="pipeline-column">
              <div className="pipeline-column-header">
                <span className="pipeline-column-title" style={{ color }}>{PIPELINE_STAGE_LABELS[stage]}</span>
                <span style={{ background: color, color: 'white', borderRadius: '999px', fontSize: '0.75rem', padding: '0.1rem 0.5rem', fontWeight: 700 }}>
                  {stageStudents.length}
                </span>
              </div>
              <div className="pipeline-column-cards">
                {stageStudents.slice(0, 10).map((s) => (
                  <Link
                    key={s.id}
                    href={`/admin/members/${s.id}`}
                    className="pipeline-member-card"
                    style={{ border: `1px solid ${color}22`, borderLeft: `3px solid ${color}` }}
                  >
                    <div className="pipeline-member-card__name">{s.fullName}</div>
                    <div className="pipeline-member-card__sub">{s.email || s.phone || '—'}</div>
                    {s.enrolledProgram && (
                      <div className="pipeline-member-card__program">{s.enrolledProgram.replace(/-/g, ' ')}</div>
                    )}
                    {stage === 'placed' && s.placementRecord && (
                      <div className="pipeline-member-card__employer">{s.placementRecord.employerName}</div>
                    )}
                  </Link>
                ))}
                {stageStudents.length > 10 && (
                  <div className="pipeline-more">+{stageStudents.length - 10} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
