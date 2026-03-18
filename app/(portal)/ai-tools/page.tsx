import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getCareerBriefContext } from '@/lib/content/careerBriefPersonalization';
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
    id: 'job-match-scorer',
    title: 'Job Match Scorer',
    description: 'Paste a job description and your resume. Get a match score and specific gaps to address—so you know why you\'re not getting callbacks.',
    timeToComplete: '3–5 min',
    status: 'available' as const,
    href: '/ai-tools/job-match-scorer',
  },
  {
    id: 'resume-rewriter',
    title: 'Resume Rewriter',
    description: 'Paste your resume and job target. Get AI-improved bullets and phrasing tailored to pass ATS and impress recruiters.',
    timeToComplete: '5–10 min',
    status: 'available' as const,
    href: '/ai-tools/resume-rewriter',
  },
  {
    id: 'interview-practice',
    title: 'Interview Practice Generator',
    description: 'Generate role-specific interview questions with answer frameworks. Practice behavioral and technical questions.',
    timeToComplete: '10–15 min',
    status: 'available' as const,
    href: '/ai-tools/interview-practice',
  },
  {
    id: 'cover-letter',
    title: 'Cover Letter Builder',
    description: 'Create a tailored cover letter that connects your experience to the job requirements.',
    timeToComplete: '5–10 min',
    status: 'available' as const,
    href: '/ai-tools/cover-letter',
  },
  {
    id: 'linkedin-headline',
    title: 'LinkedIn Headline Generator',
    description: 'Craft a compelling LinkedIn headline that gets you noticed by recruiters.',
    timeToComplete: '2–3 min',
    status: 'available' as const,
    href: '/ai-tools/linkedin-headline',
  },
  {
    id: 'linkedin-about',
    title: 'LinkedIn About Section Generator',
    description: 'Give us your role and a few bullets about yourself. We\'ll write a polished 3-paragraph About section.',
    timeToComplete: '3–5 min',
    status: 'available' as const,
    href: '/ai-tools/linkedin-about',
  },
  {
    id: 'salary-negotiation',
    title: 'Salary Negotiation Script',
    description: 'Got an offer? Get a word-for-word script for a phone call or email to negotiate.',
    timeToComplete: '2–3 min',
    status: 'available' as const,
    href: '/ai-tools/salary-negotiation',
  },
  {
    id: 'gap-analyzer',
    title: 'Resume Gap Analyzer',
    description: 'Detect employment gaps and get suggested framing for cover letters and interviews.',
    timeToComplete: '3–5 min',
    status: 'available' as const,
    href: '/ai-tools/gap-analyzer',
  },
  {
    id: 'application-tracker',
    title: 'Application Tracker',
    description: 'Track your job applications. Add applications, update status, and see your progress.',
    timeToComplete: 'Ongoing',
    status: 'available' as const,
    href: '/ai-tools/application-tracker',
  },
];

export default async function AIToolsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/ai-tools');

  let suggestedActions: Array<{ label: string; href: string }> = [];
  try {
    const briefContext = await getCareerBriefContext(user.id);
    suggestedActions = briefContext.recommendedActions.filter((a) => a.href.startsWith('/ai-tools')).slice(0, 3);
  } catch {
    suggestedActions = [
      { label: 'Build your resume', href: '/ai-tools/resume-rewriter' },
      { label: 'Practice interview questions', href: '/ai-tools/interview-practice' },
      { label: 'Log your first application', href: '/ai-tools/application-tracker' },
    ];
  }

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
          {suggestedActions.length > 0 && (
            <div
              style={{
                marginBottom: '1.5rem',
                padding: '1rem 1.25rem',
                background: 'rgba(74, 155, 79, 0.08)',
                border: '1px solid rgba(74, 155, 79, 0.3)',
                borderRadius: '8px',
              }}
            >
              <p style={{ margin: '0 0 0.75rem', fontWeight: 600, fontSize: '0.95rem' }}>Suggested for you</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {suggestedActions.map((a) => (
                  <Link
                    key={a.href + a.label}
                    href={a.href}
                    className="btn btn-primary"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                  >
                    {a.label} →
                  </Link>
                ))}
              </div>
            </div>
          )}
          <div style={{ marginBottom: '1.5rem' }}>
            <Link href="/ai-tools/history" className="btn btn-outline">
              View my past results
            </Link>
          </div>
          <div className="ai-tools-grid">
            {TOOLS.map((tool) => (
              <AIToolCard
                key={tool.id}
                id={tool.id}
                title={tool.title}
                description={tool.description}
                timeToComplete={tool.timeToComplete}
                status={tool.status}
                href={'href' in tool ? tool.href : undefined}
              />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
