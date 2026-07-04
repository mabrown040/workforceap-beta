import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
    title: t('mentorMetaTitle'),
    description: t('mentorMetaDesc'),
    path: '/dashboard/mentor',
  });
}

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
      <h1 className="wa-sr-only">Mentor dashboard</h1>
      {/* Mobile */}
      <div className="md:wa-hidden" style={{ paddingBottom: '6rem', padding: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Mentor Dashboard</h2>
        <div style={{ marginTop: '0.75rem', border: '1px solid var(--outline-variant)', borderRadius: '0.75rem', padding: '0.9rem' }}>
          <div style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>Total Hours Donated</div>
          <div style={{ fontSize: '1.9rem', fontWeight: 700 }}>{mentor.totalHoursDonated.toFixed(1)}</div>
        </div>
        <h2 style={{ marginTop: '1rem', fontWeight: 700 }}>Upcoming Sessions</h2>
        {mentor.sessions.length === 0 ? (
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Nothing on the calendar yet. When a member requests a session with you, it&rsquo;ll show up here.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {mentor.sessions.map((s) => (
              <div key={s.id} style={{ border: '1px solid var(--outline-variant)', borderRadius: '0.6rem', padding: '0.65rem' }}>
                <div style={{ fontWeight: 600 }}>{s.member.fullName}</div>
                <div style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.85rem' }}>{new Date(s.scheduledAt).toLocaleString()} · {s.durationMin} min</div>
              </div>
            ))}
          </div>
        )}
        <Link
          href={`/api/mentor/letter?mentorId=${mentor.id}`}
          className="btn btn-primary"
          style={{ marginTop: '0.9rem' }}
        >
          Download Volunteer Letter
        </Link>      </div>

      {/* Desktop */}
      <div className="wa-hidden md:wa-block" style={{ padding: '1.5rem', maxWidth: '64rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700 }}>Mentor Dashboard</h2>
        <div style={{ marginTop: '1rem', border: '1px solid var(--outline-variant)', borderRadius: '0.75rem', padding: '1rem', maxWidth: '16rem' }}>
          <div style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.95rem' }}>Total Hours Donated</div>
          <div style={{ fontSize: '2.2rem', fontWeight: 700 }}>{mentor.totalHoursDonated.toFixed(1)}</div>
        </div>
        <h2 style={{ marginTop: '1.2rem', fontWeight: 700 }}>Upcoming Sessions</h2>
        {mentor.sessions.length === 0 ? (
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.95rem', lineHeight: 1.5, maxWidth: '42rem' }}>
            Nothing on the calendar yet. When a member requests a session with you, it&rsquo;ll show up here.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '0.65rem', maxWidth: '42rem' }}>
            {mentor.sessions.map((s) => (
              <div key={s.id} style={{ border: '1px solid var(--outline-variant)', borderRadius: '0.6rem', padding: '0.7rem' }}>
                <div style={{ fontWeight: 600 }}>{s.member.fullName}</div>
                <div style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>{new Date(s.scheduledAt).toLocaleString()} · {s.durationMin} min · {s.status}</div>
              </div>
            ))}
          </div>
        )}
        <Link
          href={`/api/mentor/letter?mentorId=${mentor.id}`}
          className="btn btn-primary"
          style={{ marginTop: '1rem' }}
        >
          Download Volunteer Letter
        </Link>
      </div>
    </>
  );
}
