import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import Footer from '@/components/Footer';
import { SignOutButton } from '@/components/portal/SignOutButton';
import CertificationRoadmap from '@/components/portal/CertificationRoadmap';

export const metadata = buildPageMetadata({
  title: 'Certification Roadmap',
  description: 'Track your progress toward industry certifications.',
  path: '/certifications',
});

export default async function CertificationsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/certifications');

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <Link href="/dashboard" className="resource-back-link">← Back to Dashboard</Link>
            <h1>Certification Roadmap</h1>
            <p>Track your progress toward industry-recognized certifications across IT, Healthcare, and Trades.</p>
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
          <div style={{ maxWidth: '800px' }}>
            <CertificationRoadmap />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
