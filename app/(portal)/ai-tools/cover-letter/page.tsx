import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import Footer from '@/components/Footer';
import { SignOutButton } from '@/components/portal/SignOutButton';
import CoverLetterForm from '@/components/portal/tools/CoverLetterForm';

export const metadata: Metadata = buildPageMetadata({
  title: 'Cover Letter Builder',
  description: 'Create a tailored cover letter that connects your experience to the job.',
  path: '/ai-tools/cover-letter',
});

export default async function CoverLetterPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/ai-tools/cover-letter');

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <Link href="/ai-tools" className="resource-back-link">← Back to AI Tools</Link>
            <h1>Cover Letter Builder</h1>
            <p>Create a tailored cover letter that connects your experience to the job requirements.</p>
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
            <CoverLetterForm />
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
