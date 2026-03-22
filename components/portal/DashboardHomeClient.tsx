'use client';

import Link from 'next/link';
import { BookOpen, Calendar, BarChart3, Target, PartyPopper, ChevronRight, CheckCircle2, Sparkles, Briefcase } from 'lucide-react';

type State = 'A' | 'B' | 'C' | 'D';

type DashboardHomeClientProps = {
  firstName: string;
  state: State;
  programTitle?: string;
  enrolledAt?: Date | null;
  assessmentScorePct?: number | null;
  completedCount: number;
  totalCourses: number;
  nextMilestone?: string;
  recentActivity: Array<{ label: string; timestamp: Date }>;
  checklist: {
    createAccount: boolean;
    chooseProgram: boolean;
    completeAssessment: boolean;
    startFirstCourse: boolean;
    completeFirstCourse: boolean;
  };
  checklistAllDone: boolean;
  recommendedActions: Array<{ label: string; href: string }>;
  jobSearchUrl?: string | null;
};

type JourneyAction = {
  title: string;
  description: string;
  href: string;
  cta: string;
  Icon: typeof BookOpen;
  external?: boolean;
};

function normalizeActionLabel(label: string) {
  const lower = label.toLowerCase();
  if (lower.includes('resume')) return `Complete resume: ${label}`;
  if (lower.includes('interview')) return `Practice interview: ${label}`;
  if (lower.includes('apply')) return `Apply: ${label}`;
  if (lower.includes('review')) return `Review: ${label}`;
  return `Review: ${label}`;
}

