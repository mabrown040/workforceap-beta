import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import Footer from '@/components/Footer';
import { SignOutButton } from '@/components/portal/SignOutButton';

export const metadata: Metadata = buildPageMetadata({
  title: 'Member resources',
  description: 'Access documents, videos, and links for WorkforceAP members.',
  path: '/resources',
});

export default async function ResourcesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/resources');

  const resources = await prisma.resource.findMany({
    where: {
      OR: [
        { visibilityRule: null },
        { visibilityRule: 'member' },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Member resources</h1>
            <p>Documents, videos, and links to support your program journey.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link href="/dashboard" className="btn" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.4)' }}>
              Dashboard
            </Link>
            <SignOutButton />
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          {resources.length === 0 ? (
            <div style={{ background: 'var(--color-light)', padding: '2rem', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--color-gray-600)' }}>
              <p>No resources available yet. Check back soon.</p>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '1rem' }}>
              {resources.map((r) => (
                <li key={r.id}>
                  <a
                    href={r.url ?? '#'}
                    target={r.url ? '_blank' : undefined}
                    rel={r.url ? 'noopener noreferrer' : undefined}
                    style={{
                      display: 'block',
                      padding: '1rem 1.5rem',
                      background: 'var(--color-light)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-gray-200)',
                      color: 'var(--color-primary)',
                      fontWeight: 600,
                    }}
                  >
                    {r.title} {r.type && <span style={{ fontWeight: 400, color: 'var(--color-gray-500)', fontSize: '.85rem' }}>({r.type.toLowerCase()})</span>}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
