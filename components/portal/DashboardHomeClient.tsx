'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  MEMBER_APPLICATION_PROGRESS_STEPS,
  type MemberApplicationStage,
} from '@/lib/member/memberApplicationStatus';
import { trackFunnelEvent } from '@/lib/analytics/events';
import { postMemberEvent } from '@/lib/events/client';
import MemberPreScreeningForm from '@/components/portal/MemberPreScreeningForm';
import MemberInterviewRequestButton from '@/components/portal/MemberInterviewRequestButton';
import YouthDashboardNotice from '@/components/portal/YouthDashboardNotice';
import { formatPortalDate, formatPortalDateTime } from '@/lib/formatDate';
import MemberNextStepsStrip from '@/components/portal/MemberNextStepsStrip';
import type { NextBestAction } from '@/lib/member/nextBestActions';
import PortalMetricCard from '@/components/portal/ui/PortalMetricCard';

type State = 'A' | 'B' | 'C' | 'D';

export type DashboardApplicationStatusProps = {
  label: string;
  submittedAt: string | null;
  programInterest: string | null;
  nextStep: string;
  showResponseEstimate: boolean;
  progressIndex: number | null;
  stage: MemberApplicationStage;
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
  nextBestActions?: NextBestAction[];
  aiToolsUsedCount?: number;
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
  nextBestActions = [],
  aiToolsUsedCount = 0,
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

  useEffect(() => {
    trackFunnelEvent('member_dashboard', 'dashboard_viewed', { state, checklist_all_done: checklistAllDone });
    void postMemberEvent({
      eventName: 'member_dashboard_viewed',
      sourcePage: '/dashboard',
      metadata: { state, checklistAllDone },
    });
    // Track activation milestone: user has enrolled + completed at least one course
    if (state !== 'A' && completedCount >= 1) {
      trackFunnelEvent('member_dashboard', 'dashboard_activated', {
        state,
        completed_count: completedCount,
        program: programTitle,
      });
      void postMemberEvent({
        eventName: 'member_dashboard_activated',
        sourcePage: '/dashboard',
        metadata: { state, completedCount, programTitle },
      });
    }
  }, [state, checklistAllDone, completedCount, programTitle]);

  const handleDashboardAction = (action: string) => {
    trackFunnelEvent('member_dashboard', action, { state });
    void postMemberEvent({
      eventName: 'member_dashboard_action_clicked',
      sourcePage: '/dashboard',
      metadata: { state, action },
    });
  };

  const progressPct = totalCourses > 0 ? Math.round((completedCount / totalCourses) * 100) : 0;

  const checklistItems = [
    {
      done: checklist.createAccount,
      doneLabel: 'Account ready',
      pendingLabel: 'Create account',
    },
    {
      done: checklist.chooseProgram,
      doneLabel: 'Program selected',
      pendingLabel: 'Choose program',
    },
    {
      done: checklist.completeAssessment,
      doneLabel: 'Training preassessment complete',
      pendingLabel: 'Complete preassessment',
    },
    {
      done: checklist.startFirstCourse,
      doneLabel: 'First course started',
      pendingLabel: 'Start first course',
    },
    {
      done: checklist.completeFirstCourse,
      doneLabel: 'First course complete',
      pendingLabel: 'Complete first course',
    },
  ];

  const progressCardTitle =
    state === 'D'
      ? 'Training Complete'
      : state === 'B'
        ? 'Training preassessment required'
        : completedCount === 0
          ? 'Your training is ready'
          : `Current training step: ${nextMilestone ?? programTitle}`;

  const progressCardSummary =
    state === 'D'
      ? `${completedCount} of ${totalCourses} courses marked complete.`
      : state === 'B'
        ? 'Complete your Training Preassessment to start your first training step.'
        : completedCount === 0
          ? 'No courses are marked complete yet. Start with your first training step.'
          : `${completedCount} of ${totalCourses} courses marked complete.`;

  const weekEyebrow = useMemo(() => {
    const d = new Date();
    const start = new Date(d);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    return `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }, []);

  /* ── Metric cards data ── */
  const metricCards = [
    {
      label: 'Training Progress',
      value: `${progressPct}%`,
      hint: `${completedCount}/${totalCourses} courses`,
      icon: 'menu_book',
      accent: 'accent' as const,
      href: '/dashboard/training',
    },
    ...(assessmentScorePct != null
      ? [{
          label: 'Preassessment Score',
          value: `${assessmentScorePct}%`,
          hint: 'Training readiness benchmark',
          icon: 'psychology',
          accent: 'blue' as const,
          href: '/dashboard/skills-assessment',
        }]
      : []),
    {
      label: 'AI Tools Used',
      value: aiToolsUsedCount.toString(),
      hint: aiToolsUsedCount > 0 ? 'Recent AI activity' : 'No recent AI activity',
      icon: 'auto_awesome',
      accent: 'gold' as const,
      href: '/dashboard/ai-tools',
    },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {age !== null && age < 18 ? <YouthDashboardNotice age={age} /> : null}

      {/* ── Page Header ── */}
      <header style={{ marginBottom: '2rem', padding: '0 2rem' }}>
        <p className="text-label-upper" style={{ color: 'var(--color-on-surface-variant)', letterSpacing: '0.08em', fontSize: '0.75rem', marginBottom: '0.375rem' }}>
          {weekEyebrow}{programTitle ? ` · ${programTitle}` : ''}
        </p>
        <h2 className="text-display-sm" style={{ color: 'var(--color-on-surface)', marginBottom: '0.5rem' }}>
          Your next steps, {firstName}.
        </h2>
        <p style={{ color: 'var(--color-on-surface-variant)', maxWidth: '42rem', lineHeight: 1.65, fontSize: '0.9375rem' }}>
          {state === 'A' && (isMinor && age ? "Let's explore career paths and build skills together." : "Let's build your career path. Programs are available at no cost to members.")}
          {state === 'B' && `You're enrolled in ${programTitle ?? 'your program'}. Complete your Training Preassessment to start your training plan.`}
          {state === 'C' && `You're ${progressPct}% through ${programTitle ?? 'your training plan'}. Keep going one step at a time.`}
          {state === 'D' && `Your training plan is complete. Focus on job outcomes and career readiness.`}
        </p>
      </header>

      {/* ── 1. STATUS CARD — where am I, what's next ── */}
      {(noApplicationOnFile || applicationStatus) && (
        <div style={{ padding: '0 2rem', marginBottom: '1.5rem' }}>
          <section
            className="portal-card portal-card--flat"
            style={{ borderLeft: '4px solid var(--color-accent)' }}
          >
            <div className="portal-card__body">
              {noApplicationOnFile ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)' }}>description</span>
                    <h3 style={{ fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Program Application</h3>
                  </div>
                  <div className="portal-card portal-card--flat portal-card--padded-sm" style={{ marginBottom: '1rem' }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
                      Ready to get started? Your application takes about 10 minutes — and programs are available at no cost to members.
                    </p>
                  </div>
                  <Link href="/apply" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                    Start your application
                  </Link>
                </div>
              ) : applicationStatus ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)' }}>task_alt</span>
                    <h3 style={{ fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Application Status</h3>
                  </div>
                  {applicationStatus.progressIndex !== null && (
                    <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem' }} aria-label="Application progress">
                      {MEMBER_APPLICATION_PROGRESS_STEPS.map((stepLabel, i) => {
                        const stepNum = i + 1;
                        const idx = applicationStatus.progressIndex!;
                        const done = stepNum < idx;
                        const current = stepNum === idx;
                        const locked = stepNum > idx;
                        return (
                          <div key={stepLabel} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                            <div
                              style={{
                                width: '100%',
                                height: current ? '4px' : '3px',
                                borderRadius: '9999px',
                                background: done
                                  ? 'var(--color-accent)'
                                  : current
                                    ? 'var(--color-accent)'
                                    : 'var(--outline-variant)',
                                opacity: locked ? 0.35 : 1,
                              }}
                            />
                            <span
                              style={{
                                fontSize: '0.6875rem',
                                fontWeight: current ? 700 : 600,
                                color: locked ? 'var(--color-on-surface-variant)' : 'var(--color-on-surface)',
                                opacity: locked ? 0.45 : 0.85,
                                textAlign: 'center',
                              }}
                            >
                              {stepLabel}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="portal-card portal-card--flat portal-card--padded-sm" style={{ marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginBottom: '0.25rem' }}>Current status</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>{applicationStatus.label}</p>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>{applicationStatus.nextStep}</p>
                  {applicationStatus.showResponseEstimate && (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', opacity: 0.8, marginTop: '0.5rem' }}>
                      We typically respond with your next step in 1 to 2 business days.
                    </p>
                  )}
                  <div className="portal-card portal-card--flat portal-card--padded-sm">
                    <p style={{ fontSize: '0.875rem', fontStyle: 'italic', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
                      {state === 'A' && "Choose a program to get started on your career path. All programs are offered at no cost to members."}
                      {state === 'B' && `Complete your Training Preassessment to start your ${programTitle} training.`}
                      {state === 'C' && `Keep going! Finish ${nextMilestone ?? 'your next course'} to stay on track.`}
                      {state === 'D' && 'Focus on career readiness: resume, interview practice, and job applications.'}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {assessmentScorePct != null && (
                        <span style={{ padding: '0.25rem 0.625rem', background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)', color: 'var(--color-accent)', fontSize: '0.75rem', borderRadius: '9999px', fontWeight: 600 }}>
                          Preassessment: {assessmentScorePct}%
                        </span>
                      )}
                      {enrolledAt && (
                        <span style={{ padding: '0.25rem 0.625rem', background: 'var(--surface-container-lowest)', color: 'var(--color-on-surface-variant)', fontSize: '0.75rem', borderRadius: '9999px', fontWeight: 600 }}>
                          Enrolled: {formatPortalDate(enrolledAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      )}

      {/* ── 2. PRIMARY NEXT ACTION — first nextBestAction ── */}
      {nextBestActions.length > 0 && (
        <div style={{ padding: '0 2rem', marginBottom: '1.5rem' }}>
          <MemberNextStepsStrip actions={nextBestActions.slice(0, 3)} />
        </div>
      )}

      {/* ── 3. HELP STRIP — counselor contact + support CTA ── */}
      <div
        className="portal-card portal-card--flat"
        style={{
          margin: '0 2rem 1.5rem',
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface-variant)', fontSize: '1.25rem', flexShrink: 0 }}>support_agent</span>
        <span style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', flex: 1, minWidth: '12rem' }}>
          Have questions? Your counselor is here to help.
        </span>
        <Link
          href="/dashboard/messages"
          className="btn btn-secondary"
          style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}
          onClick={() => handleDashboardAction('help_counselor_clicked')}
        >
          Message Counselor
        </Link>
        <Link
          href="/dashboard/resources"
          style={{ color: 'var(--color-accent)', fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}
          onClick={() => handleDashboardAction('help_resources_clicked')}
        >
          Get Support
        </Link>
      </div>

      {/* ── 4. METRIC CARDS ── */}
      {(state === 'C' || state === 'D') && (
        <div style={{ padding: '0 2rem', marginBottom: '1.5rem' }}>
          <div className="portal-metric-strip">
            {metricCards.map((m) => (
              <PortalMetricCard key={m.label} {...m} />
            ))}
          </div>
        </div>
      )}

      {/* ── 5. Main content grid ── */}
      <div className="portal-bento-grid">

        {/* ── Main Progress Card (full-width) ── */}
        {(state === 'B' || state === 'C' || state === 'D') && programTitle && (
          <section className="portal-card portal-card--flat" style={{ gridColumn: 'span 12' }}>
            <div className="portal-card__body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', gap: '1rem' }}>
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.35rem', color: 'var(--color-on-surface)' }}>
                    {progressCardTitle}
                  </h2>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                    {progressCardSummary}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--color-accent)', letterSpacing: '-0.04em' }}>
                    {progressPct}<span style={{ fontSize: '1.25rem' }}>%</span>
                  </span>
                  <span style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)' }}>Progress</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ position: 'relative', width: '100%', height: '8px', background: 'var(--surface-container-highest)', borderRadius: '9999px', marginBottom: '2rem' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: 'var(--color-accent)', borderRadius: '9999px', width: `${progressPct}%`, transition: 'width 0.5s ease' }} />
              </div>

              {/* Milestone journey dots */}
              <div className="portal-milestone-track">
                {checklistItems.map((item, i) => {
                  const isCurrent = !item.done && (i === 0 || checklistItems[i - 1].done);
                  const label = item.done ? item.doneLabel : item.pendingLabel;
                  return (
                    <div key={label} className="portal-milestone-step" style={{
                      opacity: item.done ? 0.5 : isCurrent ? 1 : 0.35,
                      color: isCurrent ? 'var(--color-accent)' : 'var(--color-on-surface-variant)',
                    }}>
                      {item.done ? (
                        <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', marginBottom: '0.5rem', '--ms-fill': 1 }}>check_circle</span>
                      ) : isCurrent ? (
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-accent)', boxShadow: '0 0 0 4px color-mix(in srgb, var(--color-accent) 18%, transparent)', animation: 'portal-pulse 2s infinite' }} />
                      ) : (
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--surface-container-highest)' }} />
                      )}
                      <p className="portal-milestone-step__label">{label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── Pre-Screening ── */}
        {assessmentDone && !preScreeningDone && (
          <section className="portal-card portal-card--flat" style={{ gridColumn: 'span 12' }}>
            <div className="portal-card__body">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)' }}>assignment</span>
              <h3 style={{ fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Pre-screening (before your interview)</h3>
            </div>
            <MemberPreScreeningForm />
            </div>
          </section>
        )}

        {/* ── Interview ── */}
        {assessmentDone && preScreeningDone && interviewEligible && !interviewCompletedAt && (
          <section className="portal-card portal-card--flat" style={{ gridColumn: 'span 12' }}>
            <div className="portal-card__body">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)' }}>videocam</span>
              <h3 style={{ fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Interview</h3>
            </div>
            {interviewRequestedAt ? (
              <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', fontSize: '0.875rem' }}>
                We received your interview request on{' '}
                {formatPortalDateTime(interviewRequestedAt)}. A counselor will reach out by email.
              </p>
            ) : (
              <MemberInterviewRequestButton />
            )}
            </div>
          </section>
        )}

        {/* ── Active Curriculum / Career Next Steps ── */}
        <section style={{ gridColumn: 'span 12' }}>
          <div className="portal-dash-section-header">
            <h3 className="portal-heading-with-bar portal-section-heading" style={{ margin: 0 }}>
              {state === 'D' ? 'Career Next Steps' : 'Active Curriculum'}
            </h3>
            {state !== 'A' && (
              <Link
                href="/dashboard/training"
                className="portal-dash-section-header__action"
                onClick={() => handleDashboardAction('view_all_tracks_clicked')}
              >
                View All Tracks
              </Link>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {/* Primary Action Card */}
            {state === 'A' && (
              <div className="portal-card portal-card--flat portal-card--padded" style={{ cursor: 'pointer' }}>
                <div style={{ height: '12rem', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '1rem', position: 'relative', background: 'var(--surface-container-highest)' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--color-background-dark), transparent)', opacity: 0.8 }} />
                  <div style={{ position: 'absolute', bottom: '1rem', left: '1rem' }}>
                    <span style={{ padding: '0.25rem 0.5rem', background: 'var(--color-accent)', color: '#fff', fontSize: '0.6875rem', fontWeight: 700, borderRadius: '0.25rem' }}>GET STARTED</span>
                  </div>
                </div>
                <h4 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.25rem', color: 'var(--color-on-surface)' }}>Choose Your Program</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5, marginBottom: '1rem' }}>
                  Select one of our no-cost career programs. Funding is tied to a single program.
                </p>
                <Link href="/dashboard/program" className="btn btn-primary"
                  onClick={() => handleDashboardAction('choose_program_clicked')}>
                  Choose Your Program
                </Link>
              </div>
            )}

            {state === 'B' && (
              <div className="portal-card portal-card--flat portal-card--padded" style={{ cursor: 'pointer' }}>
                <div style={{ height: '12rem', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '1rem', position: 'relative', background: 'var(--surface-container-highest)' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--color-background-dark), transparent)', opacity: 0.8 }} />
                  <div style={{ position: 'absolute', bottom: '1rem', left: '1rem' }}>
                    <span style={{ padding: '0.25rem 0.5rem', background: 'var(--color-accent)', color: '#fff', fontSize: '0.6875rem', fontWeight: 700, borderRadius: '0.25rem' }}>NEXT STEP</span>
                  </div>
                </div>
                <h4 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.25rem', color: 'var(--color-on-surface)' }}>Complete Your Training Preassessment</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5, marginBottom: '1rem' }}>
                  A quick preassessment tailors your {programTitle} learning path and starts role matching.
                </p>
                <Link href="/dashboard/assessment" className="btn btn-primary"
                  onClick={() => handleDashboardAction('assessment_clicked')}>
                  Start Preassessment
                </Link>
              </div>
            )}

            {state === 'C' && nextMilestone && (
              <div className="portal-card portal-card--flat portal-card--padded" style={{ cursor: 'pointer' }}>
                <div style={{ height: '12rem', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '1rem', position: 'relative', background: 'var(--surface-container-highest)' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--color-background-dark), transparent)', opacity: 0.8 }} />
                  <div style={{ position: 'absolute', bottom: '1rem', left: '1rem' }}>
                    <span style={{ padding: '0.25rem 0.5rem', background: 'var(--surface-container-highest)', color: 'var(--color-on-surface)', fontSize: '0.6875rem', fontWeight: 700, borderRadius: '0.25rem' }}>IN PROGRESS</span>
                  </div>
                </div>
                <h4 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.25rem', color: 'var(--color-on-surface)' }}>{nextMilestone}</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5, marginBottom: '1rem' }}>
                  {completedCount} of {totalCourses} courses marked complete. Finish training to move toward job readiness.
                </p>
                <Link href="/dashboard/training" className="btn btn-primary"
                  onClick={() => handleDashboardAction('continue_training_clicked')}>
                  Continue Training
                </Link>
              </div>
            )}

            {state === 'D' && (
              <div className="portal-card portal-card--flat portal-card--padded" style={{ cursor: 'pointer' }}>
                <div style={{ height: '12rem', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '1rem', position: 'relative', background: 'linear-gradient(135deg, rgba(173,44,77,0.2), var(--surface-container-highest))' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--color-background-dark), transparent)', opacity: 0.8 }} />
                  <div style={{ position: 'absolute', bottom: '1rem', left: '1rem' }}>
                    <span style={{ padding: '0.25rem 0.5rem', background: 'var(--color-accent)', color: '#fff', fontSize: '0.6875rem', fontWeight: 700, borderRadius: '0.25rem' }}>COMPLETE</span>
                  </div>
                </div>
                <h4 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.25rem', color: 'var(--color-on-surface)' }}>Career Readiness</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5, marginBottom: '1rem' }}>
                  You've finished {programTitle}. Build readiness and apply for jobs.
                </p>
                <Link href="/dashboard/readiness" className="btn btn-primary"
                  onClick={() => handleDashboardAction('career_readiness_clicked')}>
                  Build Job Readiness
                </Link>
              </div>
            )}

            {/* Secondary Recommended Action Card */}
            {primaryAction && state !== 'A' && (
              <Link href={primaryAction.href} style={{ textDecoration: 'none', color: 'inherit' }}
                onClick={() => handleDashboardAction('primary_recommended_action_clicked')}>
              <div className="portal-card portal-card--flat portal-card--padded" style={{ cursor: 'pointer' }}>
                <div style={{ height: '12rem', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '1rem', position: 'relative', background: 'var(--surface-container-highest)' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--color-background-dark), transparent)', opacity: 0.8 }} />
                </div>
                <h4 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.25rem', color: 'var(--color-on-surface)' }}>{primaryAction.label}</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5, marginBottom: '1rem' }}>
                  Recommended next step for your career journey.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-on-surface-variant)', opacity: 0.8, textTransform: 'uppercase' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '0.75rem' }}>schedule</span> Recommended
                  </span>
                  <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-accent)' }}>
                    Open
                    <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>arrow_forward</span>
                  </span>
                </div>
              </div>
              </Link>
            )}

            {/* Contextual third card */}
            {state === 'A' && (
              <div className="portal-card portal-card--flat portal-card--padded" style={{ cursor: 'pointer' }}>
                <div style={{ height: '12rem', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '1rem', position: 'relative', background: 'var(--surface-container-highest)' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--color-background-dark), transparent)', opacity: 0.8 }} />
                </div>
                <h4 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.25rem', color: 'var(--color-on-surface)' }}>How It Works</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5, marginBottom: '1rem' }}>
                  Learn about WorkforceAP programs, training, and job placement support.
                </p>
                <Link href="/how-it-works" style={{ color: 'var(--color-accent)', fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}
                  onClick={() => handleDashboardAction('how_it_works_clicked')}>
                  Learn more
                </Link>
              </div>
            )}

            {state === 'D' && jobSearchUrl && (
              <div className="portal-card portal-card--flat portal-card--padded" style={{ cursor: 'pointer' }}>
                <div style={{ height: '12rem', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '1rem', position: 'relative', background: 'var(--surface-container-highest)' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--color-background-dark), transparent)', opacity: 0.8 }} />
                </div>
                <h4 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.25rem', color: 'var(--color-on-surface)' }}>Browse Jobs</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5, marginBottom: '1rem' }}>
                  Search live job listings matched to your area and program.
                </p>
                <a href={jobSearchUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)', fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}
                  onClick={() => handleDashboardAction('job_search_clicked')}>
                  Browse jobs in your area
                </a>
              </div>
            )}
          </div>
        </section>

        <section style={{ gridColumn: 'span 12' }}>
          <div className="portal-card portal-card--flat" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1rem 1.25rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', minWidth: 0, flex: 1 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: 'var(--color-accent)', flexShrink: 0, fontVariationSettings: "'FILL' 1" }}>support_agent</span>
              <div style={{ minWidth: 0 }}>
                <h5 style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-on-surface)', margin: 0 }}>AI coach</h5>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', margin: '0.35rem 0 0', lineHeight: 1.5 }}>
                  Talk through interviews, certifications, and your next best step.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
              <Link href="/dashboard/readiness" className="btn btn-primary" onClick={() => handleDashboardAction('career_readiness_clicked')}>
                Talk to AI coach
              </Link>
              <Link href="/dashboard/ai-tools" className="btn btn-outline" onClick={() => handleDashboardAction('ai_tools_clicked')}>
                Open job search tools
              </Link>
            </div>
          </div>
        </section>

        {/* ── Tools & Extras ── */}
        <section style={{ gridColumn: 'span 12' }}>
          <details className="portal-details">
            <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-on-surface)', padding: '0.75rem 0', userSelect: 'none' }}>
              More Tools &amp; Resources
            </summary>
            <div className="portal-quick-actions-grid" style={{ marginTop: '1rem' }}>
              {[
                { href: '/dashboard/weekly-recap', label: 'Weekly Recap', desc: 'Milestones and reminders', icon: 'event_note', action: 'weekly_recap_clicked' },
                { href: '/dashboard/ai-tools', label: 'Job Search Tools', desc: 'Resume, cover letters, interviews', icon: 'auto_awesome', action: 'ai_tools_clicked' },
                { href: '/dashboard/learning', label: 'Learning Hub', desc: 'Pathways and resources', icon: 'school', action: 'learning_hub_clicked' },
                { href: '/dashboard/messages', label: 'Messages', desc: 'Counselor and team threads', icon: 'forum', action: 'quicklink_messages_clicked' },
                { href: '/dashboard/skills-assessment', label: 'Training Preassessment', desc: 'Program readiness', icon: 'history_edu', action: 'quicklink_assessments_clicked' },
                { href: '/dashboard/resources', label: 'Resources', desc: 'Program materials', icon: 'terminal', action: 'quicklink_resources_clicked' },
              ].map((item) => (
                <Link key={item.href} href={item.href} style={{ textDecoration: 'none', color: 'inherit' }}
                  onClick={() => handleDashboardAction(item.action)}>
                  <div className="portal-card portal-card--flat" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: 'var(--color-on-surface-variant)' }}>{item.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h5 style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-on-surface)' }}>{item.label}</h5>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{item.desc}</p>
                    </div>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-on-surface-variant)', opacity: 0.3, flexShrink: 0 }}>chevron_right</span>
                  </div>
                </Link>
              ))}
            </div>
          </details>
        </section>

        {/* ── Recent Activity (collapsed) ── */}
        {recentActivity.length > 0 && (state === 'C' || state === 'D') && (
          <section className="portal-card portal-card--flat portal-card--padded" style={{ gridColumn: 'span 12' }}>
            <details className="portal-details">
              <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-on-surface)' }}>Recent Activity</summary>
              <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
                {recentActivity.map((a, i) => (
                  <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid color-mix(in srgb, var(--outline-variant) 40%, transparent)', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                    <span>{a.label}</span>
                    <span style={{ opacity: 0.5 }}>{formatPortalDate(a.timestamp)}</span>
                  </li>
                ))}
              </ul>
            </details>
          </section>
        )}

        {/* ── Onboarding Checklist (collapsed) ── */}
        {!checklistAllDone && (
          <section className="portal-card portal-card--flat portal-card--padded" style={{ gridColumn: 'span 12' }}>
            <details className="portal-details">
              <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-on-surface)' }}>Onboarding Checklist</summary>
              <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
                {([
                  { done: checklist.createAccount, label: 'Create account' },
                  { done: checklist.chooseProgram, label: 'Choose program' },
                  { done: checklist.completeAssessment, label: 'Complete preassessment' },
                  { done: checklist.startFirstCourse, label: 'Training unlocked' },
                  { done: checklist.completeFirstCourse, label: 'Complete your first course' },
                ]).map(({ done, label }) => (
                  <li key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', fontSize: '0.875rem', color: done ? 'var(--color-on-surface-variant)' : 'var(--color-accent)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: done ? 'var(--color-green)' : 'var(--surface-container-highest)', '--ms-fill': done ? 1 : 0 }}>
                      {done ? 'check_circle' : 'circle'}
                    </span>
                    <span style={{ textDecoration: done ? 'line-through' : 'none' }}>{label}</span>
                  </li>
                ))}
              </ul>
            </details>
          </section>
        )}
      </div>
    </div>
  );
}
