import { redirect } from 'next/navigation';
import MobileBottomNav from '@/components/MobileBottomNav';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

export default async function MentorProfilePage({ params }: { params: Promise<{ mentorId: string }> }) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/mentors');

  const { mentorId } = await params;
  const mentor = await prisma.mentor.findUnique({
    where: { id: mentorId },
    select: { id: true, fullName: true, title: true, company: true, industry: true, bio: true, linkedinUrl: true },
  });

  if (!mentor || !mentor.id) redirect('/dashboard/mentors');

  return (
    <>
      {/* Mobile */}
      <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem', padding: '1rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{mentor.fullName}</h1>
        <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{mentor.title}</div>
        <div style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{mentor.company} · {mentor.industry}</div>
        <p style={{ lineHeight: 1.6 }}>{mentor.bio}</p>
        {mentor.linkedinUrl ? (
          <a href={mentor.linkedinUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: '0.75rem', color: 'var(--color-accent)' }}>LinkedIn Profile</a>
        ) : null}

        <form action={`/api/mentors/${mentor.id}/sessions`} method="POST" style={{ marginTop: '1rem', display: 'grid', gap: '0.6rem' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 0 }}>Request a Session</h2>
          <input name="preferredDate" type="datetime-local" required style={{ border: '1px solid var(--border-subtle)', borderRadius: '0.5rem', padding: '0.55rem' }} />
          <textarea name="topic" placeholder="Topic" rows={3} required style={{ border: '1px solid var(--border-subtle)', borderRadius: '0.5rem', padding: '0.55rem' }} />
          <button type="submit" style={{ border: 0, borderRadius: '0.5rem', padding: '0.6rem 0.8rem', fontWeight: 600, background: 'var(--color-accent)', color: '#fff' }}>Request a Session</button>
        </form>
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

        <form action={`/api/mentors/${mentor.id}/sessions`} method="POST" style={{ marginTop: '1.25rem', display: 'grid', gap: '0.75rem', maxWidth: '32rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 0 }}>Request a Session</h2>
          <input name="preferredDate" type="datetime-local" required style={{ border: '1px solid var(--border-subtle)', borderRadius: '0.5rem', padding: '0.6rem' }} />
          <textarea name="topic" placeholder="Topic" rows={4} required style={{ border: '1px solid var(--border-subtle)', borderRadius: '0.5rem', padding: '0.6rem' }} />
          <button type="submit" style={{ border: 0, borderRadius: '0.5rem', padding: '0.65rem 0.9rem', fontWeight: 600, background: 'var(--color-accent)', color: '#fff' }}>Request a Session</button>
        </form>
      </div>
    </>
  );
}
