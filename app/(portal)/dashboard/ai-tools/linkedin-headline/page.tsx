import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import LinkedInHeadlineForm from '@/components/portal/tools/LinkedInHeadlineForm';

export const metadata: Metadata = buildPageMetadata({
  title: 'LinkedIn Headline Generator',
  description: 'Craft a compelling LinkedIn headline that gets you noticed.',
  path: '/dashboard/ai-tools/linkedin-headline',
});

export default async function LinkedInHeadlinePage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/linkedin-headline');

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <Link href="/dashboard/ai-tools" className="resource-back-link">← Back to AI Tools</Link>
          <h1>LinkedIn Headline Generator</h1>
          <p>Craft a compelling LinkedIn headline that gets you noticed by recruiters.</p>
        </div>
      </section>
      <section className="content-section">
        <div className="container">
          <div className="ai-tool-page" style={{ maxWidth: '720px' }}>
            <LinkedInHeadlineForm />
          </div>
        </div>
      </section>
    </div>
  );
}
