import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getSubgroupsForUser } from '@/lib/auth/roles';
import { getProgramBySlug } from '@/lib/content/programs';
import { memberProgramProgressPct } from '@/lib/partner/memberProgress';
import { getPipelineStage, PIPELINE_STAGE_LABELS, type PipelineStudent } from '@/lib/pipeline/stage';
import { prisma } from '@/lib/db/prisma';
import MyGroupMembersTable from '@/components/portal/MyGroupMembersTable';

export const metadata: Metadata = buildPageMetadata({
  title: 'My Group',
  description: 'View members in your subgroup.',
  path: '/my-group',
});

export default async function MyGroupPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/my-group');

  let subgroups: { subgroupId: string; subgroup: { id: string; name: string; type: string } }[];
  try {
    subgroups = await getSubgroupsForUser(user.id);
  } catch {
    redirect('/dashboard');
  }
  if (subgroups.length === 0) redirect('/dashboard');

  const subgroupIds = subgroups.map((s) => s.subgroupId);
  const memberSubgroups = await prisma.memberSubgroup.findMany({
    where: { subgroupId: { in: subgroupIds } },
    include: {
      member: {
        select: {
          id: true,
          fullName: true,
          email: true,
          enrolledProgram: true,
          enrolledAt: true,
          coursesCompleted: true,
          updatedAt: true,
          deletedAt: true,
          assessmentCompleted: true,
          placementRecord: {
            select: { employerName: true, jobTitle: true, salaryOffered: true, placedAt: true },
          },
          userCertifications: { select: { certName: true, earnedAt: true } },
          applications: { select: { status: true, submittedAt: true } },
        },
      },
    },
  });

  const seen = new Set<string>();
  const members = memberSubgroups
    .filter((ms) => !ms.member.deletedAt && !seen.has(ms.member.id))
    .map((ms) => {
      seen.add(ms.member.id);
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
      const done = (m.coursesCompleted as string[] | null) ?? [];
      const isCompleted = program?.courses.length ? program.courses.every((c) => done.includes(c.slug)) : false;
      return {
        id: m.id,
        fullName: m.fullName,
        email: m.email,
        enrolledProgram: program?.title ?? m.enrolledProgram,
        enrolledAt: m.enrolledAt,
        progressPct: pct,
        stageKey: stage,
        stage: PIPELINE_STAGE_LABELS[stage],
        placementRecord: m.placementRecord,
        updatedAt: m.updatedAt,
        isCompleted,
      };
    });

  const total = members.length;
  const enrolled = members.filter((m) => m.enrolledAt).length;
  const inTraining = members.filter((m) => m.stageKey === 'in_training' || m.stageKey === 'certified').length;
  const completed = members.filter((m) => m.isCompleted).length;
  const placed = members.filter((m) => m.placementRecord).length;

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>My Group</h1>
      <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem' }}>
        Members assigned to your subgroup. View progress and placement status.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {[
          { label: 'Total members', value: total },
          { label: 'Enrolled', value: enrolled },
          { label: 'In training', value: inTraining },
          { label: 'Completed', value: completed },
          { label: 'Placed', value: placed },
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

      <MyGroupMembersTable
        members={members.map((m) => ({
          ...m,
          updatedAtLabel: m.updatedAt ? new Date(m.updatedAt).toLocaleDateString() : '—',
          placementRecord: m.placementRecord
            ? { ...m.placementRecord, placedAt: m.placementRecord.placedAt.toISOString() }
            : null,
        }))}
      />

      {members.length === 0 && (
        <p style={{ color: 'var(--color-gray-500)', marginBottom: '2rem' }}>No members in your subgroup yet.</p>
      )}
    </div>
  );
}
