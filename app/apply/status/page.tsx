import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Footer from '@/components/Footer';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import ApplyStatusClient from './ApplyStatusClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Application status',
  description: 'Check your WorkforceAP application status with the email you applied with.',
  path: '/apply/status',
});

export default async function ApplyStatusPage() {
  const user = await getUser();
  if (user) redirect('/dashboard');

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <h1>Application status</h1>
          <p>See where your application stands before you have a member portal login.</p>
        </div>
      </section>

      <section className="content-section">
        <div className="container" style={{ maxWidth: '560px' }}>
          <ApplyStatusClient />
          <p style={{ marginTop: '1.5rem', fontSize: '0.95rem' }}>
            <Link href="/apply">Start an application</Link>
            {' · '}
            <Link href="/contact">Contact us</Link>
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
