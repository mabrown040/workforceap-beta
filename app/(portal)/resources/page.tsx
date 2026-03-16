import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getMemberResources } from '@/lib/content/memberResources';
import Footer from '@/components/Footer';
import { SignOutButton } from '@/components/portal/SignOutButton';
import ResourcesClient from './ResourcesClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Career Resources',
  description: 'Practical job-seeker resources by career stage. Resume, interviewing, career planning, AI skills, and job search.',
  path: '/resources',
});

export default async function ResourcesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/resources');

  const [resources, resourcesProgress] = await Promise.all([
    getMemberResources(),
    prisma.resourceProgress.findMany({ where: { userId: user.id } }),
  ]);
  const progressByResource = Object.fromEntries(
    resourcesProgress.map((p) => [p.resourceId, { completedAt: p.completedAt, savedAt: p.savedAt }])
  );

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Career Resources</h1>
            <p>Practical job-seeker resources by career stage. Filter by category or stage to find what you need.</p>
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
          <ResourcesClient resources={resources} progressByResource={progressByResource} />
        </div>
      </section>

      <Footer />
    </div>
  );
}
