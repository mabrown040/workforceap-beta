import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { PATHWAYS, getPathwayForProgram } from '@/lib/content/learningPathways';
import { getProgramBySlug } from '@/lib/content/programs';
import { buildPathwayMilestones } from '@/lib/content/pathwayStepDisplay';
import PageHeader from '@/components/portal/PageHeader';
import LearningPathCard from '@/components/portal/LearningPathCard';
import LearningHubDestinationCards from '@/components/portal/LearningHubDestinationCards';
import LearningHubEnrolledCourses from '@/components/portal/LearningHubEnrolledCourses';
import FindYourCareerSection from '@/components/portal/FindYourCareerSection';
import LearningCivicBotPanel from '@/components/portal/LearningCivicBotPanel';
import MobileBottomNav from '@/components/MobileBottomNav';
import { parseCourseSlugList } from '@/lib/member/parseCourseSlugList';

export const metadata: Metadata = buildPageMetadata({
  title: 'The Learning Hub',
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

export default async function LearningPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/learning');

  const [allProgress, dbUser] = await Promise.all([
    prisma.pathwayStepProgress.findMany({
      where: { userId: user.id },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { enrolledProgram: true, assessmentCompleted: true, coursesCompleted: true },
    }),
  ]);
  const isEnrolled = !!dbUser?.enrolledProgram;
  const enrolledProgram = dbUser?.enrolledProgram ?? null;
  // Use the member's enrolled program to determine their pathway.
  // Previously hardcoded to PATHWAYS[0] — all members saw IT Support.
  const ACTIVE_PATHWAY = getPathwayForProgram(enrolledProgram);
  const programMeta = enrolledProgram ? getProgramBySlug(enrolledProgram) : null;
  const coursesForMember = programMeta?.courses ?? [];
  const coursesCompletedSlugs = parseCourseSlugList(dbUser?.coursesCompleted);
  const pathwayMilestones = buildPathwayMilestones(ACTIVE_PATHWAY, allProgress);

  const totalStepsAllPathways = PATHWAYS.reduce((sum, p) => sum + p.steps.length, 0);
  const completedAll = allProgress.filter((r) => r.status === 'completed').length;
  const overallPct =
    totalStepsAllPathways > 0 ? Math.round((completedAll / totalStepsAllPathways) * 100) : 0;

  return (
    <>
    <h1 className="wa-sr-only">The Learning Hub</h1>
    {/* ── Mobile learning view (≤640px) ── */}
    <div className="md:wa-hidden" style={{ paddingBottom: '6rem' }}>
      {/* Header */}
      <div style={{ padding: '1.5rem 1.5rem 0', marginBottom: '1.5rem' }}>
        <p className="wa-text-[11px] wa-font-medium wa-tracking-[0.1em] wa-uppercase wa-text-[var(--color-accent)]" style={{ display: 'block', marginBottom: '0.5rem' }}>Your Learning</p>
        <h2 className="wa-text-3xl wa-font-bold wa-tracking-tight wa-text-[var(--color-on-surface)] wa-leading-tight">The Learning Hub</h2>
      </div>

      {/* Progress overview card */}
      <section className="wa-bg-[var(--surface-container-low)]" style={{ margin: '0 1.5rem 1.5rem', padding: '1.25rem', borderRadius: '0.75rem', position: 'relative', overflow: 'hidden', border: '1px solid color-mix(in srgb, var(--outline-variant) 35%, transparent)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ zIndex: 10, width: '60%' }}>
            <h3 className="wa-text-lg wa-font-bold wa-leading-tight wa-text-[var(--color-on-surface)]" style={{ marginBottom: '0.25rem' }}>{ACTIVE_PATHWAY.title}</h3>
            <p className="wa-text-sm wa-text-[var(--color-on-surface-variant)] wa-font-medium">
              {isEnrolled ? 'In Progress' : 'Not Started'} · {ACTIVE_PATHWAY.steps.length} modules
            </p>
          </div>
          {/* Progress orb */}
          <div style={{ position: 'relative', width: '5rem', height: '5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg className="-wa-rotate-90" style={{ width: '100%', height: '100%' }} viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" fill="transparent" stroke="var(--outline-variant)" strokeWidth="5" />
              <circle
                cx="40" cy="40" r="32" fill="transparent"
                stroke="var(--color-gold)" strokeWidth="5"
                strokeDasharray="201"
                strokeDashoffset={201 - (201 * Math.min(100, overallPct)) / 100}
                strokeLinecap="round"
              />
            </svg>
            <span className="wa-text-base wa-font-bold wa-text-[var(--color-gold)]" style={{ position: 'absolute' }}>{overallPct}%</span>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ marginTop: '1rem', height: '0.375rem', width: '100%', borderRadius: '9999px', overflow: 'hidden', background: 'color-mix(in srgb, var(--outline-variant) 45%, transparent)' }}>
          <div className="wa-bg-[var(--color-accent)]" style={{ width: `${Math.min(100, overallPct)}%`, height: '100%', borderRadius: '9999px' }} />
        </div>
      </section>

      <LearningHubEnrolledCourses
        variant="mobile"
        programTitle={programMeta?.title ?? null}
        courses={coursesForMember}
        completedSlugs={coursesCompletedSlugs}
        assessmentCompleted={dbUser?.assessmentCompleted ?? false}
      />

      <FindYourCareerSection compact />

      {/* Current module card */}
      <section style={{ margin: '0 1.5rem 1.5rem' }}>
        <div className="wa-bg-gradient-to-br from-[var(--color-accent-dark)] to-[var(--color-accent)] wa-text-white" style={{ padding: '1.25rem', borderRadius: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span className="bg-white/20 wa-text-[10px] wa-font-bold wa-tracking-wider wa-uppercase" style={{ padding: '0.125rem 0.5rem', borderRadius: '0.25rem' }}>Active</span>
            <span className="material-symbols-outlined wa-text-sm" style={{ '--ms-fill': 1 }}>timer</span>
            <span className="wa-text-xs wa-font-medium">~{ACTIVE_PATHWAY.estimatedWeeks} weeks</span>
          </div>
          <h4 className="wa-text-xl wa-font-bold wa-leading-snug" style={{ marginBottom: '1.25rem' }}>{ACTIVE_PATHWAY.title}</h4>
          <p className="text-white/80 wa-text-sm" style={{ marginBottom: '1rem' }}>{ACTIVE_PATHWAY.description}</p>
          <Link
            href="/dashboard/training"
            className="wa-bg-white wa-text-[var(--color-accent)] wa-font-bold active:wa-scale-95 wa-transition-transform"
            style={{
              width: '100%',
              padding: '0.75rem 0',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              textDecoration: 'none',
            }}
          >
            <span className="material-symbols-outlined" aria-hidden="true">play_arrow</span>
            Continue Learning
          </Link>
        </div>
      </section>

      {/* Pathway steps — synced from your pathway progress */}
      <section style={{ margin: '0 1.5rem 1.5rem' }}>
        <h5 className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-widest wa-text-[var(--color-on-surface-variant)]" style={{ marginBottom: '1rem' }}>Pathway steps</h5>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {pathwayMilestones.slice(0, 4).map((m) => {
            const isCompleted = m.status === 'complete';
            const isActive = m.status === 'current';
            const isLocked = m.status === 'locked';
            return (
              <div
                key={m.stepIndex}
                className={`${isCompleted ? 'wa-bg-[var(--surface-container)] wa-border-l-4 wa-border-[var(--color-gold)]' : isActive ? 'wa-bg-[var(--surface-container)] wa-border-l-4 wa-border-[var(--color-accent)]' : 'wa-bg-[var(--surface-container-highest)] wa-opacity-60'}`}
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderRadius: '0.75rem', padding: '0.75rem 1rem', boxShadow: isCompleted || isActive ? '0 1px 2px rgba(0,0,0,0.05)' : undefined }}
              >
                <div
                  style={{
                    width: '2.25rem',
                    height: '2.25rem',
                    borderRadius: '9999px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    background: isCompleted
                      ? 'rgba(123,88,0,0.1)'
                      : isActive
                      ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)'
                      : 'rgba(88,65,68,0.1)',
                  }}
                >
                  <span
                    className="material-symbols-outlined wa-text-base"
                    style={{
                      color: isCompleted ? 'var(--color-gold)' : isActive ? 'var(--color-accent)' : 'var(--color-on-surface-variant)',
                      '--ms-fill': isCompleted ? 1 : 0,
                    }}
                   aria-hidden="true">
                    {isCompleted ? 'check_circle' : isLocked ? 'lock' : (MODULE_ICONS[ACTIVE_PATHWAY.category] ?? 'school')}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    className="wa-text-[10px] wa-font-bold wa-uppercase wa-tracking-tight"
                    style={{ marginBottom: '0.125rem', color: isCompleted ? 'var(--color-gold)' : isActive ? 'var(--color-accent)' : 'var(--color-on-surface-variant)' }}
                  >
                    {m.detail}
                  </p>
                  <p className="wa-text-sm wa-font-semibold wa-text-[var(--color-on-surface)] wa-truncate">{m.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {pathwayMilestones.some((m) => m.status === 'complete') && (
        <section style={{ margin: '0 1.5rem 1.5rem' }}>
          <h5 className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-widest wa-text-[var(--color-on-surface-variant)]" style={{ marginBottom: '0.75rem' }}>Completed</h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {pathwayMilestones
              .filter((m) => m.status === 'complete')
              .map((m) => (
              <div key={m.stepIndex} className="wa-bg-[var(--surface-container)] wa-border-l-4 wa-border-[var(--color-gold)]" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderRadius: '0.75rem', padding: '0.75rem 1rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(123,88,0,0.1)' }}>
                  <span className="material-symbols-outlined wa-text-base" style={{ color: 'var(--color-gold)', '--ms-fill': 1 }}>
                    check_circle
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="wa-text-[10px] wa-font-bold wa-uppercase wa-tracking-tight wa-text-[var(--color-gold)]" style={{ marginBottom: '0.125rem' }}>Completed</p>
                  <p className="wa-text-sm wa-font-semibold wa-text-[var(--color-on-surface)] wa-truncate">{m.label}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>

    {/* ── Desktop view ── */}
    <div className="wa-hidden md:wa-block">
    <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto' }}>
      {/* Top bar: label + heading + progress */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        <div>
          <PageHeader
            title="The Learning Hub"
            subtitle="Your pathways, searchable career resources, and program-specific tools — organized so you always know where to look next."
            breadcrumbs={[{ label: 'Member Portal', href: '/dashboard' }, { label: 'Learning Hub' }]}
          />
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
            <div style={{ height: '100%', width: `${Math.min(100, overallPct)}%`, background: 'var(--color-accent)', borderRadius: 'var(--radius-full)', transition: 'var(--transition-base)' }} />
          </div>
        </div>
      </div>

      <LearningHubEnrolledCourses
        variant="desktop"
        programTitle={programMeta?.title ?? null}
        courses={coursesForMember}
        completedSlugs={coursesCompletedSlugs}
        assessmentCompleted={dbUser?.assessmentCompleted ?? false}
      />

      <FindYourCareerSection />

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
              <span className="material-symbols-outlined" style={{ fontSize: '1rem', '--ms-fill': 1 }}>play_circle</span>
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
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, overallPct)}%`,
                  background: 'var(--color-accent)',
                  borderRadius: 'var(--radius-full)',
                }}
              />
            </div>
          </div>
          <div>
            <Link
              href="/dashboard/training"
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: '0.75rem 1.5rem',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }} aria-hidden="true">
                play_arrow
              </span>
              Resume Learning
            </Link>
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
            {pathwayMilestones.map((m, i) => {
              const status = m.status === 'complete' ? 'completed' : m.status === 'current' ? 'current' : 'locked';
              return (
                <div key={m.stepIndex} style={{ display: 'flex', gap: 'var(--space-3)', position: 'relative' }}>
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
                        '--ms-fill': 1,
                      }}>
                        {status === 'completed' ? 'check' : status === 'current' ? 'arrow_forward' : 'lock'}
                      </span>
                    </div>
                    {i < pathwayMilestones.length - 1 && (
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
                      {m.label}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                      {m.detail}
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

      {/* Your learning pathway — enrolled pathway only, with real DB-backed progress */}
      <section style={{ marginBottom: 'var(--space-8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: 'var(--color-accent)', '--ms-fill': 1 }}>
            school
          </span>
          <h2 className="portal-section-heading" style={{ margin: 0 }}>Your Learning Pathway</h2>
        </div>
        <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-6)' }}>
          Track and mark each step as you complete it. Progress saves to your profile.
        </p>
        <div style={{ maxWidth: '560px' }}>
          <LearningPathCard pathway={ACTIVE_PATHWAY} />
        </div>
      </section>

      <LearningCivicBotPanel />
    </div>
    </div> {/* end hidden md:block */}

    <MobileBottomNav variant="portal" />
    </>
  );
}
