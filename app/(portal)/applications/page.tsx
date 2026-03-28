import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import Footer from '@/components/Footer';
import { SignOutButton } from '@/components/portal/SignOutButton';
import ApplicationTrackerTable from '@/components/portal/ApplicationTrackerTable';

export const metadata: Metadata = buildPageMetadata({
  title: 'Job Applications',
  description: 'Track your job applications and interview progress.',
  path: '/applications',
});

export default async function ApplicationsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/applications');

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content--split">
          <div>
            <h1>Job Applications</h1>
            <p>Track your applications and interview progress.</p>
          </div>
          <div className="page-hero-actions">
            <Link href="/dashboard" className="btn btn-ghost">
              Dashboard
            </Link>
            <SignOutButton />
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <ApplicationTrackerTable />
        </div>
      </section>

      <Footer />
    </div>
  );
}
