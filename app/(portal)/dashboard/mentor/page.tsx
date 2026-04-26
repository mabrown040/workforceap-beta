import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import MobileBottomNav from '@/components/MobileBottomNav';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

export const metadata: Metadata = buildPageMetadata({
  title: 'Mentor Dashboard',
  description: 'Manage your upcoming mentor sessions and availability.',
  path: '/dashboard/mentor',
});

export default async function MentorDashboardPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/mentor');

  const mentor = await prisma.mentor.findUnique({
    where: { userId: user.id },
    include: {
      sessions: {
        where: { scheduledAt: { gte: new Date() } },
        orderBy: { scheduledAt: 'asc' },
        include: { member: { select: { fullName: true } } },
      },
    },
  });

  if (!mentor) redirect('/mentor/apply');

  return (
    <>
      {/* Mobile */}
      <div className="md:wa-hidden" style={{ paddingBottom: '6rem', padding: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Mentor Dashboard</h1>
        <div style={{ marginTop: '0.75rem', border: '1px solid var(--border-subtle)', borderRadius: '0.75rem', padding: '0.9rem' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Total Hours Donated</div>
          <div style={{ fontSize: '1.9rem', fontWeight: 700 }}>{mentor.totalHoursDonated.toFixed(1)}</div>
        </div>
        <h2 style={{ marginTop: '1rem', fontWeight: 700 }}>Upcoming Sessions</h2>
        <div style={{ display: 'grid', gap: '0.6rem' }}>
          {mentor.sessions.map((s) => (
            <div key={s.id} style={{ border: '1px solid var(--border-subtle)', borderRadius: '0.6rem', padding: '0.65rem' }}>
              <div style={{ fontWeight: 600 }}>{s.member.fullName}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{new Date(s.scheduledAt).toLocaleString()} · {s.durationMin} min</div>
            </div>
          ))}
        </div>
        <Link href={`/api/mentor/letter?mentorId=${mentor.id}`} style={{ display: 'inline-block', marginTop: '0.9rem', textDecoration: 'none', borderRadius: '0.5rem', padding: '0.6rem 0.8rem', fontWeight: 600, background: 'var(--color-accent)', color: '#fff' }}>
          Download Volunteer Letter
        </Link>
        <MobileBottomNav variant="portal" />
      </div>

      {/* Desktop */}
      <div className="wa-hidden md:wa-block" style={{ padding: '1.5rem', maxWidth: '64rem' }}>
        <h2 aria-hidden="true" style={{ fontSize: '2rem', fontWeight: 700 }}>Mentor Dashboard</h2>
        <div style={{ marginTop: '1rem', border: '1px solid var(--border-subtle)', borderRadius: '0.75rem', padding: '1rem', maxWidth: '16rem' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Total Hours Donated</div>
          <div style={{ fontSize: '2.2rem', fontWeight: 700 }}>{mentor.totalHoursDonated.toFixed(1)}</div>
        </div>
        <h2 style={{ marginTop: '1.2rem', fontWeight: 700 }}>Upcoming Sessions</h2>
        <div style={{ display: 'grid', gap: '0.65rem', maxWidth: '42rem' }}>
          {mentor.sessions.map((s) => (
            <div key={s.id} style={{ border: '1px solid var(--border-subtle)', borderRadius: '0.6rem', padding: '0.7rem' }}>
              <div style={{ fontWeight: 600 }}>{s.member.fullName}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{new Date(s.scheduledAt).toLocaleString()} · {s.durationMin} min · {s.status}</div>
            </div>
          ))}
        </div>
        <Link href={`/api/mentor/letter?mentorId=${mentor.id}`} style={{ display: 'inline-block', marginTop: '1rem', textDecoration: 'none', borderRadius: '0.5rem', padding: '0.65rem 0.9rem', fontWeight: 600, background: 'var(--color-accent)', color: '#fff' }}>
          Download Volunteer Letter
        </Link>
      </div>
    </>
  );
}
