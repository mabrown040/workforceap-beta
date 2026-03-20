import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import Footer from '@/components/Footer';
import { SignOutButton } from '@/components/portal/SignOutButton';
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
        <div className="page-hero-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <Link href="/dashboard/ai-tools" className="resource-back-link">
              ← Back to AI Tools
            </Link>
            <h1>Job Match Scorer</h1>
            <p>Paste a job description and your resume. Get a match score and specific gaps to address—so you know why you&apos;re not getting callbacks.</p>
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
            <JobMatchScorerForm />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
