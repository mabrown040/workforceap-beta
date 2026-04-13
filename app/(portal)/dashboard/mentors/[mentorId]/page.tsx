import { redirect } from 'next/navigation';
import MobileBottomNav from '@/components/MobileBottomNav';
import MentorSessionForm from '@/components/portal/MentorSessionForm';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

export default async function MentorProfilePage({ params }: { params: Promise<{ mentorId: string }> }) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/mentors');

  const { mentorId } = await params;
  const mentor = await prisma.mentor.findFirst({
    where: { id: mentorId, isActive: true, approvedAt: { not: null } },
    select: { id: true, fullName: true, title: true, company: true, industry: true, bio: true, linkedinUrl: true },
  });

  if (!mentor || !mentor.id) redirect('/dashboard/mentors');

  return (
    <>
      {/* Mobile */}
      <div className="wa-md:wa-hidden" style={{ padding: '1rem', paddingBottom: '6rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{mentor.fullName}</h1>
        <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{mentor.title}</div>
        <div style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{mentor.company} · {mentor.industry}</div>
        <p style={{ lineHeight: 1.6 }}>{mentor.bio}</p>
        {mentor.linkedinUrl ? (
          <a href={mentor.linkedinUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: '0.75rem', color: 'var(--color-accent)' }}>LinkedIn Profile</a>
        ) : null}

        <MentorSessionForm mentorId={mentor.id} />
        <MobileBottomNav variant="portal" />
      </div>

      {/* Desktop */}
      <div className="wa-hidden wa-md:wa-block" style={{ padding: '1.5rem', maxWidth: '52rem' }}>
        <h1 style={{ fontSize: '1.9rem', fontWeight: 700 }}>{mentor.fullName}</h1>
        <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{mentor.title}</div>
        <div style={{ color: 'var(--text-secondary)', marginBottom: '0.9rem' }}>{mentor.company} · {mentor.industry}</div>
        <p style={{ lineHeight: 1.7 }}>{mentor.bio}</p>
        {mentor.linkedinUrl ? (
          <a href={mentor.linkedinUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: '0.75rem', color: 'var(--color-accent)' }}>LinkedIn Profile</a>
        ) : null}

        <div style={{ marginTop: '1.25rem', maxWidth: '32rem' }}>
          <MentorSessionForm mentorId={mentor.id} />
        </div>
      </div>
    </>
  );
}
