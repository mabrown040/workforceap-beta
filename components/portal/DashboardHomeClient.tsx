'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { MEMBER_APPLICATION_PROGRESS_STEPS } from '@/lib/member/memberApplicationStatus';
import { trackFunnelEvent } from '@/lib/analytics/events';
import { postMemberEvent } from '@/lib/events/client';
import MemberPreScreeningForm from '@/components/portal/MemberPreScreeningForm';
import MemberInterviewRequestButton from '@/components/portal/MemberInterviewRequestButton';
import YouthDashboardNotice from '@/components/portal/YouthDashboardNotice';
import { formatPortalDate, formatPortalDateTime } from '@/lib/formatDate';
import MemberNextStepsStrip from '@/components/portal/MemberNextStepsStrip';
import type { NextBestAction } from '@/lib/member/nextBestActions';

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
  /** Data-driven nudges (resume, messages, tracker, recap, etc.) */
  nextBestActions?: NextBestAction[];
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
  nextBestActions = [],
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

  const progressPct = totalCourses > 0 ? Math.round((completedCount / totalCourses) * 100) : 0;

  /* Milestone labels for the visual journey */
  const checklistItems = [
    { done: checklist.createAccount, label: 'Account' },
    { done: checklist.chooseProgram, label: 'Program' },
    { done: checklist.completeAssessment, label: 'Assessment' },
    { done: checklist.startFirstCourse, label: 'Start' },
    { done: checklist.completeFirstCourse, label: 'Complete' },
  ];

  return (
    <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
      {age !== null && age < 18 ? <YouthDashboardNotice age={age} /> : null}

      {/* ── Header Section ── */}
      <header style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span className="text-label-upper" style={{ color: 'var(--color-accent)', letterSpacing: '0.2em', fontSize: '0.625rem' }}>
            Workforce Advancement Project {programTitle ? `/ ${programTitle}` : ''}
          </span>
        </div>
        <h2 className="text-display-sm" style={{ color: 'var(--color-on-surface)', marginBottom: '0.5rem' }}>
          Welcome back, {firstName}.
        </h2>
        <p style={{ color: 'var(--color-on-surface-variant)', maxWidth: '42rem', lineHeight: 1.6, opacity: 0.8 }}>
          {state === 'A' && (isMinor && age ? "Let's explore career paths and build skills." : "Let's build your career path.")}
          {state === 'B' && `You're enrolled in ${programTitle ?? 'your program'}. Complete your assessment to unlock training.`}
          {state === 'C' && `Your mastery of ${programTitle ?? 'training'} is ${progressPct}% complete.`}
          {state === 'D' && `All courses complete. Focus on job outcomes and career readiness.`}
        </p>
      </header>

      {nextBestActions.length > 0 && <MemberNextStepsStrip actions={nextBestActions} />}

      {/* ── Bento Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem' }}>

        {/* ── Main Progress Card (large, spans 8) ── */}
        {(state === 'B' || state === 'C' || state === 'D') && programTitle && (
          <section className="stitch-card" style={{ gridColumn: 'span 8', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom right, rgba(173,44,77,0.05), transparent)', opacity: 0.5, pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1, padding: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.25rem', color: 'var(--color-on-surface)' }}>
                    {state === 'D' ? 'Program Complete' : `Current Milestone: ${nextMilestone ?? programTitle}`}
                  </h2>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', opacity: 0.7 }}>
                    {completedCount} of {totalCourses} courses {state === 'D' ? 'completed' : 'done'}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--color-accent)', letterSpacing: '-0.04em' }}>
                    {progressPct}<span style={{ fontSize: '1.25rem' }}>%</span>
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ position: 'relative', width: '100%', height: '6px', background: 'var(--surface-container-highest)', borderRadius: '9999px', marginBottom: '2rem' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: 'var(--color-accent)', borderRadius: '9999px', boxShadow: '0 0 15px rgba(173,44,77,0.4)', width: `${progressPct}%`, transition: 'width 0.5s ease' }} />
              </div>

              {/* Milestone Journey */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', overflowX: 'auto', paddingBottom: '1rem' }}>
                {checklistItems.map((item, i) => {
                  const isCurrent = !item.done && (i === 0 || checklistItems[i - 1].done);
                  return (
                    <div key={item.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px', opacity: item.done ? 0.4 : isCurrent ? 1 : 0.2, color: isCurrent ? 'var(--color-accent)' : 'var(--color-on-surface-variant)' }}>
                      {item.done ? (
                        <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      ) : isCurrent ? (
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-accent)', marginBottom: '1rem', animation: 'pulse 2s infinite' }} />
                      ) : (
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-on-surface-variant)', marginBottom: '1rem' }} />
                      )}
                      <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase' }}>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── Side Card: Application Status or Today ── */}
        <aside className="stitch-card-elevated" style={{
          gridColumn: (state === 'B' || state === 'C' || state === 'D') && programTitle ? 'span 4' : 'span 12',
          borderLeft: '4px solid var(--color-accent)',
        }}>
          {/* Application Status */}
          {noApplicationOnFile ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)' }}>description</span>
                <h3 style={{ fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Program Application</h3>
              </div>
              <div className="stitch-card" style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
                  We do not have an application on file for this account yet.
                </p>
              </div>
              <Link href="/apply" className="btn btn-primary" style={{ width: '100%', display: 'block', textAlign: 'center', padding: '0.5rem', background: 'var(--color-accent)', color: '#fff', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>
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
                <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem' }}>
                  {MEMBER_APPLICATION_PROGRESS_STEPS.map((stepLabel, i) => {
                    const stepNum = i + 1;
                    const done = stepNum < applicationStatus.progressIndex!;
                    const current = stepNum === applicationStatus.progressIndex;
                    return (
                      <div key={stepLabel} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                        <div style={{ width: '100%', height: '3px', borderRadius: '9999px', background: done ? 'var(--color-accent)' : current ? 'var(--color-accent)' : 'var(--surface-container-highest)', opacity: current ? 0.6 : 1 }} />
                        <span style={{ fontSize: '0.5625rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', opacity: 0.6 }}>{stepLabel}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="stitch-card" style={{ marginBottom: '0.75rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginBottom: '0.25rem' }}>Current status</p>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>{applicationStatus.label}</p>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>{applicationStatus.nextStep}</p>
              {applicationStatus.showResponseEstimate && (
                <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', opacity: 0.5, marginTop: '0.5rem' }}>
                  We typically respond within 24-48 hours on business days.
                </p>
              )}
            </div>
          ) : (
            /* Today card when no application status */
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)' }}>neurology</span>
                <h3 style={{ fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Today</h3>
              </div>
              <div className="stitch-card">
                <p style={{ fontSize: '0.875rem', fontStyle: 'italic', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
                  {state === 'A' && "Choose a program to get started on your career path. All programs are offered at no cost."}
                  {state === 'B' && `Complete your skills assessment to unlock your ${programTitle} training.`}
                  {state === 'C' && `Keep going! Finish ${nextMilestone ?? 'your next course'} to stay on track.`}
                  {state === 'D' && "Focus on career readiness: resume, interview practice, and job applications."}
                </p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
                {state === 'C' && assessmentScorePct != null && (
                  <span style={{ padding: '0.25rem 0.5rem', background: 'var(--surface-container-lowest)', fontSize: '0.625rem', borderRadius: '0.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                    Assessment: {assessmentScorePct}%
                  </span>
                )}
                {enrolledAt && (
                  <span style={{ padding: '0.25rem 0.5rem', background: 'var(--surface-container-lowest)', fontSize: '0.625rem', borderRadius: '0.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                    Enrolled: {formatPortalDate(enrolledAt)}
                  </span>
                )}
              </div>
            </div>
          )}
        </aside>

        {/* ── Pre-Screening Section ── */}
        {assessmentDone && !preScreeningDone && (
          <section className="stitch-card" style={{ gridColumn: 'span 12' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)' }}>assignment</span>
              <h3 style={{ fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Pre-screening (before your interview)</h3>
            </div>
            <MemberPreScreeningForm />
          </section>
        )}

        {/* ── Interview Section ── */}
        {assessmentDone && preScreeningDone && interviewEligible && !interviewCompletedAt && (
          <section className="stitch-card" style={{ gridColumn: 'span 12' }}>
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
          </section>
        )}

        {/* ── Today / Next Step Cards (full width) ── */}
        <section style={{ gridColumn: 'span 12' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--color-on-surface)' }}>
              {state === 'D' ? 'Career Next Steps' : 'Active Curriculum'}
            </h3>
            {state !== 'A' && (
              <Link href="/dashboard/training" style={{ color: 'var(--color-accent)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none' }}
                onClick={() => handleDashboardAction('view_all_tracks_clicked')}>
                View All Tracks
              </Link>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {/* Primary Action Card */}
            {state === 'A' && (
              <div className="stitch-card" style={{ cursor: 'pointer' }}>
                <div style={{ height: '12rem', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '1rem', position: 'relative', background: 'var(--surface-container-highest)' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--color-background-dark), transparent)', opacity: 0.8 }} />
                  <div style={{ position: 'absolute', bottom: '1rem', left: '1rem' }}>
                    <span style={{ padding: '0.25rem 0.5rem', background: 'var(--color-accent)', color: '#fff', fontSize: '0.625rem', fontWeight: 700, borderRadius: '0.25rem' }}>GET STARTED</span>
                  </div>
                </div>
                <h4 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.25rem', color: 'var(--color-on-surface)' }}>Choose Your Program</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5, marginBottom: '1rem' }}>
                  Select one of our no-cost career programs. Funding is tied to a single program.
                </p>
                <Link href="/dashboard/program" className="btn btn-primary" style={{ display: 'inline-block', padding: '0.5rem 1.25rem', background: 'var(--color-accent)', color: '#fff', borderRadius: '0.5rem', fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}
                  onClick={() => handleDashboardAction('choose_program_clicked')}>
                  Choose Your Program
                </Link>
              </div>
            )}

            {state === 'B' && (
              <div className="stitch-card" style={{ cursor: 'pointer' }}>
                <div style={{ height: '12rem', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '1rem', position: 'relative', background: 'var(--surface-container-highest)' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--color-background-dark), transparent)', opacity: 0.8 }} />
                  <div style={{ position: 'absolute', bottom: '1rem', left: '1rem' }}>
                    <span style={{ padding: '0.25rem 0.5rem', background: 'var(--color-accent)', color: '#fff', fontSize: '0.625rem', fontWeight: 700, borderRadius: '0.25rem' }}>NEXT STEP</span>
                  </div>
                </div>
                <h4 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.25rem', color: 'var(--color-on-surface)' }}>Complete Your Skills Assessment</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5, marginBottom: '1rem' }}>
                  A quick assessment tailors your {programTitle} learning path and unlocks role matching.
                </p>
                <Link href="/dashboard/assessment" style={{ display: 'inline-block', padding: '0.5rem 1.25rem', background: 'var(--color-accent)', color: '#fff', borderRadius: '0.5rem', fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}
                  onClick={() => handleDashboardAction('assessment_clicked')}>
                  Take Assessment
                </Link>
              </div>
            )}

            {state === 'C' && nextMilestone && (
              <div className="stitch-card" style={{ cursor: 'pointer' }}>
                <div style={{ height: '12rem', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '1rem', position: 'relative', background: 'var(--surface-container-highest)' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--color-background-dark), transparent)', opacity: 0.8 }} />
                  <div style={{ position: 'absolute', bottom: '1rem', left: '1rem' }}>
                    <span style={{ padding: '0.25rem 0.5rem', background: 'var(--surface-container-highest)', color: 'var(--color-on-surface)', fontSize: '0.625rem', fontWeight: 700, borderRadius: '0.25rem' }}>IN PROGRESS</span>
                  </div>
                </div>
                <h4 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.25rem', color: 'var(--color-on-surface)' }}>{nextMilestone}</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5, marginBottom: '1rem' }}>
                  {completedCount} of {totalCourses} courses done. Finish training to move toward job-ready.
                </p>
                <Link href="/dashboard/training" style={{ display: 'inline-block', padding: '0.5rem 1.25rem', background: 'var(--color-accent)', color: '#fff', borderRadius: '0.5rem', fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}
                  onClick={() => handleDashboardAction('continue_training_clicked')}>
                  Continue Training
                </Link>
              </div>
            )}

            {state === 'D' && (
              <div className="stitch-card" style={{ cursor: 'pointer' }}>
                <div style={{ height: '12rem', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '1rem', position: 'relative', background: 'linear-gradient(135deg, rgba(173,44,77,0.2), var(--surface-container-highest))' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--color-background-dark), transparent)', opacity: 0.8 }} />
                  <div style={{ position: 'absolute', bottom: '1rem', left: '1rem' }}>
                    <span style={{ padding: '0.25rem 0.5rem', background: 'var(--color-accent)', color: '#fff', fontSize: '0.625rem', fontWeight: 700, borderRadius: '0.25rem' }}>COMPLETE</span>
                  </div>
                </div>
                <h4 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.25rem', color: 'var(--color-on-surface)' }}>Career Readiness</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5, marginBottom: '1rem' }}>
                  You've finished {programTitle}. Build readiness and apply for jobs.
                </p>
                <Link href="/dashboard/readiness" style={{ display: 'inline-block', padding: '0.5rem 1.25rem', background: 'var(--color-accent)', color: '#fff', borderRadius: '0.5rem', fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}
                  onClick={() => handleDashboardAction('career_readiness_clicked')}>
                  View Career Readiness
                </Link>
              </div>
            )}

            {/* Secondary Recommended Action Card */}
            {primaryAction && state !== 'A' && (
              <div className="stitch-card" style={{ cursor: 'pointer' }}>
                <div style={{ height: '12rem', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '1rem', position: 'relative', background: 'var(--surface-container-highest)' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--color-background-dark), transparent)', opacity: 0.8 }} />
                </div>
                <h4 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.25rem', color: 'var(--color-on-surface)' }}>{primaryAction.label}</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5, marginBottom: '1rem' }}>
                  Recommended next step for your career journey.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.625rem', fontWeight: 700, color: 'var(--color-on-surface-variant)', opacity: 0.6, textTransform: 'uppercase' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '0.75rem' }}>schedule</span> Recommended
                  </span>
                </div>
              </div>
            )}

            {/* How It Works card for state A */}
            {state === 'A' && (
              <div className="stitch-card" style={{ cursor: 'pointer' }}>
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

            {/* Job search card for state D */}
            {state === 'D' && jobSearchUrl && (
              <div className="stitch-card" style={{ cursor: 'pointer' }}>
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

        {/* ── This Week Links ── */}
        <section style={{ gridColumn: 'span 12' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '1rem', color: 'var(--color-on-surface)' }}>This Week</h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {[
              { href: '/dashboard/weekly-recap', label: 'Weekly recap', desc: 'Milestones and reminders', icon: 'event_note', action: 'weekly_recap_clicked' },
              { href: '/dashboard/learning', label: 'Learning hub', desc: 'Resources and your paths', icon: 'school', action: 'learning_hub_clicked' },
              { href: '/dashboard/ai-tools', label: 'Career tools', desc: 'Resume, interview practice, job match', icon: 'auto_awesome', action: 'ai_tools_clicked' },
            ].map((item) => (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none', color: 'inherit' }}
                onClick={() => handleDashboardAction(item.action)}>
                <div className="stitch-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: 'var(--color-on-surface-variant)' }}>{item.icon}</span>
                  <div>
                    <h5 style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-on-surface)' }}>{item.label}</h5>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', opacity: 0.6 }}>{item.desc}</p>
                  </div>
                  <span className="material-symbols-outlined" style={{ marginLeft: 'auto', fontSize: '1.25rem', color: 'var(--color-on-surface-variant)', opacity: 0.3 }}>chevron_right</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Quick-Link Bottom Cards ── */}
        <section style={{ gridColumn: 'span 12', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '1rem' }}>
          {[
            { icon: 'terminal', label: 'Resources', href: '/dashboard/resources' },
            { icon: 'history_edu', label: 'Assessments', href: '/dashboard/skills-assessment' },
            { icon: 'forum', label: 'Messages', href: '/dashboard/messages' },
            { icon: 'auto_awesome', label: 'Career Tools', href: '/dashboard/ai-tools' },
          ].map((item) => (
            <Link key={item.label} href={item.href} style={{ textDecoration: 'none', color: 'inherit' }}
              onClick={() => handleDashboardAction(`quicklink_${item.label.toLowerCase()}_clicked`)}>
              <div style={{ background: 'var(--surface-container-low)', padding: '1rem', borderRadius: '0.75rem', transition: 'background-color 0.15s' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem', display: 'block' }}>{item.icon}</span>
                <h5 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface)' }}>{item.label}</h5>
              </div>
            </Link>
          ))}
        </section>

        {/* ── Recent Activity (collapsed) ── */}
        {recentActivity.length > 0 && (state === 'C' || state === 'D') && (
          <section className="stitch-card" style={{ gridColumn: 'span 12' }}>
            <details>
              <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-on-surface)' }}>Recent Activity</summary>
              <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
                {recentActivity.map((a, i) => (
                  <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
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
          <section className="stitch-card" style={{ gridColumn: 'span 12' }}>
            <details>
              <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-on-surface)' }}>Onboarding Checklist</summary>
              <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
                {([
                  { done: checklist.createAccount, label: 'Create account' },
                  { done: checklist.chooseProgram, label: 'Choose program' },
                  { done: checklist.completeAssessment, label: 'Complete assessment' },
                  { done: checklist.startFirstCourse, label: 'Start first course' },
                  { done: checklist.completeFirstCourse, label: 'Complete first course' },
                ]).map(({ done, label }) => (
                  <li key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', fontSize: '0.875rem', color: done ? 'var(--color-on-surface-variant)' : 'var(--color-accent)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: done ? 'var(--color-green)' : 'var(--surface-container-highest)', fontVariationSettings: done ? "'FILL' 1" : "'FILL' 0" }}>
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
