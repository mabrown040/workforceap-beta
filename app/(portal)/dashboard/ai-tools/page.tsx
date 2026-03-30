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
    id: 'interview-coach',
    title: 'AI Interview Coach',
    icon: 'smart_toy',
    description: 'Practice a live mock interview with an AI coach. Get asked real questions, give answers, and receive personalized feedback.',
    timeToComplete: '15-20 min',
    status: 'available' as const,
    href: '/dashboard/ai-tools/interview-coach',
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
      <div className="wa-block wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        {/* Mobile hero */}
        <div style={{ padding: '2rem 1.5rem 1rem' }}>
          <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#ad2c4d]" style={{ marginBottom:"0.25rem" }}>Included for members</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-on-surface leading-tight" style={{ marginBottom:"0.25rem" }}>AI Career Tools</h1>
          <p className="text-sm text-on-surface-variant font-medium" style={{ opacity:0.8 }}>Powered by WorkforceAP AI</p>
          {/* accent banner */}
          <div className="bg-gradient-to-br from-[#8c0f37] to-[#ad2c4d]" style={{ marginTop:'1.5rem', position:'relative', height:'7rem', width:'100%', borderRadius:'0.75rem', overflow:'hidden', padding:'1.25rem', display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
            <div className="bg-yellow-400/20 blur-3xl" style={{ position:'absolute', top:0, right:0, width:'7rem', height:'7rem', borderRadius:'9999px', marginRight:'-3rem', marginTop:'-3rem' }} />
            <h3 className="text-white text-base font-bold">Smart Recommendations</h3>
            <p className="text-pink-200 text-xs">AI-driven paths tailored for your goals.</p>
          </div>
        </div>
        {/* History link */}
        <div style={{ padding:'0 1.5rem', marginBottom:'0.75rem' }}>
          <Link
            href="/dashboard/ai-tools/history"
            style={{ display:'inline-flex', alignItems:'center', gap:'0.35rem', fontSize:'0.8rem', fontWeight:600, color:'var(--color-on-surface-variant)', textDecoration:'none' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize:'1rem' }}>history</span>
            Your history →
          </Link>
        </div>
        {/* Tool cards 2-col grid */}
        <div style={{ padding:'0 1rem', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
          {TOOLS.map((tool) => (
            <Link
              key={tool.id}
              href={'href' in tool ? tool.href : '/dashboard/ai-tools'}
              className="bg-white active:scale-[0.98] transition-all" style={{textDecoration:"none", borderRadius:'0.75rem', padding:'1rem', display:'flex', flexDirection:'column', gap:'0.5rem'}}
            >
              <div style={{ width:'2.5rem', height:'2.5rem', borderRadius:'9999px', display:'flex', alignItems:'center', justifyContent:'center', background:'color-mix(in srgb, var(--color-accent) 10%, transparent)', color:'var(--color-accent)' }}>
                <span className="material-symbols-outlined text-[20px]">{tool.icon}</span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-on-surface leading-tight">{tool.title}</h4>
                <p className="text-on-surface-variant text-[11px] leading-snug line-clamp-2" style={{ marginTop:"0.25rem" }}>{tool.description}</p>
              </div>
              {'badge' in tool && tool.badge && (
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{alignSelf:"flex-start", background: 'var(--color-gold)', color: '#6c4d00', padding:'0.125rem 0.5rem', borderRadius:'9999px'}}>{tool.badge}</span>
              )}
            </Link>
          ))}
        </div>
        {/* Honest member benefits — no vanity metrics */}
        <div style={{ margin:'1.5rem 1rem 0', display:'flex', gap:'0.5rem' }}>
          {[
            { title: 'Included', desc: 'No add-on fees for enrolled members', icon: 'verified' },
            { title: 'Private', desc: 'Your drafts stay with you', icon: 'lock' },
            { title: 'Flexible', desc: 'Use whenever you need', icon: 'schedule' },
          ].map((item) => (
            <div key={item.title} className="bg-white" style={{textAlign:"center", flex:1, borderRadius:'0.75rem', padding:'0.75rem'}}>
              <span className="material-symbols-outlined text-[18px]" style={{ color:'var(--color-accent)', display:'block', marginBottom:'0.25rem' }}>{item.icon}</span>
              <div className="text-sm font-bold text-on-surface leading-tight">{item.title}</div>
              <div className="text-[9px] font-medium leading-snug text-on-surface-variant" style={{ marginTop:'0.125rem' }}>{item.desc}</div>
            </div>
          ))}
        </div>
        <MobileBottomNav variant="portal" />
      </div>
      {/* ── Desktop View (hidden on mobile) ── */}
      <div className="wa-hidden wa-md:wa-block">
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

      {/* Member benefits — no vanity metrics */}
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
            { title: 'Included', desc: 'No add-on fees for enrolled members', icon: 'verified' },
            { title: 'Private', desc: 'Your drafts stay with you', icon: 'lock' },
            { title: 'Flexible', desc: 'Use whenever you need', icon: 'schedule' },
          ].map((item) => (
            <div key={item.title} className="metric-card" style={{ textAlign: 'center', background: 'transparent', border: 'none', padding: '1rem', maxWidth: '200px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: 'var(--color-accent)', marginBottom: '0.5rem', display: 'block' }}>
                {item.icon}
              </span>
              <div className="metric-value" style={{ fontSize: '1.125rem', fontWeight: 700 }}>{item.title}</div>
              <div className="metric-label" style={{ fontSize: '0.8125rem', lineHeight: 1.4, marginTop: '0.35rem' }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </div>{/* end desktop */}
    </div>
  );
}
