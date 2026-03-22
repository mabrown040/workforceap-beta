import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getSubgroupsForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { memberProgramProgressPct } from '@/lib/partner/memberProgress';
import { getPipelineStage, PIPELINE_STAGE_LABELS, type PipelineStudent } from '@/lib/pipeline/stage';
import PageHeader from '@/components/portal/PageHeader';

export const metadata: Metadata = buildPageMetadata({
  title: 'Member Detail',
  description: 'View member progress in your subgroup.',
  path: '/my-group',
});

type Props = { params: Promise<{ id: string }> };

export default async function MyGroupMemberDetailPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/my-group');

  let subgroups: { subgroupId: string }[];
  try {
    subgroups = await getSubgroupsForUser(user.id);
  } catch {
    redirect('/dashboard');
  }
  if (subgroups.length === 0) redirect('/dashboard');

  const { id: memberId } = await params;
  const memberSubgroup = await prisma.memberSubgroup.findFirst({
    where: {
      memberId,
      subgroupId: { in: subgroups.map((s) => s.subgroupId) },
    },
    include: {
      member: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          enrolledProgram: true,
          enrolledAt: true,
          coursesCompleted: true,
          updatedAt: true,
          deletedAt: true,
          assessmentCompleted: true,
          profile: { select: { profileLinkedin: true } },
          placementRecord: {
            select: { employerName: true, jobTitle: true, salaryOffered: true, placedAt: true },
          },
          userCertifications: { select: { certName: true, earnedAt: true } },
          applications: { select: { status: true, submittedAt: true } },
        },
      },
    },
  });

  if (!memberSubgroup || memberSubgroup.member.deletedAt) notFound();

  const m = memberSubgroup.member;
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
  const coursesCompleted = (m.coursesCompleted as string[] | null) ?? [];
  const completedCount = program ? coursesCompleted.filter((s) => program.courses.some((c) => c.slug === s)).length : 0;

  return (
    <div>
      <Link href="/my-group" style={{ color: 'var(--color-accent)', marginBottom: '1rem', display: 'inline-block' }}>
        &larr; Back to My Group
      </Link>
      <PageHeader title={m.fullName} subtitle={m.email} />

      <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '800px', marginTop: '1.5rem' }}>
        <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Program</h2>
          <p><strong>Enrolled:</strong> {program?.title ?? m.enrolledProgram ?? '—'}</p>
          <p><strong>Enrolled date:</strong> {m.enrolledAt?.toLocaleDateString() ?? '—'}</p>
          <p><strong>Progress:</strong> {pct}%</p>
          <p><strong>Course progress:</strong> {completedCount} of {program?.courses.length ?? 0} complete</p>
          <p><strong>Status:</strong> {PIPELINE_STAGE_LABELS[stage]}</p>
        </section>

        {m.placementRecord && (
          <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Placement</h2>
            <p><strong>Employer:</strong> {m.placementRecord.employerName}</p>
            <p><strong>Job title:</strong> {m.placementRecord.jobTitle}</p>
            <p><strong>Placed:</strong> {m.placementRecord.placedAt.toLocaleDateString()}</p>
            {m.placementRecord.salaryOffered && (
              <p><strong>Salary offered:</strong> ${m.placementRecord.salaryOffered.toLocaleString()}</p>
            )}
          </section>
        )}

        {m.userCertifications && m.userCertifications.length > 0 && (
          <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Certifications</h2>
            <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
              {m.userCertifications.map((c) => (
                <li key={c.certName}>
                  {c.certName} — {c.earnedAt.toLocaleDateString()}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
