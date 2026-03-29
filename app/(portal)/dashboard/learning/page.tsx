import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { PATHWAYS } from '@/lib/content/learningPathways';
import LearningPathCard from '@/components/portal/LearningPathCard';
import LearningHubDestinationCards from '@/components/portal/LearningHubDestinationCards';
import MobileBottomNav from '@/components/MobileBottomNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'The Learning Hub — Curriculum Oversight',
  description:
    'Learning pathways, the career resource library, and program-specific tools — organized in one place.',
  path: '/dashboard/learning',
});

/* Icon map for upcoming modules */
const MODULE_ICONS: Record<string, string> = {
  Technology: 'terminal',
  'Data & AI': 'query_stats',
  Business: 'business_center',
};

/* Current active course (first pathway that has steps remaining — placeholder for real data) */
const ACTIVE_PATHWAY = PATHWAYS[0];

export default async function LearningPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/learning');

  /* Overall completion: average across all pathways (placeholder — real data comes from LearningPathCard client state) */
  const overallPct = 38;

  const upcomingModules = ACTIVE_PATHWAY.steps.slice(0, 4);
  /* How many steps count as "completed" on mobile (placeholder; real data from user progress) */
  const completedCount = Math.floor(ACTIVE_PATHWAY.steps.length * (overallPct / 100));

  return (
    <>
    {/* ── Mobile learning view (≤640px) ── */}
    <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
      {/* Header */}
      <div className="px-6 pt-6 mb-6">
        <span className="text-[10px] font-medium tracking-[0.1em] uppercase text-[#8c0f37] mb-2 block">Learning Path</span>
        <h2 className="text-3xl font-bold tracking-tight text-[#1c1b1b] leading-tight">My Learning</h2>
      </div>

      {/* Progress overview card */}
      <section className="mx-6 mb-6 bg-[#f2eeed] p-5 rounded-xl relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="z-10 w-3/5">
            <h3 className="text-lg font-bold leading-tight mb-1 text-[#1c1b1b]">{ACTIVE_PATHWAY.title}</h3>
            <p className="text-sm text-[#584144] font-medium">
              {overallPct}% complete · {ACTIVE_PATHWAY.steps.length} modules
            </p>
          </div>
          {/* Progress orb */}
          <div className="relative w-20 h-20 flex items-center justify-center flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" fill="transparent" stroke="#debfc2" strokeWidth="5" />
              <circle
                cx="40" cy="40" r="32" fill="transparent"
                stroke="#7b5800" strokeWidth="5"
                strokeDasharray="201"
                strokeDashoffset={201 - (201 * overallPct) / 100}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-base font-bold text-[#7b5800]">{overallPct}%</span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-4 h-1.5 w-full bg-[#debfc2] rounded-full overflow-hidden">
          <div className="h-full bg-[#8c0f37] rounded-full" style={{ width: `${overallPct}%` }} />
        </div>
      </section>

      {/* Current module card */}
      <section className="mx-6 mb-6">
        <div className="bg-gradient-to-br from-[#8c0f37] to-[#ad2c4d] p-5 rounded-xl text-white">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">Active</span>
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>timer</span>
            <span className="text-xs font-medium">~{ACTIVE_PATHWAY.estimatedWeeks} weeks</span>
          </div>
          <h4 className="text-xl font-bold leading-snug mb-5">{ACTIVE_PATHWAY.title}</h4>
          <p className="text-white/80 text-sm mb-4">{ACTIVE_PATHWAY.description}</p>
          <button className="w-full bg-white text-[#8c0f37] font-bold py-3 rounded-lg flex items-center justify-center gap-2 active:scale-95 transition-transform">
            <span className="material-symbols-outlined">play_arrow</span>
            Continue Learning
          </button>
        </div>
      </section>

      {/* In-progress / upcoming modules — Stitch-aligned */}
      <section className="mx-6 mb-6">
        <h5 className="text-xs font-bold uppercase tracking-widest text-[#584144] mb-4">Course Modules</h5>
        <div className="space-y-3">
          {upcomingModules.map((stepLabel, i) => {
            const isCompleted = i < completedCount;
            const isActive = i === completedCount;
            const isLocked = i > completedCount;
            return (
              <div
                key={i}
                className={`flex items-center gap-4 rounded-xl px-4 py-3 ${
                  isCompleted
                    ? 'bg-white border-l-4 border-[#7b5800] shadow-sm'
                    : isActive
                    ? 'bg-white border-l-4 border-[#8c0f37] shadow-sm'
                    : 'bg-[#f6f3f2] opacity-60'
                }`}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isCompleted
                      ? 'rgba(123,88,0,0.1)'
                      : isActive
                      ? 'rgba(140,15,55,0.1)'
                      : 'rgba(88,65,68,0.1)',
                  }}
                >
                  <span
                    className="material-symbols-outlined text-base"
                    style={{
                      color: isCompleted ? '#7b5800' : isActive ? '#8c0f37' : '#584144',
                      fontVariationSettings: isCompleted ? "'FILL' 1" : "'FILL' 0",
                    }}
                  >
                    {isCompleted ? 'check_circle' : isLocked ? 'lock' : (MODULE_ICONS[ACTIVE_PATHWAY.category] ?? 'school')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[10px] font-bold uppercase tracking-tight mb-0.5"
                    style={{ color: isCompleted ? '#7b5800' : isActive ? '#8c0f37' : '#584144' }}
                  >
                    {isCompleted ? 'Completed' : isActive ? 'In Progress' : 'Locked'}
                  </p>
                  <p className="text-sm font-semibold text-[#1c1b1b] truncate">{stepLabel}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Completed courses section (Stitch: in-progress vs completed separation) */}
      {completedCount > 0 && (
        <section className="mx-6 mb-6">
          <h5 className="text-xs font-bold uppercase tracking-widest text-[#584144] mb-3">Completed</h5>
          <div className="space-y-3">
            {ACTIVE_PATHWAY.steps.slice(0, completedCount).map((stepLabel, i) => (
              <div key={i} className="flex items-center gap-4 bg-white rounded-xl px-4 py-3 border-l-4 border-[#7b5800] shadow-sm">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(123,88,0,0.1)' }}>
                  <span className="material-symbols-outlined text-base" style={{ color: '#7b5800', fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-tight mb-0.5 text-[#7b5800]">Completed</p>
                  <p className="text-sm font-semibold text-[#1c1b1b] truncate">{stepLabel}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>

    {/* ── Desktop view ── */}
    <div className="wa-hidden wa-md:wa-block">
    <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto' }}>
      {/* Top bar: label + heading + progress */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        <div>
          <div
            style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-accent)',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.06em',
              marginBottom: 'var(--space-2)',
            }}
          >
            Curriculum Oversight
          </div>
          <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 'var(--font-weight-bold)', lineHeight: 'var(--line-height-tight)', margin: 0 }}>
            The Learning Hub
          </h1>
          <p style={{ color: 'var(--color-on-surface-variant)', marginTop: 'var(--space-2)', maxWidth: '560px' }}>
            Your pathways, searchable career resources, and program-specific tools — organized so you always know where to look next.
          </p>
        </div>

        {/* Overall completion */}
        <div
          style={{
            background: 'var(--surface-container)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-4) var(--space-6)',
            minWidth: '200px',
            textAlign: 'right',
          }}
        >
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-2)' }}>
            Overall Completion
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-2)' }}>
            {overallPct}%
          </div>
          <div style={{ height: '6px', background: 'var(--surface-container-highest)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${overallPct}%`, background: 'var(--color-accent)', borderRadius: 'var(--radius-full)', transition: 'var(--transition-base)' }} />
          </div>
        </div>
      </div>

      {/* Hero card + Course Milestones sidebar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-8)',
        }}
      >
        {/* Active course hero */}
        <div
          style={{
            background: 'linear-gradient(135deg, var(--surface-container-low) 0%, var(--surface-container) 100%)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-8)',
            border: '1px solid var(--outline-variant)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '280px',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                background: 'rgba(173,44,77,0.12)',
                color: 'var(--color-accent)',
                padding: 'var(--space-1) var(--space-3)',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>play_circle</span>
              Currently Active
            </div>
            <h2 style={{ fontSize: 'var(--font-size-h2)', fontWeight: 'var(--font-weight-bold)', lineHeight: 'var(--line-height-tight)', marginBottom: 'var(--space-2)' }}>
              {ACTIVE_PATHWAY.title}
            </h2>
            <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--font-size-base)', marginBottom: 'var(--space-3)' }}>
              {ACTIVE_PATHWAY.description}
            </p>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)', display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <span>~{ACTIVE_PATHWAY.estimatedWeeks} weeks</span>
              <span>{ACTIVE_PATHWAY.steps.length} milestones</span>
              <span>{ACTIVE_PATHWAY.category}</span>
            </div>
            {/* Progress bar */}
            <div style={{ height: '8px', background: 'var(--surface-container-highest)', borderRadius: 'var(--radius-full)', overflow: 'hidden', maxWidth: '360px', marginBottom: 'var(--space-4)' }}>
              <div style={{ height: '100%', width: '25%', background: 'var(--color-accent)', borderRadius: 'var(--radius-full)' }} />
            </div>
          </div>
          <div>
            <a
              href={`/dashboard/learning`}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: '0.75rem 1.5rem',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>play_arrow</span>
              Resume Learning
            </a>
          </div>
        </div>

        {/* Course Milestones sidebar (vertical timeline) */}
        <div
          style={{
            background: 'var(--surface-container)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-6)',
          }}
        >
          <h3 style={{ fontSize: 'var(--font-size-h4)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-6)' }}>
            Course Milestones
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {ACTIVE_PATHWAY.steps.map((step, i) => {
              const status = i === 0 ? 'completed' : i === 1 ? 'current' : 'locked';
              return (
                <div key={step} style={{ display: 'flex', gap: 'var(--space-3)', position: 'relative' }}>
                  {/* Timeline line */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '24px', flexShrink: 0 }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: status === 'completed'
                          ? 'var(--color-green)'
                          : status === 'current'
                            ? 'var(--color-accent)'
                            : 'var(--surface-container-highest)',
                        flexShrink: 0,
                      }}
                    >
                      <span className="material-symbols-outlined" style={{
                        fontSize: '0.875rem',
                        color: status === 'locked' ? 'var(--color-on-surface-variant)' : 'var(--color-white)',
                        fontVariationSettings: "'FILL' 1",
                      }}>
                        {status === 'completed' ? 'check' : status === 'current' ? 'arrow_forward' : 'lock'}
                      </span>
                    </div>
                    {i < ACTIVE_PATHWAY.steps.length - 1 && (
                      <div style={{
                        width: '2px',
                        flexGrow: 1,
                        minHeight: '24px',
                        background: status === 'completed' ? 'var(--color-green)' : 'var(--surface-container-highest)',
                      }} />
                    )}
                  </div>
                  {/* Content */}
                  <div style={{ paddingBottom: 'var(--space-4)' }}>
                    <div style={{
                      fontWeight: status === 'current' ? 'var(--font-weight-medium)' : 'var(--font-weight-normal)',
                      color: status === 'locked' ? 'var(--color-on-surface-variant)' : 'var(--color-on-surface)',
                      opacity: status === 'locked' ? 0.5 : 1,
                      fontSize: 'var(--font-size-sm)',
                    }}>
                      {step}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                      {status === 'completed' && 'Done'}
                      {status === 'current' && 'In progress'}
                      {status === 'locked' && 'Locked'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Destination cards (existing component — career library, program resources) */}
      <LearningHubDestinationCards />

      {/* Upcoming Modules grid */}
      <section style={{ marginBottom: 'var(--space-8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>
            view_module
          </span>
          <h2 style={{ fontSize: 'var(--font-size-h3)', fontWeight: 'var(--font-weight-bold)', margin: 0 }}>Upcoming Modules</h2>
        </div>
        <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-6)' }}>
          Step-by-step tracks toward job-ready skills. Your progress syncs as you complete steps.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
          {PATHWAYS.map((pathway, idx) => {
            const isLocked = idx > 1;
            const icon = MODULE_ICONS[pathway.category] ?? 'school';
            return (
              <div
                key={pathway.id}
                style={{
                  background: 'var(--surface-container)',
                  borderRadius: 'var(--radius-xl)',
                  padding: 'var(--space-6)',
                  opacity: isLocked ? 0.55 : 1,
                  position: 'relative',
                  border: idx === 0 ? '1px solid var(--color-accent)' : '1px solid transparent',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: '1.75rem',
                      color: isLocked ? 'var(--color-on-surface-variant)' : 'var(--color-accent)',
                      background: isLocked ? 'var(--surface-container-highest)' : 'rgba(173,44,77,0.12)',
                      borderRadius: 'var(--radius-lg)',
                      padding: 'var(--space-2)',
                      fontVariationSettings: "'FILL' 1",
                    }}
                  >
                    {icon}
                  </span>
                  {isLocked && (
                    <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: 'var(--color-on-surface-variant)' }}>
                      lock
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-1)' }}>
                  {pathway.category}
                </div>
                <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-2)' }}>
                  {pathway.title}
                </h3>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-3)' }}>
                  {pathway.description}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>menu_book</span>
                    {pathway.steps.length} lessons
                  </span>
                  <span>~{pathway.estimatedWeeks} wks</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Structured pathways (existing cards with interactive progress) */}
      <section style={{ marginBottom: 'var(--space-8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>
            school
          </span>
          <h2 style={{ fontSize: 'var(--font-size-h3)', fontWeight: 'var(--font-weight-bold)', margin: 0 }}>Structured Pathways</h2>
        </div>
        <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-6)' }}>
          Step-by-step tracks toward job-ready skills. Your progress syncs as you complete steps.
        </p>
        <div className="learning-pathways-grid">
          {PATHWAYS.map((pathway) => (
            <LearningPathCard key={pathway.id} pathway={pathway} />
          ))}
        </div>
      </section>

      {/* CivicBot floating panel (static mockup) */}
      <div
        style={{
          position: 'fixed',
          bottom: 'var(--space-6)',
          right: 'var(--space-6)',
          width: '320px',
          background: 'var(--surface-container-low)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--outline-variant)',
          boxShadow: 'var(--shadow-glass)',
          overflow: 'hidden',
          zIndex: 100,
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-white)',
            padding: 'var(--space-4) var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
          <div>
            <div style={{ fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-sm)' }}>WAP Study Assistant</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>Ask me anything about your courses</div>
          </div>
        </div>
        {/* Chat body mockup */}
        <div style={{ padding: 'var(--space-4)', minHeight: '120px' }}>
          <div
            style={{
              background: 'var(--surface-container)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-3)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-on-surface-variant)',
              marginBottom: 'var(--space-3)',
            }}
          >
            Hi! I can help you study, explain concepts, or quiz you on your current module. What would you like to work on?
          </div>
        </div>
        {/* Input mockup */}
        <div style={{ padding: '0 var(--space-4) var(--space-4)', display: 'flex', gap: 'var(--space-2)' }}>
          <div
            style={{
              flex: 1,
              background: 'var(--surface-container)',
              borderRadius: 'var(--radius-full)',
              padding: 'var(--space-2) var(--space-4)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-on-surface-variant)',
              opacity: 0.6,
            }}
          >
            Type a message...
          </div>
          <button
            type="button"
            style={{
              background: 'var(--color-accent)',
              color: 'var(--color-white)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            aria-label="Send message"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>send</span>
          </button>
        </div>
      </div>
    </div>
    </div> {/* end hidden md:block */}

    <MobileBottomNav variant="portal" />
    </>
  );
}
