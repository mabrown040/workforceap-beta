import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import MobileBottomNav from '@/components/MobileBottomNav';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

export const metadata: Metadata = buildPageMetadata({
  title: 'Find a Mentor',
  description: 'Browse WorkforceAP mentors and request a session with someone in your field.',
  path: '/dashboard/mentors',
});

export default async function MentorsBrowsePage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/mentors');

  const mentors = await prisma.mentor.findMany({
    where: { isActive: true, approvedAt: { not: null } },
    orderBy: { fullName: 'asc' },
    select: { id: true, fullName: true, title: true, company: true, industry: true },
  });

  return (
    <>
      {/* Mobile */}
      <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem', padding: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Find a Mentor</h1>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {mentors.map((mentor) => (
            <div key={mentor.id} style={{ border: '1px solid var(--border-subtle)', borderRadius: '0.75rem', padding: '0.9rem', background: 'var(--surface-container-lowest)' }}>
              <div style={{ fontWeight: 700 }}>{mentor.fullName}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{mentor.title}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{mentor.company} · {mentor.industry}</div>
              <Link href={`/dashboard/mentors/${mentor.id}`} style={{ display: 'inline-block', marginTop: '0.6rem', textDecoration: 'none', background: 'var(--color-accent)', color: '#fff', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontWeight: 600 }}>
                Request Session
              </Link>
            </div>
          ))}
        </div>
        <MobileBottomNav variant="portal" />
      </div>

      {/* Desktop */}
      <div className="wa-hidden wa-md:wa-block" style={{ padding: '1.5rem' }}>
        <h2 aria-hidden="true" style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '1rem' }}>Find a Mentor</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1rem' }}>
          {mentors.map((mentor) => (
            <div key={mentor.id} style={{ border: '1px solid var(--border-subtle)', borderRadius: '0.75rem', padding: '1rem', background: 'var(--surface-container-lowest)' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{mentor.fullName}</div>
              <div style={{ color: 'var(--text-secondary)' }}>{mentor.title}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{mentor.company} · {mentor.industry}</div>
              <Link href={`/dashboard/mentors/${mentor.id}`} style={{ display: 'inline-block', marginTop: '0.75rem', textDecoration: 'none', background: 'var(--color-accent)', color: '#fff', padding: '0.55rem 0.85rem', borderRadius: '0.5rem', fontWeight: 600 }}>
                Request Session
              </Link>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
