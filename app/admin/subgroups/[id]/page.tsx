import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { memberProgramProgressPct } from '@/lib/partner/memberProgress';
import { getPipelineStage, PIPELINE_STAGE_LABELS, type PipelineStudent } from '@/lib/pipeline/stage';
import SubgroupMembersTable from '@/components/admin/SubgroupMembersTable';

type Props = { params: Promise<{ id: string }> };

export default async function AdminSubgroupDetailPage({ params }: Props) {
  const { id } = await params;

  const subgroup = await prisma.subgroup.findUnique({
    where: { id },
    include: {
      leader: { select: { id: true, fullName: true, email: true } },
      partner: { select: { id: true, name: true } },
      members: {
        include: {
          member: {
            select: {
              id: true,
              fullName: true,
              email: true,
              enrolledProgram: true,
              enrolledAt: true,
              coursesCompleted: true,
              deletedAt: true,
              assessmentCompleted: true,
              placementRecord: {
                select: { employerName: true, jobTitle: true, salaryOffered: true, placedAt: true },
              },
              userCertifications: { select: { certName: true, earnedAt: true } },
              applications: { select: { status: true, submittedAt: true } },
            },
          },
          assigner: { select: { fullName: true } },
        },
        orderBy: { assignedAt: 'desc' },
      },
    },
  });

  if (!subgroup) notFound();

  const members = subgroup.members
    .filter((ms) => !ms.member.deletedAt)
    .map((ms) => {
      const m = ms.member;
      const program = m.enrolledProgram ? getProgramBySlug(m.enrolledProgram) : null;
      const pct = memberProgramProgressPct(m.enrolledProgram, m.coursesCompleted);
      const student: PipelineStudent = {
        id: m.id,
        fullName: m.fullName,
        email: m.email,
        enrolledProgram: m.enrolledProgram,
        enrolledAt: m.enrolledAt,
        assessmentCompleted: m.assessmentCompleted,
        coursesCompleted: m.coursesCompleted,
        deletedAt: m.deletedAt,
        placementRecord: m.placementRecord,
        userCertifications: m.userCertifications,
        applications: m.applications,
      };
      const stage = getPipelineStage(student);
      return {
        id: m.id,
        fullName: m.fullName,
        email: m.email,
        enrolledProgram: program?.title ?? m.enrolledProgram,
        enrolledAt: m.enrolledAt,
        progressPct: pct,
        stage: PIPELINE_STAGE_LABELS[stage],
        assignedAt: ms.assignedAt,
        assignmentType: ms.assignmentType,
        assignedBy: ms.assigner?.fullName ?? null,
      };
    });

  let completions = 0;
  let placements = 0;
  for (const m of subgroup.members.map((ms) => ms.member)) {
    if (m.deletedAt) continue;
    if (m.placementRecord) placements++;
    const program = m.enrolledProgram ? getProgramBySlug(m.enrolledProgram) : null;
    const done = (m.coursesCompleted as string[] | null) ?? [];
    if (program?.courses.length && program.courses.every((c) => done.includes(c.slug))) completions++;
  }

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <Link href="/admin/subgroups" style={{ color: 'var(--color-accent)', marginBottom: '1rem', display: 'inline-block' }}>
        &larr; Back to Subgroups
      </Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.25rem' }}>{subgroup.name}</h1>
          <p style={{ margin: 0, color: 'var(--color-gray-500)', fontSize: '0.9rem' }}>
            {subgroup.type} · Leader: {subgroup.leader.fullName}
            {subgroup.partner && ` · Linked to ${subgroup.partner.name}`}
          </p>
        </div>
        <Link href={`/admin/subgroups/${id}/edit`} className="btn btn-outline">
          Edit
        </Link>
      </div>

      {subgroup.description && (
        <p style={{ marginBottom: '1.5rem', color: 'var(--color-gray-600)', maxWidth: 600 }}>{subgroup.description}</p>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {[
          { label: 'Total members', value: members.length },
          { label: 'Enrolled', value: members.filter((m) => m.enrolledAt).length },
          { label: 'Completions', value: completions },
          { label: 'Placements', value: placements },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-light)',
            }}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <section>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Members</h2>
        <SubgroupMembersTable subgroupId={id} members={members} />
      </section>
    </div>
  );
}
