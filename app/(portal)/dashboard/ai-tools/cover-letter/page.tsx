import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import CoverLetterForm from '@/components/portal/tools/CoverLetterForm';

export const metadata: Metadata = buildPageMetadata({
  title: 'Cover Letter Builder',
  description: 'Create a tailored cover letter that connects your experience to the job.',
  path: '/dashboard/ai-tools/cover-letter',
});

export default async function CoverLetterPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/cover-letter');

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <Link href="/dashboard/ai-tools" className="resource-back-link">← Back to AI Tools</Link>
          <h1>Cover Letter Builder</h1>
          <p>Create a tailored cover letter that connects your experience to the job requirements.</p>
        </div>
      </section>
      <section className="content-section">
        <div className="container">
          <div className="ai-tool-page" style={{ maxWidth: '720px' }}>
            <CoverLetterForm />
          </div>
        </div>
      </section>
    </div>
  );
}
