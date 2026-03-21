'use client';

import Link from 'next/link';
import { BookOpen, Calendar, BarChart3, Target, PartyPopper, ChevronRight } from 'lucide-react';

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
              <Link href="/dashboard/program" className="btn btn-primary dashboard-today-primary">
                Choose Your Program
              </Link>
              <Link href="/how-it-works" className="btn btn-ghost dashboard-today-secondary">
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
              <Link href="/dashboard/assessment" className="btn btn-primary dashboard-today-primary">
                Take Assessment
              </Link>
              <Link href="/dashboard/program" className="btn btn-ghost dashboard-today-secondary">
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
              <Link href="/dashboard/training" className="btn btn-primary dashboard-today-primary">
                Continue Training
              </Link>
              {primaryAction && (
                <Link href={primaryAction.href} className="btn btn-ghost dashboard-today-secondary">
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
              <Link href="/dashboard/readiness" className="btn btn-primary dashboard-today-primary">
                View Career Readiness
              </Link>
              {jobSearchUrl ? (
                <a href={jobSearchUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost dashboard-today-secondary">
                  Browse jobs in your area
                </a>
              ) : primaryAction ? (
                <Link href={primaryAction.href} className="btn btn-ghost dashboard-today-secondary">
                  Or: {primaryAction.label}
                </Link>
              ) : null}
            </div>
          </div>
        )}
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
          <Link href={secondaryAction.href} className="dashboard-also-link">
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
          <Link href={(jobSearchUrl ? primaryAction : secondaryAction)!.href} className="dashboard-also-link">
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
