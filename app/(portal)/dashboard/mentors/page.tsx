import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import PageHeader from '@/components/portal/PageHeader';
import PortalEmptyState from '@/components/portal/PortalEmptyState';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Find a Mentor',
  description: 'Browse WorkforceAP mentors and request a session with someone in your field.',
  path: '/dashboard/mentors',
});
}

export default async function MentorsBrowsePage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/mentors');

  const mentors = await prisma.mentor.findMany({
    take: 500,
    where: { isActive: true, approvedAt: { not: null } },
    orderBy: { fullName: 'asc' },
    select: { id: true, fullName: true, title: true, company: true, industry: true },
  });

  return (
    <>
      <div style={{ maxWidth: 'var(--max-width, 72rem)', margin: '0 auto', padding: '0.5rem 1rem 0' }}>
        <PageHeader
          title="Find a mentor"
          subtitle="Browse WorkforceAP mentors and request a session with someone in your field."
          breadcrumbs={[
            { label: 'Member Portal', href: '/dashboard' },
            { label: 'Mentors' },
          ]}
        />
      </div>
      {/* Mobile */}
      <div className="md:wa-hidden" style={{ paddingBottom: '6rem', padding: '1rem' }}>
        {mentors.length === 0 ? (
          <PortalEmptyState
            icon={
              <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>
                people_outline
              </span>
            }
            title="No mentors available yet"
            description="Check back soon — we're adding mentors to the network."
          />
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {mentors.map((mentor) => (
              <div key={mentor.id} style={{ border: '1px solid var(--outline-variant)', borderRadius: '0.75rem', padding: '0.9rem', background: 'var(--surface-container-lowest)' }}>
                <div style={{ fontWeight: 700 }}>{mentor.fullName}</div>
                <div style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>{mentor.title}</div>
                <div style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.85rem' }}>{mentor.company} · {mentor.industry}</div>
                <Link href={`/dashboard/mentors/${mentor.id}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: '0.6rem', textDecoration: 'none', background: 'var(--color-accent)', color: 'var(--color-white, #fff)', padding: '0.75rem 1rem', borderRadius: '0.5rem', fontWeight: 600, minHeight: '44px' }}>
                  Request Session
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desktop */}
      <div className="wa-hidden md:wa-block" style={{ padding: '1.5rem' }}>
        {mentors.length === 0 ? (
          <PortalEmptyState
            icon={
              <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>
                people_outline
              </span>
            }
            title="No mentors available yet"
            description="Check back soon — we're adding mentors to the network."
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1rem' }}>
            {mentors.map((mentor) => (
              <div key={mentor.id} style={{ border: '1px solid var(--outline-variant)', borderRadius: '0.75rem', padding: '1rem', background: 'var(--surface-container-lowest)' }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{mentor.fullName}</div>
                <div style={{ color: 'var(--color-on-surface-variant)' }}>{mentor.title}</div>
                <div style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>{mentor.company} · {mentor.industry}</div>
                <Link href={`/dashboard/mentors/${mentor.id}`} style={{ display: 'inline-block', marginTop: '0.75rem', textDecoration: 'none', background: 'var(--color-accent)', color: 'var(--color-white, #fff)', padding: '0.55rem 0.85rem', borderRadius: '0.5rem', fontWeight: 600 }}>
                  Request Session
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
