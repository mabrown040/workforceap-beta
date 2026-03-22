'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Calendar, BarChart3, Target, PartyPopper, ChevronRight } from 'lucide-react';
import { trackFunnelEvent } from '@/lib/analytics/events';
import { postMemberEvent } from '@/lib/events/client';

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
            <li>{checklist.createAccount ? '✅' : '⬜'} Create account</li>
            <li>{checklist.chooseProgram ? '✅' : '⬜'} Choose program</li>
            <li>{checklist.completeAssessment ? '✅' : '⬜'} Complete assessment</li>
            <li>{checklist.startFirstCourse ? '✅' : '⬜'} Start first course</li>
            <li>{checklist.completeFirstCourse ? '✅' : '⬜'} Complete first course</li>
          </ul>
        </details>
      )}
    </div>
  );
}
