import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import Footer from '@/components/Footer';
import { SignOutButton } from '@/components/portal/SignOutButton';
import AIToolCard from '@/components/portal/AIToolCard';

export const metadata: Metadata = buildPageMetadata({
  title: 'AI Career Toolkit',
  description: 'AI-powered tools to strengthen your resume, practice interviews, and more.',
  path: '/ai-tools',
});

const TOOLS = [
  {
    id: 'resume-rewriter',
    title: 'Resume Rewriter',
    description: 'Paste your resume and job target. Get AI-improved bullets and phrasing tailored to pass ATS and impress recruiters.',
    timeToComplete: '5–10 min',
    status: 'coming_soon' as const,
  },
  {
    id: 'interview-practice',
    title: 'Interview Practice Generator',
    description: 'Generate role-specific interview questions with answer frameworks. Practice behavioral and technical questions.',
    timeToComplete: '10–15 min',
    status: 'coming_soon' as const,
  },
  {
    id: 'cover-letter',
    title: 'Cover Letter Builder',
    description: 'Create a tailored cover letter that connects your experience to the job requirements.',
    timeToComplete: '5–10 min',
    status: 'coming_soon' as const,
  },
  {
    id: 'linkedin-headline',
    title: 'LinkedIn Headline Generator',
    description: 'Craft a compelling LinkedIn headline that gets you noticed by recruiters.',
    timeToComplete: '2–3 min',
    status: 'coming_soon' as const,
  },
];

export default async function AIToolsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/ai-tools');

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>AI Career Toolkit</h1>
            <p>AI-powered tools to strengthen your resume, practice interviews, and stand out to employers.</p>
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
          <div className="ai-tools-grid">
            {TOOLS.map((tool) => (
              <AIToolCard
                key={tool.id}
                id={tool.id}
                title={tool.title}
                description={tool.description}
                timeToComplete={tool.timeToComplete}
                status={tool.status}
              />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
