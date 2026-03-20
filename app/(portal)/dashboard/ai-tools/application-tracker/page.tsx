import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import Footer from '@/components/Footer';
import { SignOutButton } from '@/components/portal/SignOutButton';
import ApplicationTrackerTable from '@/components/portal/ApplicationTrackerTable';

export const metadata = buildPageMetadata({
  title: 'Application Tracker',
  description: 'Track your job applications and interview progress.',
  path: '/dashboard/ai-tools/application-tracker',
});

export default async function ApplicationTrackerPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/application-tracker');

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <Link href="/dashboard/ai-tools" className="resource-back-link">← Back to AI Tools</Link>
            <h1>Application Tracker</h1>
            <p>Track your job applications. Add applications, update status, and see your progress.</p>
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
