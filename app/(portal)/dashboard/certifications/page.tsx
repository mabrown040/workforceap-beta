import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import CertificationRoadmap from '@/components/portal/CertificationRoadmap';
import CertificationReferenceSection from '@/components/portal/CertificationReferenceSection';

export const metadata: Metadata = buildPageMetadata({
  title: 'Certification Roadmap',
  description: 'Track your progress toward industry certifications.',
  path: '/dashboard/certifications',
});

export default async function DashboardCertificationsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/certifications');

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Certification roadmap</h1>
      <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem' }}>
        Track your progress toward industry-recognized certifications across IT, healthcare, and skilled trades.
      </p>
      <div style={{ maxWidth: '800px' }}>
        <CertificationReferenceSection />
        <CertificationRoadmap />
      </div>
    </div>
  );
}
