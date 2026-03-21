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
        <div className="page-hero-content page-hero-content--split">
          <div>
            <nav className="learning-hub-breadcrumb learning-hub-breadcrumb--on-dark" aria-label="Learning hub">
              <Link href="/dashboard/learning">Learning hub</Link>
              <span className="learning-hub-breadcrumb-sep" aria-hidden>
                /
              </span>
              <span className="learning-hub-breadcrumb-current">Career library</span>
            </nav>
            <h1>Career resource library</h1>
            <p>Practical job-seeker resources by career stage. Filter by category or stage to find what you need.</p>
          </div>
          <div className="page-hero-actions">
            <Link href="/dashboard/learning" className="btn btn-hero-ghost">
              Learning hub
            </Link>
            <Link href="/dashboard" className="btn btn-hero-ghost">
              Dashboard
            </Link>
            <SignOutButton className="btn btn-hero-ghost" />
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
