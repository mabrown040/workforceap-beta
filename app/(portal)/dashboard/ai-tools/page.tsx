import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import MobileBottomNav from '@/components/MobileBottomNav';
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
      {/* ── Mobile AI Tools View (≤640px) ── */}
      <div className="wa-md:hidden" style={{ paddingBottom: "6rem" }}>
        {/* Mobile hero */}
        <div className="px-6 pt-8 pb-4">
          <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#ad2c4d] mb-1">Premium Intelligence</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-on-surface leading-tight mb-1">AI Career Tools</h1>
          <p className="text-sm text-on-surface-variant font-medium opacity-80">Powered by WorkforceAP AI</p>
          {/* accent banner */}
          <div className="mt-6 relative h-28 w-full rounded-xl overflow-hidden bg-gradient-to-br from-[#8c0f37] to-[#ad2c4d] p-5 flex flex-col justify-end">
            <div className="absolute top-0 right-0 w-28 h-28 bg-yellow-400/20 rounded-full -mr-12 -mt-12 blur-3xl" />
            <h3 className="text-white text-base font-bold">Smart Recommendations</h3>
            <p className="text-pink-200 text-xs">AI-driven paths tailored for your goals.</p>
          </div>
        </div>
        {/* Tool cards 2-col grid */}
        <div className="px-4 grid grid-cols-2 gap-3">
          {TOOLS.map((tool) => (
            <Link
              key={tool.id}
              href={'href' in tool ? tool.href : '/dashboard/ai-tools'}
              className="bg-white rounded-xl p-4 flex flex-col gap-2 active:scale-[0.98] transition-all no-underline"
              style={{ textDecoration: 'none' }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(173,44,77,0.1)', color: '#ad2c4d' }}>
                <span className="material-symbols-outlined text-[20px]">{tool.icon}</span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-on-surface leading-tight">{tool.title}</h4>
                <p className="text-on-surface-variant text-[11px] mt-1 leading-snug line-clamp-2">{tool.description}</p>
              </div>
              {'badge' in tool && tool.badge && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider self-start"
                  style={{ background: '#ffbb00', color: '#6c4d00' }}>{tool.badge}</span>
              )}
            </Link>
          ))}
        </div>
        {/* Mobile stats row */}
        <div className="mx-4 mt-6 flex gap-2">
          {[
            { value: '1.2k+', label: 'Resumes', icon: 'description' },
            { value: '85%', label: 'Interviews', icon: 'trending_up' },
            { value: '24/7', label: 'Available', icon: 'schedule' },
          ].map((stat) => (
            <div key={stat.label} className="flex-1 bg-white rounded-xl p-3 text-center">
              <span className="material-symbols-outlined text-[18px] block mb-1" style={{ color: '#8c0f37' }}>{stat.icon}</span>
              <div className="text-base font-bold text-on-surface">{stat.value}</div>
              <div className="text-[9px] font-semibold uppercase tracking-wider text-on-surface-variant">{stat.label}</div>
            </div>
          ))}
        </div>
        <MobileBottomNav variant="portal" />
      </div>
      {/* ── Desktop View (hidden on mobile) ── */}
      <div className="wa-hidden wa-md:block">
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
    </div>{/* end desktop */}
    </div>
  );
}
