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
        <div className="page-hero-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Job Applications</h1>
            <p>Track your applications and interview progress.</p>
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
          <ApplicationTrackerTable />
        </div>
      </section>

      <Footer />
    </div>
  );
}
