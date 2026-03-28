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
      <section className="ai-tool-header page-hero">
        <div className="page-hero-content">
          <Link href="/dashboard/ai-tools" className="ai-tool-back-link">
            ← Back to AI Tools
          </Link>
          <div className="ai-tool-icon-ring" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </div>
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
