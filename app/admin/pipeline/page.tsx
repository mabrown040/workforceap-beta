import { prisma } from '@/lib/db/prisma';
import { getPipelineStage, PIPELINE_STAGE_LABELS, PIPELINE_STAGE_COLORS, PIPELINE_STAGES_ORDERED, type PipelineStage } from '@/lib/pipeline/stage';
import Link from 'next/link';
import PageHeader from '@/components/portal/PageHeader';

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
    <div style={{ paddingTop: '1.5rem' }}>
      <PageHeader
        title="Student Pipeline"
        action={<Link href="/admin/placements/new" style={{ padding: '0.5rem 1rem', background: 'var(--color-blue)', color: 'white', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 }}>Record Placement</Link>}
      />

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Active', value: totalActive },
          { label: 'Placed', value: totalPlaced },
          { label: 'Placement Rate', value: totalActive > 0 ? `${Math.round((totalPlaced / totalActive) * 100)}%` : '—' },
          { label: 'Avg Salary', value: avgSalary ? `$${avgSalary.toLocaleString()}` : '—' },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: '1.5rem',
              background: 'var(--color-gray-50)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              minWidth: '120px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.2 }}>{stat.value}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)', marginTop: '0.25rem' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Pipeline columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', overflowX: 'auto' }}>
        {PIPELINE_STAGES_ORDERED.map((stage) => {
          const stageStudents = byStage[stage];
          const color = PIPELINE_STAGE_COLORS[stage];
          return (
            <div key={stage} style={{ minWidth: '160px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color }}>{PIPELINE_STAGE_LABELS[stage]}</span>
                <span style={{ background: color, color: 'white', borderRadius: '999px', fontSize: '0.75rem', padding: '0.1rem 0.5rem', fontWeight: 700 }}>
                  {stageStudents.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {stageStudents.slice(0, 10).map((s) => (
                  <Link
                    key={s.id}
                    href={`/admin/members/${s.id}`}
                    style={{ display: 'block', padding: '0.6rem 0.75rem', border: `1px solid ${color}22`, borderLeft: `3px solid ${color}`, borderRadius: '6px', textDecoration: 'none', color: 'inherit', background: 'white' }}
                  >
                    <div style={{ fontWeight: 500, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.fullName}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-gray-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '0.2rem' }}>
                      {s.email || s.phone || '—'}
                    </div>
                    {s.enrolledProgram && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '0.15rem' }}>
                        {s.enrolledProgram.replace(/-/g, ' ')}
                      </div>
                    )}
                    {stage === 'placed' && s.placementRecord && (
                      <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.15rem' }}>
                        {s.placementRecord.employerName}
                      </div>
                    )}
                  </Link>
                ))}
                {stageStudents.length > 10 && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', textAlign: 'center', padding: '0.25rem' }}>
                    +{stageStudents.length - 10} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}