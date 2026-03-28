import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { memberProgramProgressPct } from '@/lib/partner/memberProgress';
import { CheckCircle } from 'lucide-react';
import PageHeader from '@/components/portal/PageHeader';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return buildPageMetadata({
    title: 'Member overview',
    description: 'Referred member progress (read-only).',
    path: `/partner/members/${id}`,
  });
}

export default async function PartnerMemberDetailPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner');

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) redirect('/dashboard');

  const { id: memberId } = await params;

  const referral = await prisma.partnerReferral.findFirst({
    where: { partnerId: ctx.partnerId, memberId },
  });
  if (!referral) notFound();

  const member = await prisma.user.findUnique({
    where: { id: memberId, deletedAt: null },
    select: {
      id: true,
      fullName: true,
      enrolledProgram: true,
      enrolledAt: true,
      coursesCompleted: true,
      placementRecord: {
        select: {
          employerName: true,
          jobTitle: true,
          startDate: true,
          salaryOffered: true,
          placedAt: true,
        },
      },
      userCertifications: { select: { certName: true, earnedAt: true }, orderBy: { earnedAt: 'desc' } },
    },
  });

  if (!member) notFound();

  const program = member.enrolledProgram ? getProgramBySlug(member.enrolledProgram) : null;
  const coursesDone = (member.coursesCompleted as string[] | null) ?? [];
  const progressPct = memberProgramProgressPct(member.enrolledProgram, member.coursesCompleted);

  return (
    <div>
      <Link href="/partner" className="partner-nav-back">
        ← Back to partner overview
      </Link>
      <PageHeader
        title={member.fullName}
        subtitle="Read-only overview. Contact information, assessments, and benefit requests are not shown in the partner portal."
      />

      <section className="partner-info-panel">
        <h2>Program</h2>
        <p>
          <strong>Enrolled:</strong> {program?.title ?? '—'}
        </p>
        <p>
          <strong>Enrolled date:</strong> {member.enrolledAt?.toLocaleDateString() ?? '—'}
        </p>
        <p>
          <strong>Overall progress:</strong> {progressPct}%
        </p>
      </section>

      {program && (
        <section className="partner-info-panel">
          <h2>Course completions</h2>
          <ul className="partner-course-list">
            {program.courses.map((c) => (
              <li key={c.slug} className="partner-course-item">
                {coursesDone.includes(c.slug) ? (
                  <CheckCircle size={18} className="partner-course-icon-done" />
                ) : (
                  <span className="partner-course-icon-pending" />
                )}
                {c.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="partner-info-panel">
        <h2>Certifications</h2>
        {member.userCertifications.length === 0 ? (
          <p className="partner-info-panel-empty">None on file yet.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {member.userCertifications.map((c) => (
              <li key={c.certName}>
                {c.certName} — {c.earnedAt.toLocaleDateString()}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="partner-info-panel">
        <h2>Placement</h2>
        {member.placementRecord ? (
          <>
            <p>
              <strong>Employer:</strong> {member.placementRecord.employerName}
            </p>
            <p>
              <strong>Role:</strong> {member.placementRecord.jobTitle}
            </p>
            <p>
              <strong>Placed:</strong> {member.placementRecord.placedAt.toLocaleDateString()}
            </p>
            {member.placementRecord.salaryOffered != null && (
              <p>
                <strong>Salary (annual):</strong> ${member.placementRecord.salaryOffered.toLocaleString()}
              </p>
            )}
          </>
        ) : (
          <p className="partner-info-panel-empty">Not placed yet.</p>
        )}
      </section>
    </div>
  );
}
