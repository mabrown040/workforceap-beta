import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import ResumeRewriterForm from '@/components/portal/tools/ResumeRewriterForm';

export const metadata: Metadata = buildPageMetadata({
  title: 'Resume Rewriter',
  description: 'AI-powered resume improvement tailored to your target job.',
  path: '/dashboard/ai-tools/resume-rewriter',
});

export default async function ResumeRewriterPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/resume-rewriter');

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
            <Link href="/dashboard/ai-tools" className="resource-back-link">
              ← Back to AI Tools
            </Link>
            <h1>Resume Rewriter</h1>
            <p>Paste your resume and target job. Get AI-improved bullets and phrasing to pass ATS and impress recruiters.</p>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <div className="ai-tool-page" style={{ maxWidth: '720px' }}>
            <ResumeRewriterForm />
          </div>
        </div>
      </section>

    </div>
  );
}
