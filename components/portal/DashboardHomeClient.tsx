'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Calendar, BarChart3, Target, PartyPopper, ChevronRight, CheckCircle2, Circle, Sparkles, TrendingUp, Briefcase } from 'lucide-react';
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
  noApplicationOnFile?: boolean;
  assessmentDone?: boolean;
  preScreeningDone?: boolean;
  interviewEligible?: boolean;
  interviewRequestedAt?: Date | null;
  interviewCompletedAt?: Date | null;
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
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
  const pct = totalCourses > 0 ? Math.round((completedCount / totalCourses) * 100) : 0;

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
    <div className="wa-max-w-7xl wa-mx-auto">
      {age !== null && age < 18 ? <YouthDashboardNotice age={age} /> : null}

      {/* ── Welcome Header ── */}
      <header className="wa-mb-10">
        <div className="wa-inline-flex wa-items-center wa-px-4 wa-py-1.5 wa-rounded-full wa-text-[11px] wa-font-bold wa-uppercase wa-tracking-widest wa-mb-6" style={{ background: 'rgba(173,44,77,0.08)', color: 'var(--color-accent)' }}>
          Member Portal
        </div>
        <h1 className="wa-text-4xl md:wa-text-5xl wa-font-black wa-tracking-tight wa-leading-none wa-mb-4">
          {getGreeting()},{' '}
          <span className="wa-italic" style={{ color: 'var(--color-accent)' }}>{firstName}.</span>
        </h1>
        <p className="wa-text-lg wa-max-w-xl wa-leading-relaxed" style={{ color: 'var(--color-gray-600)' }}>
          {state === 'A' && (isMinor && age ? "Let's explore career paths and build skills." : "Let's build your career path.")}
          {state === 'B' && "You're enrolled. One step before training."}
          {state === 'C' && `Your trajectory is at ${pct}% completion. Keep going.`}
          {state === 'D' && "All courses complete. Focus on job outcomes."}
        </p>
      </header>

      {/* ── Application Status ── */}
      {noApplicationOnFile ? (
        <div className="wa-rounded-xl wa-p-6 wa-mb-6" style={{ background: 'var(--color-gray-50)', border: '1px solid var(--color-gray-200)' }}>
          <h2 className="wa-text-sm wa-font-bold wa-uppercase wa-tracking-widest wa-mb-3" style={{ color: 'var(--color-gray-500)' }}>Program Application</h2>
          <p className="wa-text-sm wa-mb-4" style={{ color: 'var(--color-gray-600)' }}>We do not have an application on file for this account yet.</p>
          <Link href="/apply" className="btn btn-primary" onClick={() => handleDashboardAction('start_application_clicked')}>Start your application</Link>
        </div>
      ) : applicationStatus ? (
        <div className="wa-rounded-xl wa-p-6 wa-mb-6" style={{ background: 'var(--color-gray-50)', border: '1px solid var(--color-gray-200)' }}>
          <h2 className="wa-text-sm wa-font-bold wa-uppercase wa-tracking-widest wa-mb-4" style={{ color: 'var(--color-gray-500)' }}>Program Application</h2>
          {applicationStatus.progressIndex !== null ? (
            <div className="dashboard-application-progress" aria-hidden>
              <div className="dashboard-application-progress-track">
                {MEMBER_APPLICATION_PROGRESS_STEPS.map((stepLabel, i) => {
                  const stepNum = i + 1;
                  const done = stepNum < applicationStatus.progressIndex!;
                  const current = stepNum === applicationStatus.progressIndex;
                  return (
                    <div key={stepLabel} className={`dashboard-application-progress-step${done ? ' is-done' : ''}${current ? ' is-current' : ''}`}>
                      <span className="dashboard-application-progress-dot" />
                      <span className="dashboard-application-progress-label">{stepLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div className="wa-flex wa-justify-between wa-items-start wa-gap-4 wa-flex-wrap">
            <div>
              <p className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-widest wa-mb-1" style={{ color: 'var(--color-gray-500)' }}>Current status</p>
              <p className="wa-text-base wa-font-bold">{applicationStatus.label}</p>
            </div>
            {applicationStatus.submittedAt ? (
              <div className="wa-text-right">
                <p className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-widest wa-mb-1" style={{ color: 'var(--color-gray-500)' }}>Submitted</p>
                <p className="wa-text-sm">{new Date(applicationStatus.submittedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</p>
              </div>
            ) : null}
          </div>
          {applicationStatus.programInterest ? (
            <p className="wa-text-sm wa-mt-3" style={{ color: 'var(--color-gray-600)' }}>
              <span className="wa-font-bold">Program interest:</span> {applicationStatus.programInterest}
            </p>
          ) : null}
          <p className="wa-text-sm wa-mt-2" style={{ color: 'var(--color-gray-600)' }}>{applicationStatus.nextStep}</p>
          {applicationStatus.showResponseEstimate ? (
            <p className="wa-text-xs wa-mt-2 wa-italic" style={{ color: 'var(--color-gray-500)' }}>We typically respond within 24–48 hours on business days.</p>
          ) : null}
        </div>
      ) : null}

      {/* ── Pre-screening ── */}
      {assessmentDone && !preScreeningDone ? (
        <div className="wa-rounded-xl wa-p-6 wa-mb-6" style={{ background: 'var(--color-gray-50)', border: '1px solid var(--color-gray-200)' }}>
          <h2 className="wa-text-sm wa-font-bold wa-uppercase wa-tracking-widest wa-mb-3" style={{ color: 'var(--color-gray-500)' }}>Pre-screening (before your interview)</h2>
          <MemberPreScreeningForm />
        </div>
      ) : null}

      {/* ── Interview ── */}
      {assessmentDone && preScreeningDone && interviewEligible && !interviewCompletedAt ? (
        <div className="wa-rounded-xl wa-p-6 wa-mb-6" style={{ background: 'var(--color-gray-50)', border: '1px solid var(--color-gray-200)' }}>
          <h2 className="wa-text-sm wa-font-bold wa-uppercase wa-tracking-widest wa-mb-3" style={{ color: 'var(--color-gray-500)' }}>Interview</h2>
          {interviewRequestedAt ? (
            <p className="wa-text-sm" style={{ color: 'var(--color-gray-700)' }}>
              We received your interview request on {new Date(interviewRequestedAt).toLocaleString()}. A counselor will reach out by email.
            </p>
          ) : (
            <MemberInterviewRequestButton />
          )}
        </div>
      ) : null}

      {/* ── Bento Grid ── */}
      <div className="wa-grid wa-grid-cols-1 md:wa-grid-cols-12 wa-gap-6">

        {/* Journey Card — wide */}
        <div className="md:wa-col-span-8 wa-rounded-xl wa-p-8 wa-flex wa-flex-col wa-justify-between wa-relative wa-overflow-hidden" style={{ background: 'var(--color-white)', border: '1px solid var(--color-gray-200)', minHeight: 320 }}>
          <div className="wa-flex wa-justify-between wa-items-start wa-mb-8">
            <h2 className="wa-text-2xl wa-font-bold wa-tracking-tight">Your Journey</h2>
            <span className="wa-text-sm wa-font-semibold" style={{ color: 'var(--color-accent)' }}>
              {programTitle ?? 'Choose a program'}
            </span>
          </div>

          {state === 'A' && (
            <div>
              <h3 className="wa-text-xl wa-font-bold wa-mb-2">Choose your program</h3>
              <p className="wa-text-sm wa-mb-6" style={{ color: 'var(--color-gray-600)' }}>Select one of our no-cost career programs. Funding is tied to a single program — we'll help you pick the right fit.</p>
              <div className="wa-flex wa-gap-3 wa-flex-wrap">
                <Link href="/dashboard/program" className="btn btn-primary" onClick={() => handleDashboardAction('choose_program_clicked')}>Choose Your Program</Link>
                <Link href="/how-it-works" className="btn btn-outline" onClick={() => handleDashboardAction('how_it_works_clicked')}>How It Works</Link>
              </div>
            </div>
          )}

          {state === 'B' && (
            <div>
              <h3 className="wa-text-xl wa-font-bold wa-mb-2">Complete your skills assessment</h3>
              <p className="wa-text-sm wa-mb-6" style={{ color: 'var(--color-gray-600)' }}>A quick assessment tailors your {programTitle} learning path and unlocks role matching.</p>
              <div className="wa-flex wa-gap-3 wa-flex-wrap">
                <Link href="/dashboard/assessment" className="btn btn-primary" onClick={() => handleDashboardAction('assessment_clicked')}>Take Assessment</Link>
                <Link href="/dashboard/program" className="btn btn-outline" onClick={() => handleDashboardAction('view_program_clicked')}>View Program</Link>
              </div>
            </div>
          )}

          {state === 'C' && (
            <div>
              <h3 className="wa-text-xl wa-font-bold wa-mb-2">{nextMilestone ? `Complete: ${nextMilestone}` : 'Continue training'}</h3>
              <p className="wa-text-sm wa-mb-4" style={{ color: 'var(--color-gray-600)' }}>{completedCount} of {totalCourses} courses done.</p>
              <div className="wa-w-full wa-h-1.5 wa-rounded-full wa-overflow-hidden wa-mb-6" style={{ background: 'var(--color-gray-200)' }}>
                <div className="wa-h-full wa-rounded-full wa-transition-all" style={{ width: `${pct}%`, background: 'var(--color-accent)' }} />
              </div>
              <div className="wa-flex wa-justify-between wa-items-center wa-mb-6">
                <span className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-widest" style={{ color: 'var(--color-accent)' }}>{pct}% Complete</span>
              </div>
              <div className="wa-flex wa-gap-3 wa-flex-wrap">
                <Link href="/dashboard/training" className="btn btn-primary" onClick={() => handleDashboardAction('continue_training_clicked')}>Continue Training</Link>
                {primaryAction && <Link href={primaryAction.href} className="btn btn-outline" onClick={() => handleDashboardAction('recommended_action_clicked')}>{primaryAction.label}</Link>}
              </div>
            </div>
          )}

          {state === 'D' && (
            <div>
              <div className="wa-flex wa-items-center wa-gap-2 wa-mb-4">
                <PartyPopper size={24} style={{ color: 'var(--color-accent)' }} />
                <span className="wa-font-bold" style={{ color: 'var(--color-accent)' }}>All courses complete</span>
              </div>
              <h3 className="wa-text-xl wa-font-bold wa-mb-2">Focus on job outcomes</h3>
              <p className="wa-text-sm wa-mb-6" style={{ color: 'var(--color-gray-600)' }}>You've finished {programTitle}. Build readiness and apply.</p>
              <div className="wa-flex wa-gap-3 wa-flex-wrap">
                <Link href="/dashboard/readiness" className="btn btn-primary" onClick={() => handleDashboardAction('career_readiness_clicked')}>View Career Readiness</Link>
                {jobSearchUrl ? (
                  <a href={jobSearchUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline" onClick={() => handleDashboardAction('job_search_clicked')}>Browse Jobs</a>
                ) : primaryAction ? (
                  <Link href={primaryAction.href} className="btn btn-outline" onClick={() => handleDashboardAction('recommended_action_clicked')}>{primaryAction.label}</Link>
                ) : null}
              </div>
            </div>
          )}

          {/* Watermark number */}
          <span className="wa-absolute wa-bottom-[-30px] wa-right-[-15px] wa-text-[200px] wa-font-black wa-leading-none wa-select-none wa-pointer-events-none" style={{ color: 'rgba(173,44,77,0.04)' }}>
            {state === 'A' ? '01' : state === 'B' ? '02' : state === 'C' ? '03' : '04'}
          </span>
        </div>

        {/* AI Assistant Card */}
        <div className="md:wa-col-span-4 wa-rounded-xl wa-p-8 wa-flex wa-flex-col wa-justify-between" style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-dark))', color: '#fff' }}>
          <div>
            <div className="wa-w-12 wa-h-12 wa-rounded-xl wa-flex wa-items-center wa-justify-center wa-mb-8" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Sparkles size={24} />
            </div>
            <h2 className="wa-text-2xl wa-font-bold wa-mb-4 wa-tracking-tight wa-leading-tight">Career Tools</h2>
            <p className="wa-text-sm wa-leading-relaxed wa-mb-8" style={{ opacity: 0.9 }}>
              AI-powered resume review, interview practice, and job match scoring — designed to complement counselor support.
            </p>
          </div>
          <Link
            href="/dashboard/ai-tools"
            className="wa-w-full wa-py-3 wa-rounded-xl wa-font-bold wa-text-sm wa-text-center wa-block wa-no-underline wa-transition-all"
            style={{ background: '#fff', color: 'var(--color-accent)' }}
            onClick={() => handleDashboardAction('ai_tools_clicked')}
          >
            Explore AI Tools
          </Link>
        </div>

        {/* This Week */}
        <div className="md:wa-col-span-5 wa-rounded-xl wa-p-8 wa-flex wa-flex-col wa-justify-between" style={{ background: 'var(--color-white)', border: '1px solid var(--color-gray-200)', minHeight: 240 }}>
          <div className="wa-flex wa-items-center wa-gap-3 wa-mb-6">
            <div className="wa-w-12 wa-h-12 wa-rounded-full wa-flex wa-items-center wa-justify-center" style={{ background: 'rgba(173,44,77,0.08)' }}>
              <TrendingUp size={20} style={{ color: 'var(--color-accent)' }} />
            </div>
            <h3 className="wa-font-bold wa-text-xl">This Week</h3>
          </div>
          <ul className="wa-space-y-3 wa-flex-1">
            <li><Link href="/dashboard/weekly-recap" className="wa-text-sm wa-font-semibold wa-no-underline" style={{ color: 'var(--color-accent)' }} onClick={() => handleDashboardAction('weekly_recap_clicked')}>Weekly recap</Link><span className="wa-text-sm" style={{ color: 'var(--color-gray-500)' }}> — milestones and reminders</span></li>
            <li><Link href="/dashboard/learning" className="wa-text-sm wa-font-semibold wa-no-underline" style={{ color: 'var(--color-accent)' }} onClick={() => handleDashboardAction('learning_hub_clicked')}>Learning hub</Link><span className="wa-text-sm" style={{ color: 'var(--color-gray-500)' }}> — resources and paths</span></li>
            <li><Link href="/dashboard/ai-tools" className="wa-text-sm wa-font-semibold wa-no-underline" style={{ color: 'var(--color-accent)' }} onClick={() => handleDashboardAction('ai_tools_clicked')}>Career tools</Link><span className="wa-text-sm" style={{ color: 'var(--color-gray-500)' }}> — resume, interview, job match</span></li>
          </ul>
        </div>

        {/* Opportunities / Next Steps */}
        <div className="md:wa-col-span-7 wa-rounded-xl wa-overflow-hidden wa-relative" style={{ minHeight: 240 }}>
          <div className="wa-absolute wa-inset-0" style={{ background: 'linear-gradient(to top, rgba(140,15,55,0.9), rgba(140,15,55,0.4), transparent)' }} />
          <div className="wa-relative wa-z-10 wa-h-full wa-flex wa-flex-col wa-justify-end wa-p-8" style={{ background: 'var(--color-gray-100)' }}>
            <div className="wa-absolute wa-inset-0" style={{ background: 'linear-gradient(to top, var(--color-accent-dark), transparent)', opacity: 0.9 }} />
            <div className="wa-relative wa-z-10">
              <h3 className="wa-text-2xl wa-font-black wa-mb-2 wa-tracking-tight" style={{ color: '#fff' }}>
                {state === 'D' ? 'Job Readiness' : 'Build Your Career'}
              </h3>
              <p className="wa-text-sm wa-max-w-sm wa-font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {state === 'D' ? 'Review your readiness score, practice interviews, and connect with employers.' : 'Complete your training to unlock job placement support and employer connections.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer Stats ── */}
      <div className="wa-grid wa-grid-cols-2 md:wa-grid-cols-4 wa-gap-6 wa-mt-10 wa-pt-10" style={{ borderTop: '1px solid var(--color-gray-200)' }}>
        <div>
          <p className="wa-text-[10px] wa-font-black wa-uppercase wa-mb-2" style={{ letterSpacing: '0.2em', color: 'var(--color-gray-400)' }}>
            {state === 'B' ? 'Program' : 'Courses Done'}
          </p>
          <p className="wa-text-3xl wa-font-black">{state === 'B' ? (programTitle ? programTitle.split(' ')[0] : '—') : `${completedCount}/${totalCourses}`}</p>
        </div>
        <div>
          <p className="wa-text-[10px] wa-font-black wa-uppercase wa-mb-2" style={{ letterSpacing: '0.2em', color: 'var(--color-gray-400)' }}>
            {state === 'B' ? 'Enrolled' : 'Assessment'}
          </p>
          <p className="wa-text-3xl wa-font-black">{state === 'B' ? (enrolledAt?.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) ?? '—') : `${assessmentScorePct ?? '—'}%`}</p>
        </div>
        <div>
          <p className="wa-text-[10px] wa-font-black wa-uppercase wa-mb-2" style={{ letterSpacing: '0.2em', color: 'var(--color-gray-400)' }}>Next Milestone</p>
          <p className="wa-text-lg wa-font-black">{nextMilestone ?? (state === 'D' ? 'Placement' : '—')}</p>
        </div>
        <div>
          <p className="wa-text-[10px] wa-font-black wa-uppercase wa-mb-2" style={{ letterSpacing: '0.2em', color: 'var(--color-gray-400)' }}>Status</p>
          <p className="wa-text-lg wa-font-black" style={{ color: 'var(--color-accent)' }}>
            {state === 'A' ? 'Getting Started' : state === 'B' ? 'Enrolled' : state === 'C' ? 'In Training' : 'Job Ready'}
          </p>
        </div>
      </div>

      {/* ── Checklist (collapsed) ── */}
      {!checklistAllDone && (
        <details className="wa-mt-8 wa-rounded-xl wa-overflow-hidden" style={{ border: '1px solid var(--color-gray-200)' }}>
          <summary className="wa-px-6 wa-py-4 wa-cursor-pointer wa-font-bold wa-text-sm" style={{ background: 'var(--color-gray-50)' }}>Onboarding checklist</summary>
          <ul className="wa-px-6 wa-py-4 wa-space-y-3">
            {([
              { done: checklist.createAccount, label: 'Create account' },
              { done: checklist.chooseProgram, label: 'Choose program' },
              { done: checklist.completeAssessment, label: 'Complete assessment' },
              { done: checklist.startFirstCourse, label: 'Start first course' },
              { done: checklist.completeFirstCourse, label: 'Complete first course' },
            ] as { done: boolean; label: string }[]).map(({ done, label }) => (
              <li key={label} className="wa-flex wa-items-center wa-gap-3 wa-text-sm">
                {done
                  ? <CheckCircle2 size={16} style={{ color: 'var(--color-green)', flexShrink: 0 }} aria-hidden />
                  : <Circle size={16} style={{ color: 'var(--color-gray-300)', flexShrink: 0 }} aria-hidden />}
                <span style={{ textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--color-gray-500)' : 'inherit' }}>{label}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* ── Recent Activity (collapsed) ── */}
      {recentActivity.length > 0 && (state === 'C' || state === 'D') && (
        <details className="wa-mt-4 wa-rounded-xl wa-overflow-hidden" style={{ border: '1px solid var(--color-gray-200)' }}>
          <summary className="wa-px-6 wa-py-4 wa-cursor-pointer wa-font-bold wa-text-sm" style={{ background: 'var(--color-gray-50)' }}>Recent activity</summary>
          <ul className="wa-px-6 wa-py-4 wa-space-y-2">
            {recentActivity.map((a, i) => (
              <li key={i} className="wa-flex wa-justify-between wa-text-sm wa-py-1" style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
                <span>{a.label}</span>
                <span style={{ color: 'var(--color-gray-500)' }}>{a.timestamp.toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
