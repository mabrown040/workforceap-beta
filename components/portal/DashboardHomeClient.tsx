'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Calendar, BarChart3, Target, PartyPopper, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { MEMBER_APPLICATION_PROGRESS_STEPS } from '@/lib/member/memberApplicationStatus';
import { trackFunnelEvent } from '@/lib/analytics/events';
import { postMemberEvent } from '@/lib/events/client';
import MemberPreScreeningForm from '@/components/portal/MemberPreScreeningForm';
import MemberInterviewRequestButton from '@/components/portal/MemberInterviewRequestButton';
import YouthDashboardNotice from '@/components/portal/YouthDashboardNotice';

type State = 'A' | 'B' | 'C' | 'D';

export type DashboardApplicationStatusProps = {
  label: string;
  submittedAt: string | null;
  programInterest: string | null;
  nextStep: string;
  showResponseEstimate: boolean;
  progressIndex: number | null;
};

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
  age?: number | null;
  isMinor?: boolean;
  applicationStatus?: DashboardApplicationStatusProps | null;
  /** True when member has no Application row — prompt to apply */
  noApplicationOnFile?: boolean;
  assessmentDone?: boolean;
  preScreeningDone?: boolean;
  interviewEligible?: boolean;
  interviewRequestedAt?: Date | null;
  interviewCompletedAt?: Date | null;
};

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
  applicationStatus,
  noApplicationOnFile,
  assessmentDone = false,
  preScreeningDone = false,
  interviewEligible = false,
  interviewRequestedAt = null,
  interviewCompletedAt = null,
  age = null,
  isMinor = false,
}: DashboardHomeClientProps) {
  const primaryAction = recommendedActions[0];
  const secondaryAction = recommendedActions[1];

  useEffect(() => {
    trackFunnelEvent('member_dashboard', 'dashboard_viewed', { state, checklist_all_done: checklistAllDone });
    void postMemberEvent({
      eventName: 'member_dashboard_viewed',
      sourcePage: '/dashboard',
      metadata: { state, checklistAllDone },
    });
  }, [state, checklistAllDone]);

  const handleDashboardAction = (action: string) => {
    trackFunnelEvent('member_dashboard', action, { state });
    void postMemberEvent({
      eventName: 'member_dashboard_action_clicked',
      sourcePage: '/dashboard',
      metadata: { state, action },
    });
  };

  return (
    <div className="dashboard-home-coach">
      {age !== null && age < 18 ? <YouthDashboardNotice age={age} /> : null}

      <header className="dashboard-home-header">
        <h1>
          {state === 'A' ? (
            <>Welcome, {firstName} 👋</>
          ) : (
            <>Hi, {firstName}</>
          )}
        </h1>
        <p className="dashboard-home-subtitle">
          {state === 'A' && (isMinor && age ? `Let's explore career paths and build skills.` : "Let's build your career path.")}
          {state === 'B' && "You're enrolled. One step before training."}
          {state === 'C' && "You're making progress toward job-ready."}
          {state === 'D' && "All courses complete. Focus on job outcomes."}
        </p>
      </header>

      {noApplicationOnFile ? (
        <section className="dashboard-application-status" aria-labelledby="dashboard-application-status-heading">
          <h2 id="dashboard-application-status-heading" className="dashboard-today-label">
            Program application
          </h2>
          <div className="dashboard-application-status-card">
            <p className="dashboard-application-status-next" style={{ marginTop: 0 }}>
              We do not have an application on file for this account yet.
            </p>
            <Link href="/apply" className="btn btn-primary" style={{ marginTop: '0.75rem', display: 'inline-flex' }}>
              Start your application
            </Link>
          </div>
        </section>
      ) : applicationStatus ? (
        <section className="dashboard-application-status" aria-labelledby="dashboard-application-status-heading">
          <h2 id="dashboard-application-status-heading" className="dashboard-today-label">
            Program application
          </h2>
          <div className="dashboard-application-status-card">
            {applicationStatus.progressIndex !== null ? (
              <div className="dashboard-application-progress" aria-hidden>
                <div className="dashboard-application-progress-track">
                  {MEMBER_APPLICATION_PROGRESS_STEPS.map((stepLabel, i) => {
                    const stepNum = i + 1;
                    const done = stepNum < applicationStatus.progressIndex!;
                    const current = stepNum === applicationStatus.progressIndex;
                    return (
                      <div
                        key={stepLabel}
                        className={`dashboard-application-progress-step${done ? ' is-done' : ''}${
                          current ? ' is-current' : ''
                        }`}
                      >
                        <span className="dashboard-application-progress-dot" />
                        <span className="dashboard-application-progress-label">{stepLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <div className="dashboard-application-status-row">
              <div>
                <p className="dashboard-application-status-label">Current status</p>
                <p className="dashboard-application-status-value">{applicationStatus.label}</p>
              </div>
              {applicationStatus.submittedAt ? (
                <div className="dashboard-application-status-meta">
                  <p className="dashboard-application-status-label">Submitted</p>
                  <p className="dashboard-application-status-date">
                    {new Date(applicationStatus.submittedAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              ) : null}
            </div>
            {applicationStatus.programInterest ? (
              <p className="dashboard-application-status-program">
                <span className="dashboard-application-status-label">Program interest</span>{' '}
                {applicationStatus.programInterest}
              </p>
            ) : null}
            <p className="dashboard-application-status-next">{applicationStatus.nextStep}</p>
            {applicationStatus.showResponseEstimate ? (
              <p className="dashboard-application-status-estimate">
                We typically respond within 24–48 hours on business days.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {assessmentDone && !preScreeningDone ? (
        <section className="dashboard-application-status" aria-labelledby="dashboard-prescreen-heading">
          <h2 id="dashboard-prescreen-heading" className="dashboard-today-label">
            Pre-screening (before your interview)
          </h2>
          <div className="dashboard-application-status-card">
            <MemberPreScreeningForm />
          </div>
        </section>
      ) : null}

      {assessmentDone && preScreeningDone && interviewEligible && !interviewCompletedAt ? (
        <section className="dashboard-application-status" aria-labelledby="dashboard-interview-heading">
          <h2 id="dashboard-interview-heading" className="dashboard-today-label">
            Interview
          </h2>
          <div className="dashboard-application-status-card">
            {interviewRequestedAt ? (
              <p style={{ margin: 0, color: 'var(--color-gray-700)' }}>
                We received your interview request on{' '}
                {new Date(interviewRequestedAt).toLocaleString()}. A counselor will reach out by email.
              </p>
            ) : (
              <MemberInterviewRequestButton />
            )}
          </div>
        </section>
      ) : null}

      {/* Today / Next Step — one primary, one secondary */}
      <section className="dashboard-today">
        <h2 className="dashboard-today-label">Today</h2>

        {state === 'A' && (
          <div className="dashboard-today-card">
            <h3>Choose your program</h3>
            <p>
              Select one of our no-cost career programs. Funding is tied to a single program — we'll help you pick the right fit.
            </p>
            <div className="dashboard-today-actions">
              <Link href="/dashboard/program" className="btn btn-primary dashboard-today-primary" onClick={() => handleDashboardAction('choose_program_clicked')}>
                Choose Your Program
              </Link>
              <Link href="/how-it-works" className="btn btn-ghost dashboard-today-secondary" onClick={() => handleDashboardAction('how_it_works_clicked')}>
                How It Works
              </Link>
            </div>
          </div>
        )}

        {state === 'B' && (
          <div className="dashboard-today-card">
            <h3>Complete your skills assessment</h3>
            <p>
              A quick assessment tailors your {programTitle} learning path and unlocks role matching so we can surface jobs that fit.
            </p>
            <div className="dashboard-today-actions">
              <Link href="/dashboard/assessment" className="btn btn-primary dashboard-today-primary" onClick={() => handleDashboardAction('assessment_clicked')}>
                Take Assessment
              </Link>
              <Link href="/dashboard/program" className="btn btn-ghost dashboard-today-secondary" onClick={() => handleDashboardAction('view_program_clicked')}>
                View Program
              </Link>
            </div>
          </div>
        )}

        {state === 'C' && (
          <div className="dashboard-today-card">
            <h3>{nextMilestone ? `Complete: ${nextMilestone}` : 'Continue training'}</h3>
            <p>
              {completedCount} of {totalCourses} courses done. Finish training to move toward job-ready — employers see your progress.
            </p>
            <div className="dashboard-today-actions">
              <Link href="/dashboard/training" className="btn btn-primary dashboard-today-primary" onClick={() => handleDashboardAction('continue_training_clicked')}>
                Continue Training
              </Link>
              {primaryAction && (
                <Link href={primaryAction.href} className="btn btn-ghost dashboard-today-secondary" onClick={() => handleDashboardAction('recommended_action_clicked')}>
                  Or: {primaryAction.label}
                </Link>
              )}
            </div>
          </div>
        )}

        {state === 'D' && (
          <div className="dashboard-today-card dashboard-today-card-highlight">
            <div className="dashboard-today-celebrate">
              <PartyPopper size={28} />
              <span>All courses complete</span>
            </div>
            <h3>Focus on job outcomes</h3>
            <p>
              You've finished {programTitle}. Build readiness and apply — resume, applications, and interview practice move you toward offers.
            </p>
            <div className="dashboard-today-actions">
              <Link href="/dashboard/readiness" className="btn btn-primary dashboard-today-primary" onClick={() => handleDashboardAction('career_readiness_clicked')}>
                View Career Readiness
              </Link>
              {jobSearchUrl ? (
                <a href={jobSearchUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost dashboard-today-secondary" onClick={() => handleDashboardAction('job_search_clicked')}>
                  Browse jobs in your area
                </a>
              ) : primaryAction ? (
                <Link href={primaryAction.href} className="btn btn-ghost dashboard-today-secondary" onClick={() => handleDashboardAction('recommended_action_clicked')}>
                  Or: {primaryAction.label}
                </Link>
              ) : null}
            </div>
          </div>
        )}
      </section>

      <section className="dashboard-weekly-nudge" aria-label="This week">
        <h2 className="dashboard-today-label">This week</h2>
        <ul className="dashboard-weekly-links">
          <li>
            <Link href="/dashboard/weekly-recap" onClick={() => handleDashboardAction('weekly_recap_clicked')}>Weekly recap</Link>
            <span className="dashboard-weekly-links-desc"> — milestones and reminders</span>
          </li>
          <li>
            <Link href="/dashboard/learning" onClick={() => handleDashboardAction('learning_hub_clicked')}>Learning hub</Link>
            <span className="dashboard-weekly-links-desc"> — resources and your paths</span>
          </li>
          <li>
            <Link href="/dashboard/ai-tools" onClick={() => handleDashboardAction('ai_tools_clicked')}>Career tools</Link>
            <span className="dashboard-weekly-links-desc"> — resume, interview practice, job match</span>
          </li>
        </ul>
      </section>

      {/* Compact progress — preserve what works */}
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
            <span className="dashboard-progress-meta">{completedCount} of {totalCourses} courses</span>
          </div>
        </section>
      )}

      {/* One specific recommendation — when relevant, not a block of three */}
      {state === 'C' && secondaryAction && (
        <section className="dashboard-also">
          <p>
            <strong>Also:</strong> {secondaryAction.label} when you're ready.
          </p>
          <Link href={secondaryAction.href} className="dashboard-also-link" onClick={() => handleDashboardAction('secondary_action_clicked')}>
            {secondaryAction.label}
            <ChevronRight size={16} />
          </Link>
        </section>
      )}

      {state === 'D' && (jobSearchUrl ? primaryAction : secondaryAction) && (
        <section className="dashboard-also">
          <p>
            <strong>Next:</strong> {(jobSearchUrl ? primaryAction : secondaryAction)!.label} to strengthen your readiness.
          </p>
          <Link href={(jobSearchUrl ? primaryAction : secondaryAction)!.href} className="dashboard-also-link" onClick={() => handleDashboardAction('next_action_clicked')}>
            {(jobSearchUrl ? primaryAction : secondaryAction)!.label}
            <ChevronRight size={16} />
          </Link>
        </section>
      )}

      {/* Stats — minimal, stage-appropriate */}
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

      {/* Recent activity — compact */}
      {recentActivity.length > 0 && (state === 'C' || state === 'D') && (
        <details className="dashboard-recent-collapsed">
          <summary>Recent activity</summary>
          <ul>
            {recentActivity.map((a, i) => (
              <li key={i}>
                <span>{a.label}</span>
                <span>{a.timestamp.toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Checklist — always collapsed */}
      {!checklistAllDone && (
        <details className="dashboard-checklist-collapsed">
          <summary>Onboarding checklist</summary>
          <ul>
            {([
              { done: checklist.createAccount, label: 'Create account' },
              { done: checklist.chooseProgram, label: 'Choose program' },
              { done: checklist.completeAssessment, label: 'Complete assessment' },
              { done: checklist.startFirstCourse, label: 'Start first course' },
              { done: checklist.completeFirstCourse, label: 'Complete first course' },
            ] as { done: boolean; label: string }[]).map(({ done, label }) => (
              <li key={label} style={{ color: done ? 'var(--color-gray-500)' : 'var(--color-primary)' }}>
                {done
                  ? <CheckCircle2 size={15} style={{ color: 'var(--color-green)', flexShrink: 0 }} aria-hidden />
                  : <Circle size={15} style={{ color: 'var(--color-gray-300)', flexShrink: 0 }} aria-hidden />}
                <span style={{ textDecoration: done ? 'line-through' : 'none' }}>{label}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
