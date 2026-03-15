import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import Footer from '@/components/Footer';
import { SignOutButton } from '@/components/portal/SignOutButton';
import LinkedInHeadlineForm from '@/components/portal/tools/LinkedInHeadlineForm';

export const metadata: Metadata = buildPageMetadata({
  title: 'LinkedIn Headline Generator',
  description: 'Craft a compelling LinkedIn headline that gets you noticed.',
  path: '/ai-tools/linkedin-headline',
});

export default async function LinkedInHeadlinePage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/ai-tools/linkedin-headline');

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <Link href="/ai-tools" className="resource-back-link">← Back to AI Tools</Link>
            <h1>LinkedIn Headline Generator</h1>
            <p>Craft a compelling LinkedIn headline that gets you noticed by recruiters.</p>
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
          <div className="ai-tool-page" style={{ maxWidth: '720px' }}>
            <LinkedInHeadlineForm />
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
