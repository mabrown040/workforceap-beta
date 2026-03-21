import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import JobMatchScorerForm from '@/components/portal/tools/JobMatchScorerForm';

export const metadata = buildPageMetadata({
  title: 'Job Match Scorer',
  description: 'See how well your resume matches a job and get specific gaps to address.',
  path: '/dashboard/ai-tools/job-match-scorer',
});

export default async function JobMatchScorerPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/job-match-scorer');

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
            <Link href="/dashboard/ai-tools" className="resource-back-link">
              ← Back to AI Tools
            </Link>
            <h1>Job Match Scorer</h1>
            <p>Paste a job description and your resume. Get a match score and specific gaps to address—so you know why you&apos;re not getting callbacks.</p>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <div className="ai-tool-page" style={{ maxWidth: '720px' }}>
            <JobMatchScorerForm />
          </div>
        </div>
      </section>

    </div>
  );
}
