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
  // Priority tools: Resume Writer first, AI Interview Coach second
  {
    id: 'my-resume',
    title: 'My Resume',
    icon: 'description',
    description: 'Upload your resume PDF, view it inline, or generate one from your profile using AI.',
    timeToComplete: '2 min',
    status: 'available' as const,
    href: '/dashboard/resume',
    badge: 'UPLOAD',
    accentBorder: true,
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
    id: 'interview-coach',
    title: 'AI Interview Coach',
    icon: 'smart_toy',
    description: 'Practice a live mock interview with an AI coach. Get asked real questions, give answers, and receive personalized feedback.',
    timeToComplete: '15-20 min',
    status: 'available' as const,
    href: '/dashboard/ai-tools/interview-coach',
  },
  {
    id: 'voice-interview',
    title: 'Voice Interview',
    icon: 'mic',
    description: 'Voice-only mock interview with ElevenLabs and a live coaching panel (clarity, confidence, keywords).',
    timeToComplete: '10-20 min',
    status: 'available' as const,
    href: '/dashboard/ai-tools/voice-interview',
  },
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
    id: 'skill-mapper',
    title: 'Skill Mapper',
    icon: 'radar',
    description:
      'Search any occupation and see its top skills on a competency radar chart — powered by O*NET data from the U.S. Department of Labor.',
    timeToComplete: '2 min',
    status: 'available' as const,
    href: '/dashboard/ai-tools/skill-mapper',
  },
  {
    id: 'application-tracker',
    title: 'Application Tracker',
    icon: 'view_list',
    description: 'Track your job applications. Add applications, update status, and see your progress.',
    timeToComplete: 'Ongoing',
    status: 'available' as const,
    href: '/dashboard/job-applications',
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
      { label: 'Log your first application', href: '/dashboard/job-applications' },
    ];
  }

  return (
    <div style={{ background: 'var(--color-surface)', minHeight: '100vh' }}>
      <div className="wa-pb-24 wa-md:wa-pb-0">
        <section
          style={{
            padding: 'clamp(2rem, 4vw, 3rem) 1.5rem 2rem',
            textAlign: 'center',
            background: 'linear-gradient(180deg, var(--surface-container-low) 0%, var(--color-surface) 100%)',
          }}
        >
          <p
            className="wa-block wa-md:wa-hidden"
            style={{
              fontSize: '0.625rem',
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--color-accent)',
              marginBottom: '0.5rem',
            }}
          >
            Included for members
          </p>
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
          <h1 className="text-display-sm" style={{ margin: '0 0 0.5rem' }}>
            AI Career Toolkit
          </h1>
          <p
            style={{
              color: 'var(--color-on-surface-variant)',
              maxWidth: '520px',
              margin: '0 auto 1.5rem',
              fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
              lineHeight: 1.6,
            }}
          >
            AI-powered tools to strengthen your resume, practice interviews, and stand out to employers.
          </p>

          <div
            className="wa-block wa-md:wa-hidden"
            style={{
              marginBottom: '1.25rem',
              position: 'relative',
              height: '7rem',
              width: '100%',
              maxWidth: '520px',
              marginLeft: 'auto',
              marginRight: 'auto',
              borderRadius: '0.75rem',
              overflow: 'hidden',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              background: 'linear-gradient(135deg, #8c0f37 0%, #ad2c4d 100%)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '7rem',
                height: '7rem',
                borderRadius: '9999px',
                marginRight: '-3rem',
                marginTop: '-3rem',
                background: 'rgba(250, 204, 21, 0.15)',
                filter: 'blur(40px)',
              }}
            />
            <h2 className="wa-text-base wa-font-bold" style={{ color: '#fff', margin: 0, position: 'relative', zIndex: 1 }}>
              Smart Recommendations
            </h2>
            <p style={{ color: 'rgba(255, 228, 232, 0.95)', fontSize: '0.75rem', margin: '0.25rem 0 0', position: 'relative', zIndex: 1 }}>
              AI-driven paths tailored for your goals.
            </p>
          </div>

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
                  <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>
                    arrow_forward
                  </span>
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
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
              history
            </span>
            View my past results
          </Link>
        </section>

        <section style={{ padding: '0 clamp(1rem, 4vw, 1.5rem) 2rem', maxWidth: '1100px', margin: '0 auto' }}>
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
                icon={tool.icon}
                badge={'badge' in tool ? tool.badge : undefined}
                accentBorder={'accentBorder' in tool ? tool.accentBorder : undefined}
                rowSpan2={'rowSpan2' in tool ? tool.rowSpan2 : undefined}
                exampleText={'exampleText' in tool ? tool.exampleText : undefined}
              />
            ))}
          </div>
        </section>

        <section
          style={{
            padding: '2rem clamp(1rem, 4vw, 1.5rem)',
            borderTop: '1px solid var(--surface-container-high)',
            maxWidth: '1100px',
            margin: '0 auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 'clamp(0.5rem, 3vw, 3rem)',
              flexWrap: 'wrap',
            }}
          >
            {[
              { title: 'Included', desc: 'No add-on fees for enrolled members', icon: 'verified' },
              { title: 'Private', desc: 'Your drafts stay with you', icon: 'lock' },
              { title: 'Flexible', desc: 'Use whenever you need', icon: 'schedule' },
            ].map((item) => (
              <div
                key={item.title}
                className="metric-card"
                style={{
                  textAlign: 'center',
                  background: 'transparent',
                  border: 'none',
                  padding: '1rem',
                  maxWidth: '200px',
                  flex: '1 1 100px',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '1.5rem', color: 'var(--color-accent)', marginBottom: '0.5rem', display: 'block' }}
                >
                  {item.icon}
                </span>
                <div className="metric-value" style={{ fontSize: '1.125rem', fontWeight: 700 }}>
                  {item.title}
                </div>
                <div className="metric-label" style={{ fontSize: '0.8125rem', lineHeight: 1.4, marginTop: '0.35rem' }}>
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="wa-block wa-md:wa-hidden">
        <MobileBottomNav variant="portal" />
      </div>
    </div>
  );
}
