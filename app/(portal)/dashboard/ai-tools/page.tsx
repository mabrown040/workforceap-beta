import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getCareerBriefContext } from '@/lib/content/careerBriefPersonalization';
import AIToolCard from '@/components/portal/AIToolCard';

export const metadata: Metadata = buildPageMetadata({
  title: 'AI Career Toolkit',
  description: 'AI-powered tools to strengthen your resume, practice interviews, and more.',
  path: '/dashboard/ai-tools',
});

const TOOLS = [
  {
    id: 'job-match-scorer',
    title: 'Job Match Scorer',
    icon: 'target',
    description: 'Paste a job description and your resume. Get a match score and specific gaps to address—so you know why you\'re not getting callbacks.',
    timeToComplete: '3-5 min',
    status: 'available' as const,
    href: '/dashboard/ai-tools/job-match-scorer',
  },
  {
    id: 'resume-rewriter',
    title: 'Resume Rewriter',
    icon: 'edit_note',
    description: 'Paste your resume and job target. Get AI-improved bullets and phrasing tailored to pass ATS and impress recruiters.',
    timeToComplete: '5-10 min',
    status: 'available' as const,
    href: '/dashboard/ai-tools/resume-rewriter',
    rowSpan2: true,
    exampleText: '"Managed team" becomes "Led cross-functional team of 12, delivering $2.4M project 3 weeks ahead of schedule"',
  },
  {
    id: 'interview-practice',
    title: 'Interview Practice',
    icon: 'record_voice_over',
    description: 'Generate role-specific interview questions with answer frameworks. Practice behavioral and technical questions.',
    timeToComplete: '10-15 min',
    status: 'available' as const,
    href: '/dashboard/ai-tools/interview-practice',
  },
  {
    id: 'cover-letter',
    title: 'Cover Letter Builder',
    icon: 'description',
    description: 'Create a tailored cover letter that connects your experience to the job requirements.',
    timeToComplete: '5-10 min',
    status: 'available' as const,
    href: '/dashboard/ai-tools/cover-letter',
  },
  {
    id: 'linkedin-headline',
    title: 'LinkedIn Headline',
    icon: 'badge',
    description: 'Craft a compelling LinkedIn headline that gets you noticed by recruiters.',
    timeToComplete: '2-3 min',
    status: 'available' as const,
    href: '/dashboard/ai-tools/linkedin-headline',
  },
  {
    id: 'linkedin-about',
    title: 'LinkedIn About Section',
    icon: 'person_pin',
    description: 'Give us your role and a few bullets about yourself. We\'ll write a polished 3-paragraph About section.',
    timeToComplete: '3-5 min',
    status: 'available' as const,
    href: '/dashboard/ai-tools/linkedin-about',
  },
  {
    id: 'salary-negotiation',
    title: 'Salary Negotiator',
    icon: 'payments',
    description: 'Got an offer? Get a word-for-word script for a phone call or email to negotiate.',
    timeToComplete: '2-3 min',
    status: 'available' as const,
    href: '/dashboard/ai-tools/salary-negotiation',
  },
  {
    id: 'gap-analyzer',
    title: 'Gap Analyzer',
    icon: 'history',
    description: 'Detect employment gaps and get suggested framing for cover letters and interviews.',
    timeToComplete: '3-5 min',
    status: 'available' as const,
    href: '/dashboard/ai-tools/gap-analyzer',
  },
  {
    id: 'application-tracker',
    title: 'Application Tracker',
    icon: 'view_list',
    description: 'Track your job applications. Add applications, update status, and see your progress.',
    timeToComplete: 'Ongoing',
    status: 'available' as const,
    href: '/dashboard/ai-tools/application-tracker',
    badge: 'LIVE TRACKING',
    accentBorder: true,
  },
];

