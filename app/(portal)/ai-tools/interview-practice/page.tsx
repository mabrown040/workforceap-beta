import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import Footer from '@/components/Footer';
import { SignOutButton } from '@/components/portal/SignOutButton';
import InterviewPracticeForm from '@/components/portal/tools/InterviewPracticeForm';

export const metadata: Metadata = buildPageMetadata({
  title: 'Interview Practice Generator',
  description: 'Generate role-specific interview questions with answer frameworks.',
  path: '/ai-tools/interview-practice',
});

export default async function InterviewPracticePage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/ai-tools/interview-practice');

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <Link href="/ai-tools" className="resource-back-link">
              ← Back to AI Tools
            </Link>
            <h1>Interview Practice Generator</h1>
            <p>Generate role-specific interview questions with answer frameworks. Practice behavioral and technical questions.</p>
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
            <InterviewPracticeForm />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