export default function DashboardHomeClient({
  firstName,
  state,
  programTitle,
  enrolledAt,
  assessmentScorePct,
  completedCount,
  totalCourses,
  nextMilestone,
  recentActivity,
  checklist,
  checklistAllDone,
  recommendedActions,
  jobSearchUrl,
}: DashboardHomeClientProps) {
  const primaryAction = recommendedActions[0];
  const secondaryAction = recommendedActions[1];
  const tertiaryAction = recommendedActions[2];

  const journeyActions: JourneyAction[] = (() => {
    if (state === 'A') {
      return [
        {
          title: 'Choose one program',
          description: 'Pick the career track you want to complete first so your dashboard can personalize the next steps.',
          href: '/dashboard/program',
          cta: 'Choose program',
          Icon: BookOpen,
        },
        {
          title: 'Review how WorkforceAP works',
          description: 'See the program flow, expectations, and what happens after you enroll.',
          href: '/how-it-works',
          cta: 'Review program flow',
          Icon: CheckCircle2,
        },
        {
          title: 'Review your dashboard tools',
          description: 'Get familiar with training, readiness, and AI support before you begin.',
          href: '/dashboard/learning',
          cta: 'Review learning hub',
          Icon: Sparkles,
        },
      ];
    }

    if (state === 'B') {
      return [
        {
          title: 'Complete your skills assessment',
          description: `Unlock your ${programTitle ?? 'program'} path and role recommendations with one required assessment.`,
          href: '/dashboard/assessment',
          cta: 'Complete assessment',
          Icon: CheckCircle2,
        },
        {
          title: 'Review your program roadmap',
          description: 'Understand the training sequence before you begin so you can move faster once unlocked.',
          href: '/dashboard/program',
          cta: 'Review program',
          Icon: BookOpen,
        },
        {
          title: 'Review your first-week plan',
          description: 'See the weekly cadence, reminders, and milestones that matter most right now.',
          href: '/dashboard/weekly-recap',
          cta: 'Review weekly plan',
          Icon: Calendar,
        },
      ];
    }

    if (state === 'C') {
      return [
        {
          title: nextMilestone ? `Complete ${nextMilestone}` : 'Continue training',
          description: `Your fastest path to job-ready status is finishing training. You have completed ${completedCount} of ${totalCourses} courses.`,
          href: '/dashboard/training',
          cta: nextMilestone ? 'Continue course' : 'Continue training',
          Icon: BookOpen,
        },
        {
          title: 'Review your readiness progress',
          description: 'Check what remains after training so you can connect learning to hiring outcomes.',
          href: '/dashboard/readiness',
          cta: 'Review readiness',
          Icon: CheckCircle2,
        },
        primaryAction
          ? {
              title: primaryAction.label,
              description: 'Take one supporting action after training to strengthen your path to applications and interviews.',
              href: primaryAction.href,
              cta: normalizeActionLabel(primaryAction.label),
              Icon: Sparkles,
            }
          : {
              title: 'Review your weekly recap',
              description: 'See reminders, milestones, and recommended next steps for this week.',
              href: '/dashboard/weekly-recap',
              cta: 'Review weekly recap',
              Icon: Calendar,
            },
      ];
    }

    return [
      {
        title: 'Review career readiness',
        description: 'Make sure your resume, profile, and applications are ready before you spend time applying broadly.',
        href: '/dashboard/readiness',
        cta: 'Review readiness',
        Icon: CheckCircle2,
      },
      jobSearchUrl
        ? {
            title: 'Apply to matched roles',
            description: 'Use your completed training to focus on local or relevant openings that align with your program.',
            href: jobSearchUrl,
            cta: 'Apply to roles',
            Icon: Briefcase,
            external: true,
          }
        : primaryAction
          ? {
              title: primaryAction.label,
              description: 'Take the next high-value step that moves you from readiness into interviews and applications.',
              href: primaryAction.href,
              cta: normalizeActionLabel(primaryAction.label),
              Icon: Briefcase,
            }
          : {
              title: 'Review your matched roles',
              description: 'Check which jobs best fit your completed program and current skills.',
              href: '/dashboard',
              cta: 'Review matched roles',
              Icon: Briefcase,
            },
      secondaryAction
        ? {
            title: secondaryAction.label,
            description: 'Keep momentum by completing one more guided action this week.',
            href: secondaryAction.href,
            cta: normalizeActionLabel(secondaryAction.label),
            Icon: Sparkles,
          }
        : {
            title: 'Review your weekly recap',
            description: 'Use your recap to stay focused on the next actions that matter most.',
            href: '/dashboard/weekly-recap',
            cta: 'Review weekly recap',
            Icon: Calendar,
          },
    ];
  })();

  const supportActions = [
    tertiaryAction
      ? { href: tertiaryAction.href, label: normalizeActionLabel(tertiaryAction.label) }
      : null,
    { href: '/dashboard/learning', label: 'Review learning hub' },
    { href: '/dashboard/ai-tools', label: 'Review career tools' },
    { href: '/dashboard/weekly-recap', label: 'Review weekly recap' },
  ].filter((item, index, arr): item is { href: string; label: string } => !!item && arr.findIndex((other) => other?.href === item.href) === index);

  return (
    <div className="dashboard-home-coach">
      <header className="dashboard-home-header">
        <h1>
          {state === 'A' ? (
            <>Welcome, {firstName} 👋</>
          ) : (
            <>Hi, {firstName}</>
          )}
        </h1>
        <p className="dashboard-home-subtitle">
          {state === 'A' && "Let's build your career path."}
          {state === 'B' && "You're enrolled. One step before training."}
          {state === 'C' && "You're making progress toward job-ready."}
          {state === 'D' && "All courses complete. Focus on job outcomes."}
        </p>
      </header>

      <section className="dashboard-today">
        <h2 className="dashboard-today-label">Today</h2>

        {state === 'A' && (
          <div className="dashboard-today-card">
            <h3>Choose your program</h3>
            <p>
              Select one no-cost career program first. Once you choose, your dashboard will guide your next steps in the right order.
            </p>
            <div className="dashboard-today-actions">
              <Link href="/dashboard/program" className="btn btn-primary dashboard-today-primary">
                Choose program
              </Link>
              <Link href="/how-it-works" className="btn btn-ghost dashboard-today-secondary">
                Review how it works
              </Link>
            </div>
          </div>
        )}

        {state === 'B' && (
          <div className="dashboard-today-card">
            <h3>Complete your skills assessment</h3>
            <p>
              This unlocks your {programTitle} path, role matching, and the next training steps that matter most right now.
            </p>
            <div className="dashboard-today-actions">
              <Link href="/dashboard/assessment" className="btn btn-primary dashboard-today-primary">
                Complete assessment
              </Link>
              <Link href="/dashboard/program" className="btn btn-ghost dashboard-today-secondary">
                Review program
              </Link>
            </div>
          </div>
        )}

        {state === 'C' && (
          <div className="dashboard-today-card">
            <h3>{nextMilestone ? `Complete ${nextMilestone}` : 'Continue training'}</h3>
            <p>
              Finish training before you split attention across other tools. You&apos;ve completed {completedCount} of {totalCourses} courses so far.
            </p>
            <div className="dashboard-today-actions">
              <Link href="/dashboard/training" className="btn btn-primary dashboard-today-primary">
                Continue training
              </Link>
              <Link href="/dashboard/readiness" className="btn btn-ghost dashboard-today-secondary">
                Review readiness
              </Link>
            </div>
          </div>
        )}

        {state === 'D' && (
          <div className="dashboard-today-card dashboard-today-card-highlight">
            <div className="dashboard-today-celebrate">
              <PartyPopper size={28} />
              <span>All courses complete</span>
            </div>
            <h3>Review readiness, then apply</h3>
            <p>
              You&apos;ve finished {programTitle}. The clearest next move is to review readiness, then focus your energy on high-fit roles.
            </p>
            <div className="dashboard-today-actions">
              <Link href="/dashboard/readiness" className="btn btn-primary dashboard-today-primary">
                Review readiness
              </Link>
              {jobSearchUrl ? (
                <a href={jobSearchUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost dashboard-today-secondary">
                  Apply to roles
                </a>
              ) : primaryAction ? (
                <Link href={primaryAction.href} className="btn btn-ghost dashboard-today-secondary">
                  {normalizeActionLabel(primaryAction.label)}
                </Link>
              ) : null}
            </div>
          </div>
        )}
      </section>

      <section className="dashboard-weekly-nudge" aria-label="Your next steps">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h2 className="dashboard-today-label">Your next 3 actions</h2>
            <p className="dashboard-home-subtitle" style={{ margin: '0.35rem 0 0' }}>
              Follow these in order so training, readiness, and job search feel like one journey.
            </p>
          </div>
        </div>
        <div style={{ display: 'grid', gap: '0.9rem', marginTop: '1rem' }}>
          {journeyActions.map((action, index) => {
            const Icon = action.Icon;
            const content = (
              <>
                <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'flex-start' }}>
                  <span aria-hidden style={{ width: 40, height: 40, borderRadius: 999, background: 'rgba(12,98,145,0.08)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-secondary, #0c6291)', flexShrink: 0 }}>
                    <Icon size={18} />
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-gray-600)' }}>
                      Step {index + 1}
                    </div>
                    <h3 style={{ margin: '0.25rem 0', fontSize: '1.05rem' }}>{action.title}</h3>
                    <p style={{ margin: 0, color: 'var(--color-gray-700)' }}>{action.description}</p>
                  </div>
                  <span aria-hidden style={{ color: 'var(--color-gray-500)', fontWeight: 600 }}>{index + 1}</span>
                </div>
                <div style={{ marginTop: '0.85rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <span className={`btn ${index === 0 ? 'btn-primary' : 'btn-ghost'}`}>{action.cta}</span>
                </div>
              </>
            );

            return action.external ? (
              <a
                key={`${action.href}-${index}`}
                href={action.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'block', padding: '1rem 1.1rem', background: '#fff', border: '1px solid var(--color-border, #e5e5e5)', borderRadius: 12, textDecoration: 'none', color: 'inherit' }}
              >
                {content}
              </a>
            ) : (
              <Link
                key={`${action.href}-${index}`}
                href={action.href}
                style={{ display: 'block', padding: '1rem 1.1rem', background: '#fff', border: '1px solid var(--color-border, #e5e5e5)', borderRadius: 12, textDecoration: 'none', color: 'inherit' }}
              >
                {content}
              </Link>
            );
          })}
        </div>
      </section>

      {(state === 'B' || state === 'C') && programTitle && (
        <section className="dashboard-progress-compact">
          <div className="dashboard-progress-bar-wrap">
            <span className="dashboard-progress-label">{programTitle}</span>
            <div className="dashboard-progress-bar">
              <div
                className="dashboard-progress-fill"
                style={{ width: `${totalCourses > 0 ? (completedCount / totalCourses) * 100 : 0}%` }}
              />
            </div>
            <span className="dashboard-progress-meta">{completedCount} of {totalCourses} courses complete</span>
          </div>
        </section>
      )}

      {(state === 'C' || state === 'D') && (secondaryAction || primaryAction) && (
        <section className="dashboard-also">
          <p>
            <strong>After that:</strong> {state === 'C' ? (secondaryAction?.label ?? 'review your weekly recap') : ((jobSearchUrl ? primaryAction : secondaryAction)?.label ?? 'review your weekly recap')}.
          </p>
          <Link href={state === 'C' ? (secondaryAction?.href ?? '/dashboard/weekly-recap') : ((jobSearchUrl ? primaryAction : secondaryAction)?.href ?? '/dashboard/weekly-recap')} className="dashboard-also-link">
            {state === 'C'
              ? normalizeActionLabel(secondaryAction?.label ?? 'Weekly recap')
              : normalizeActionLabel((jobSearchUrl ? primaryAction : secondaryAction)?.label ?? 'Weekly recap')}
            <ChevronRight size={16} />
          </Link>
        </section>
      )}

      {state === 'B' && (
        <div className="dashboard-stats-row dashboard-stats-minimal">
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon"><BookOpen size={18} /></div>
            <div className="dashboard-stat-value">{programTitle ?? '—'}</div>
            <div className="dashboard-stat-label">Program</div>
          </div>
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon"><Calendar size={18} /></div>
            <div className="dashboard-stat-value">{enrolledAt?.toLocaleDateString() ?? '—'}</div>
            <div className="dashboard-stat-label">Enrolled</div>
          </div>
        </div>
      )}

      {state === 'C' && (
        <div className="dashboard-stats-row dashboard-stats-minimal">
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon"><BarChart3 size={18} /></div>
            <div className="dashboard-stat-value">{assessmentScorePct ?? '—'}%</div>
            <div className="dashboard-stat-label">Assessment</div>
          </div>
          <div className="dashboard-stat-card">
            <div className="dashboard-stat-icon"><Target size={18} /></div>
            <div className="dashboard-stat-value" style={{ fontSize: '0.9rem' }}>{nextMilestone ?? '—'}</div>
            <div className="dashboard-stat-label">Next course</div>
          </div>
        </div>
      )}

      <details className="dashboard-checklist-collapsed">
        <summary>More tools and details</summary>
        <ul>
          {supportActions.map((item) => (
            <li key={item.href}>
              <Link href={item.href}>{item.label}</Link>
            </li>
          ))}
        </ul>
        {recentActivity.length > 0 && (state === 'C' || state === 'D') && (
          <>
            <p style={{ margin: '1rem 0 0.5rem', fontWeight: 600 }}>Recent activity</p>
            <ul>
              {recentActivity.map((a, i) => (
                <li key={i}>
                  {a.label} — {a.timestamp.toLocaleDateString()}
                </li>
              ))}
            </ul>
          </>
        )}
        {!checklistAllDone && (
          <>
            <p style={{ margin: '1rem 0 0.5rem', fontWeight: 600 }}>Onboarding checklist</p>
            <ul>
              <li>{checklist.createAccount ? '✅' : '⬜'} Create account</li>
              <li>{checklist.chooseProgram ? '✅' : '⬜'} Choose program</li>
              <li>{checklist.completeAssessment ? '✅' : '⬜'} Complete assessment</li>
              <li>{checklist.startFirstCourse ? '✅' : '⬜'} Start first course</li>
              <li>{checklist.completeFirstCourse ? '✅' : '⬜'} Complete first course</li>
            </ul>
          </>
        )}
      </details>
    </div>
  );
}