export default async function AIToolsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools');

  let suggestedActions: Array<{ label: string; href: string }> = [];
  try {
    const briefContext = await getCareerBriefContext(user.id);
    suggestedActions = briefContext.recommendedActions.filter((a) => a.href.startsWith('/dashboard/ai-tools')).slice(0, 3);
  } catch {
    suggestedActions = [
      { label: 'Build your resume', href: '/dashboard/ai-tools/resume-rewriter' },
      { label: 'Practice interview questions', href: '/dashboard/ai-tools/interview-practice' },
      { label: 'Log your first application', href: '/dashboard/ai-tools/application-tracker' },
    ];
  }

  return (
    <div style={{ background: 'var(--color-surface)', minHeight: '100vh' }}>
      {/* Hero */}
      <section
        style={{
          padding: '3rem 1.5rem 2rem',
          textAlign: 'center',
          background: 'linear-gradient(180deg, var(--surface-container-low) 0%, var(--color-surface) 100%)',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            fontSize: '0.65rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            padding: '0.3rem 0.75rem',
            borderRadius: '999px',
            background: 'rgba(173,44,77,0.12)',
            color: 'var(--color-accent)',
            marginBottom: '1rem',
          }}
        >
          Beta Access
        </span>
        <h1 className="text-display-sm" style={{ margin: '0 0 0.5rem' }}>AI Career Toolkit</h1>
        <p style={{ color: 'var(--color-on-surface-variant)', maxWidth: '520px', margin: '0 auto 1.5rem', fontSize: '1rem', lineHeight: 1.6 }}>
          AI-powered tools to strengthen your resume, practice interviews, and stand out to employers.
        </p>

        {/* Suggested actions */}
        {suggestedActions.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginBottom: '1rem' }}>
            {suggestedActions.map((a) => (
              <Link
                key={a.href + a.label}
                href={a.href}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 1rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  background: 'var(--color-accent)',
                  color: '#fff',
                  textDecoration: 'none',
                  transition: 'background 0.2s',
                }}
              >
                {a.label}
                <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>arrow_forward</span>
              </Link>
            ))}
          </div>
        )}

        <Link
          href="/dashboard/ai-tools/history"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 1rem',
            fontSize: '0.85rem',
            fontWeight: 500,
            borderRadius: '8px',
            border: '1px solid var(--surface-container-highest)',
            color: 'var(--color-on-surface-variant)',
            textDecoration: 'none',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>history</span>
          View my past results
        </Link>
      </section>

      {/* Tool cards grid */}
      <section style={{ padding: '0 1.5rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1rem',
          }}
        >
          {TOOLS.map((tool) => (
            <AIToolCard
              key={tool.id}
              id={tool.id}
              title={tool.title}
              description={tool.description}
              timeToComplete={tool.timeToComplete}
              status={tool.status}
              href={'href' in tool ? tool.href : undefined}
              icon={tool.icon}
              badge={'badge' in tool ? tool.badge : undefined}
              accentBorder={'accentBorder' in tool ? tool.accentBorder : undefined}
              rowSpan2={'rowSpan2' in tool ? tool.rowSpan2 : undefined}
              exampleText={'exampleText' in tool ? tool.exampleText : undefined}
            />
          ))}
        </div>
      </section>

      {/* Bottom stats */}
      <section
        style={{
          padding: '2rem 1.5rem',
          borderTop: '1px solid var(--surface-container-high)',
          maxWidth: '1100px',
          margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', flexWrap: 'wrap' }}>
          {[
            { value: '1.2k+', label: 'Resumes Optimized', icon: 'description' },
            { value: '85%', label: 'Interview Success', icon: 'trending_up' },
            { value: '24/7', label: 'AI Availability', icon: 'schedule' },
          ].map((stat) => (
            <div key={stat.label} className="metric-card" style={{ textAlign: 'center', background: 'transparent', border: 'none', padding: '1rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: 'var(--color-accent)', marginBottom: '0.5rem', display: 'block' }}>
                {stat.icon}
              </span>
              <div className="metric-value" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stat.value}</div>
              <div className="metric-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
