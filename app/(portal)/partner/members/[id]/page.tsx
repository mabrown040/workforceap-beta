import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';

type Props = { params: Promise<{ id: string }> };

export default async function PartnerMemberDetailPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner');

  const partnerUser = await getPartnerForUser(user.id);
  if (!partnerUser) redirect('/dashboard');

  const { id } = await params;

  // Verify this member belongs to the partner
  const referral = await prisma.partnerReferral.findUnique({
    where: { partnerId_memberId: { partnerId: partnerUser.partnerId, memberId: id } },
  });
  if (!referral) notFound();

  const member = await prisma.user.findUnique({
    where: { id, deletedAt: null },
    select: {
      id: true,
      fullName: true,
      enrolledProgram: true,
      enrolledAt: true,
      coursesCompleted: true,
      userCertifications: { select: { certName: true, earnedAt: true }, orderBy: { earnedAt: 'desc' } },
      placementRecord: { select: { employerName: true, jobTitle: true, startDate: true } },
    },
  });

  if (!member) notFound();

  const program = member.enrolledProgram ? getProgramBySlug(member.enrolledProgram) : null;
  const coursesCompleted = (member.coursesCompleted as string[] | null) ?? [];

  return (
    <div style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
      <Link href="/partner" style={{ color: 'var(--color-accent)', marginBottom: '1rem', display: 'inline-block', textDecoration: 'none' }}>
        &larr; Back to Dashboard
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.8rem', background: 'var(--color-accent)', color: 'white', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>Partner View</span>
      </div>

      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{member.fullName}</h1>
      <p style={{ color: 'var(--color-gray-500)', marginBottom: '2rem' }}>Read-only member progress view</p>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {/* Program Info */}
        <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Program</h2>
          <p><strong>Enrolled:</strong> {program?.title ?? member.enrolledProgram ?? 'No program assigned'}</p>
          <p><strong>Enrolled date:</strong> {member.enrolledAt?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) ?? 'N/A'}</p>
        </section>

        {/* Course Completion Checklist */}
        {program && (
          <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>
              Course Progress ({coursesCompleted.filter((s) => program.courses.some((c) => c.slug === s)).length} of {program.courses.length})
            </h2>
            <ul style={{ paddingLeft: '0', listStyle: 'none', margin: 0 }}>
              {program.courses.map((c) => (
                <li key={c.slug} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                  {coursesCompleted.includes(c.slug)
                    ? <span style={{ color: 'var(--color-green, #4a9b4f)', fontWeight: 700 }}>&#10003;</span>
                    : <span style={{ color: 'var(--color-gray-300)' }}>&#9675;</span>}
                  {c.name}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Certifications */}
        <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Certifications</h2>
          {member.userCertifications.length === 0 ? (
            <p style={{ color: 'var(--color-gray-500)', fontSize: '0.9rem' }}>No certifications earned yet.</p>
          ) : (
            <ul style={{ paddingLeft: '1.25rem', margin: 0 }}>
              {member.userCertifications.map((cert) => (
                <li key={cert.certName} style={{ marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                  {cert.certName} — {cert.earnedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Placement Status */}
        <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Placement Status</h2>
          {member.placementRecord ? (
            <div>
              <p><strong>Employer:</strong> {member.placementRecord.employerName}</p>
              <p><strong>Position:</strong> {member.placementRecord.jobTitle}</p>
              {member.placementRecord.startDate && (
                <p><strong>Start date:</strong> {member.placementRecord.startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              )}
            </div>
          ) : (
            <p style={{ color: 'var(--color-gray-500)', fontSize: '0.9rem' }}>Not yet placed.</p>
          )}
        </section>
      </div>
    </div>
  );
}
