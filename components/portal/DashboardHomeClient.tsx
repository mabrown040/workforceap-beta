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
import PortalActionCard from '@/components/portal/ui/PortalActionCard';
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

  const checklistItems = [
    { done: checklist.createAccount, label: 'Account' },
    { done: checklist.chooseProgram, label: 'Program' },
    { done: checklist.completeAssessment, label: 'Assessment' },
    { done: checklist.startFirstCourse, label: 'Start' },
    { done: checklist.completeFirstCourse, label: 'Complete' },
  ];

  const weekEyebrow = useMemo(() => {
    const d = new Date();
    const start = new Date(d);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    return `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }, []);

  /* ── Derive primary action card config ── */
  const primaryActionCard = (() => {
    if (state === 'A') return {
      eyebrow: 'Get Started',
      title: 'Choose Your Program',
      description: 'Select a no-cost career program. All certifications, training, and job support are free.',
      ctaLabel: 'Browse Programs',
      href: '/dashboard/program',
      icon: 'school',
      badge: { label: 'Next Step', variant: 'accent' as const },
      heroGradient: 'career' as const,
      action: 'choose_program_clicked',
    };
    if (state === 'B') return {
      eyebrow: 'Enrolled',
      title: 'Complete Your Skills Assessment',
      description: `A short assessment tailors your ${programTitle ?? 'program'} learning path and unlocks role matching.`,
      ctaLabel: 'Take Assessment',
      href: '/dashboard/assessment',
      icon: 'psychology',
      badge: { label: 'Next Step', variant: 'accent' as const },
      heroGradient: 'tech' as const,
      action: 'assessment_clicked',
    };
    if (state === 'C') return {
      eyebrow: programTitle ?? 'Training',
      title: nextMilestone ? `Continue: ${nextMilestone}` : 'Continue Training',
      description: `${completedCount} of ${totalCourses} courses complete. Finish to unlock job placement support.`,
      ctaLabel: 'Open Training',
      href: '/dashboard/training',
      icon: 'play_circle',
      badge: { label: 'In Progress', variant: 'glass' as const },
      heroGradient: 'tools' as const,
      action: 'continue_training_clicked',
    };
    return {
      eyebrow: 'All Courses Complete',
      title: 'Build Career Readiness',
      description: `You've finished ${programTitle ?? 'your program'}. Now focus on resume, interviews, and job applications.`,
      ctaLabel: 'Career Readiness',
      href: '/dashboard/readiness',
      icon: 'rocket_launch',
      badge: { label: 'Complete', variant: 'gold' as const },
      heroGradient: 'health' as const,
      action: 'career_readiness_clicked',
    };
  })();

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
          label: 'Assessment Score',
          value: `${assessmentScorePct}%`,
          hint: 'Skills benchmark',
          icon: 'psychology',
          accent: 'blue' as const,
          href: '/dashboard/skills-assessment',
        }]
      : []),
    {
      label: 'AI Tools Used',
      value: '—',
      hint: 'Resume, interviews',
      icon: 'auto_awesome',
      accent: 'gold' as const,
      href: '/dashboard/ai-tools',
    },
  ];

  return (
    <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
      {age !== null && age < 18 ? <YouthDashboardNotice age={age} /> : null}

      {/* ── Page Header ── */}
      <header style={{ marginBottom: '2rem', padding: '0 2rem' }}>
        <p className="text-label-upper" style={{ color: 'var(--color-on-surface-variant)', letterSpacing: '0.08em', fontSize: '0.75rem', marginBottom: '0.375rem' }}>
          {weekEyebrow}{programTitle ? ` · ${programTitle}` : ''}
        </p>
        <h2 className="text-display-sm" style={{ color: 'var(--color-on-surface)', marginBottom: '0.5rem' }}>
          Welcome back, {firstName}.
        </h2>
        <p style={{ color: 'var(--color-on-surface-variant)', maxWidth: '42rem', lineHeight: 1.65, opacity: 0.75, fontSize: '0.9375rem' }}>
          {state === 'A' && (isMinor && age ? "Let's explore career paths and build skills together." : "Let's build your career path — all programs are free.")}
          {state === 'B' && `You're enrolled in ${programTitle ?? 'your program'}. Complete your assessment to unlock training.`}
          {state === 'C' && `Your mastery of ${programTitle ?? 'training'} is ${progressPct}% complete. Keep going.`}
          {state === 'D' && `All courses complete. Focus on job outcomes and career readiness.`}
        </p>
      </header>

      {nextBestActions.length > 0 && (
        <div style={{ padding: '0 2rem', marginBottom: '1.5rem' }}>
          <MemberNextStepsStrip actions={nextBestActions} fillRow />
        </div>
      )}

      {/* ── Metric Strip ── */}
      {(state === 'C' || state === 'D') && (
        <div style={{ padding: '0 2rem', marginBottom: '1.5rem' }}>
          <div className="portal-metric-strip">
            {metricCards.map((m) => (
              <PortalMetricCard key={m.label} {...m} />
            ))}
          </div>
        </div>
      )}

      {/* ── Bento Grid ── */}
      <div className="portal-bento-grid" style={{ padding: '0 2rem' }}>

        {/* ── Main Progress Card ── */}
        {(state === 'B' || state === 'C' || state === 'D') && programTitle && (
          <section className="portal-card portal-card--flat" style={{ gridColumn: 'span 7' }}>
            <div className="portal-card__body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', gap: '1rem' }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', marginBottom: '0.5rem' }}>
                    {state === 'D' ? 'Program Complete' : 'Current Milestone'}
                  </p>
                  <h2 style={{ fontSize: '1.375rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.25rem', color: 'var(--color-on-surface)', lineHeight: 1.2 }}>
                    {state === 'D' ? programTitle : (nextMilestone ?? programTitle)}
                  </h2>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
                    {completedCount} of {totalCourses} courses {state === 'D' ? 'completed' : 'done'}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, background: 'rgba(173,44,77,0.08)', borderRadius: '0.75rem', padding: '0.75rem 1rem' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-accent)', letterSpacing: '-0.04em', display: 'block', lineHeight: 1 }}>
                    {progressPct}<span style={{ fontSize: '1rem' }}>%</span>
                  </span>
                  <span style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)' }}>Progress</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="portal-progress-bar" style={{ marginBottom: '1.75rem' }}>
                <div className="portal-progress-bar__fill" style={{ width: `${progressPct}%` }} />
              </div>

              {/* Milestone journey dots */}
              <div className="portal-milestone-track">
                {checklistItems.map((item, i) => {
                  const isCurrent = !item.done && (i === 0 || checklistItems[i - 1].done);
                  return (
                    <div key={item.label} className="portal-milestone-step" style={{
                      opacity: item.done ? 0.45 : isCurrent ? 1 : 0.22,
                      color: isCurrent ? 'var(--color-accent)' : 'var(--color-on-surface-variant)',
                    }}>
                      {item.done ? (
                        <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', fontVariationSettings: "'FILL' 1", color: 'var(--color-accent)' }}>check_circle</span>
                      ) : isCurrent ? (
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-accent)', boxShadow: '0 0 0 4px rgba(173,44,77,0.18)', animation: 'portal-pulse 2s infinite' }} />
                      ) : (
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--surface-container-highest)' }} />
                      )}
                      <p className="portal-milestone-step__label">{item.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── Application Status Card ── */}
        <aside
          className="portal-card portal-card--flat portal-card--accent-bar"
          style={{ gridColumn: (state === 'B' || state === 'C' || state === 'D') && programTitle ? 'span 5' : 'span 12' }}
        >
          <div className="portal-card__body">
            {noApplicationOnFile ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
                  <div className="portal-metric-card__icon-wrap portal-metric-card__icon-wrap--accent">
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', fontVariationSettings: "'FILL' 1" }}>description</span>
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>Apply Now</h3>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.65, marginBottom: '1.25rem' }}>
                  No application on file yet. Starting your application is free and takes about 5 minutes.
                </p>
                <Link href="/apply" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', display: 'flex' }}
                  onClick={() => handleDashboardAction('start_application_clicked')}>
                  Start application
                </Link>
              </div>
            ) : applicationStatus ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
                  <div className="portal-metric-card__icon-wrap portal-metric-card__icon-wrap--accent">
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', fontVariationSettings: "'FILL' 1" }}>task_alt</span>
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>Application Status</h3>
                </div>
                {applicationStatus.progressIndex !== null && (
                  <div className="portal-app-progress">
                    {MEMBER_APPLICATION_PROGRESS_STEPS.map((stepLabel, i) => {
                      const stepNum = i + 1;
                      const idx = applicationStatus.progressIndex!;
                      const done = stepNum < idx;
                      const current = stepNum === idx;
                      const locked = stepNum > idx;
                      return (
                        <div key={stepLabel} className="portal-app-progress__step">
                          <div className={`portal-app-progress__bar portal-app-progress__bar--${done ? 'done' : current ? 'current' : 'locked'}`} />
                          <span className="portal-app-progress__label" style={{ opacity: locked ? 0.4 : 0.85 }}>
                            {stepLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{ padding: '0.875rem', background: 'var(--surface-container-lowest)', borderRadius: '0.625rem', marginBottom: '0.875rem' }}>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--color-on-surface-variant)', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Current Status</p>
                  <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-on-surface)', margin: 0 }}>{applicationStatus.label}</p>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>{applicationStatus.nextStep}</p>
                {applicationStatus.showResponseEstimate && (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', opacity: 0.7, marginTop: '0.5rem', fontStyle: 'italic' }}>
                    We typically respond within 24–48 business hours.
                  </p>
                )}
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
                  <div className="portal-metric-card__icon-wrap portal-metric-card__icon-wrap--accent">
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', fontVariationSettings: "'FILL' 1" }}>neurology</span>
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>Today</h3>
                </div>
                <p style={{ fontSize: '0.9375rem', fontStyle: 'italic', color: 'var(--color-on-surface-variant)', lineHeight: 1.65, marginBottom: '1rem' }}>
                  {state === 'A' && 'Choose a program to get started on your career path. All programs are offered at no cost.'}
                  {state === 'B' && `Complete your skills assessment to unlock your ${programTitle} training.`}
                  {state === 'C' && `Keep going! Finish ${nextMilestone ?? 'your next course'} to stay on track.`}
                  {state === 'D' && 'Focus on career readiness: resume, interview practice, and job applications.'}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {assessmentScorePct != null && (
                    <span style={{ padding: '0.25rem 0.625rem', background: 'rgba(173,44,77,0.1)', color: 'var(--color-accent)', fontSize: '0.75rem', borderRadius: '9999px', fontWeight: 600 }}>
                      Assessment: {assessmentScorePct}%
                    </span>
                  )}
                  {enrolledAt && (
                    <span style={{ padding: '0.25rem 0.625rem', background: 'var(--surface-container-lowest)', color: 'var(--color-on-surface-variant)', fontSize: '0.75rem', borderRadius: '9999px', fontWeight: 600 }}>
                      Enrolled: {formatPortalDate(enrolledAt)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── Pre-Screening ── */}
        {assessmentDone && !preScreeningDone && (
          <section className="portal-card portal-card--flat" style={{ gridColumn: 'span 12' }}>
            <div className="portal-card__body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
                <div className="portal-metric-card__icon-wrap portal-metric-card__icon-wrap--accent">
                  <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', fontVariationSettings: "'FILL' 1" }}>assignment</span>
                </div>
                <h3 style={{ fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>Pre-Screening (before your interview)</h3>
              </div>
              <MemberPreScreeningForm />
            </div>
          </section>
        )}

        {/* ── Interview ── */}
        {assessmentDone && preScreeningDone && interviewEligible && !interviewCompletedAt && (
          <section className="portal-card portal-card--flat" style={{ gridColumn: 'span 12' }}>
            <div className="portal-card__body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
                <div className="portal-metric-card__icon-wrap portal-metric-card__icon-wrap--blue">
                  <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', fontVariationSettings: "'FILL' 1" }}>videocam</span>
                </div>
                <h3 style={{ fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>Interview</h3>
              </div>
              {interviewRequestedAt ? (
                <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', fontSize: '0.875rem' }}>
                  We received your interview request on {formatPortalDateTime(interviewRequestedAt)}. A counselor will reach out by email.
                </p>
              ) : (
                <MemberInterviewRequestButton />
              )}
            </div>
          </section>
        )}

        {/* ── Active Curriculum / Career Next Steps — premium action cards ── */}
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '1.25rem' }}>
            <PortalActionCard
              eyebrow={primaryActionCard.eyebrow}
              title={primaryActionCard.title}
              description={primaryActionCard.description}
              ctaLabel={primaryActionCard.ctaLabel}
              href={primaryActionCard.href}
              icon={primaryActionCard.icon}
              badge={primaryActionCard.badge}
              heroGradient={primaryActionCard.heroGradient}
              className="portal-card--elevated"
              onClick={() => { handleDashboardAction(primaryActionCard.action); }}
            />

            {/* Secondary recommended action */}
            {primaryAction && state !== 'A' && (
              <PortalActionCard
                eyebrow="Recommended"
                title={primaryAction.label}
                description="Recommended next step for your career journey."
                ctaLabel="Get Started"
                href={primaryAction.href}
                icon="star"
                badge={{ label: 'Recommended', variant: 'glass' }}
                heroGradient="neutral"
                className="portal-card--elevated"
                onClick={() => { handleDashboardAction('recommended_action_clicked'); }}
              />
            )}

            {/* Contextual third card */}
            {state === 'A' && (
              <PortalActionCard
                eyebrow="Resources"
                title="How It Works"
                description="Learn about WorkforceAP programs, free training, and career placement support."
                ctaLabel="Learn more"
                href="/how-it-works"
                icon="info"
                heroGradient="tech"
                className="portal-card--elevated"
                onClick={() => { handleDashboardAction('how_it_works_clicked'); }}
              />
            )}

            {state === 'D' && jobSearchUrl && (
              <PortalActionCard
                eyebrow="Job Board"
                title="Browse Live Jobs"
                description="Search roles matched to your area and completed program."
                ctaLabel="Browse jobs"
                href={jobSearchUrl}
                icon="work"
                heroGradient="health"
                external
                className="portal-card--elevated"
                onClick={() => { handleDashboardAction('job_search_clicked'); }}
              />
            )}
          </div>
        </section>

        {/* ── Quick Actions ── */}
        <section style={{ gridColumn: 'span 12' }}>
          <div className="portal-dash-section-header">
            <h3 className="portal-heading-with-bar portal-section-heading" style={{ margin: 0 }}>Quick Actions</h3>
          </div>
          <div className="portal-quick-actions-grid">
            {[
              { href: '/dashboard/weekly-recap', label: 'Weekly Recap', desc: 'Milestones and reminders', icon: 'event_note', action: 'weekly_recap_clicked' },
              { href: '/dashboard/ai-tools', label: 'Career Tools', desc: 'Resume, interview, job match', icon: 'auto_awesome', action: 'ai_tools_clicked' },
              { href: '/dashboard/learning', label: 'Learning Hub', desc: 'Pathways and resources', icon: 'school', action: 'learning_hub_clicked' },
              { href: '/dashboard/messages', label: 'Messages', desc: 'Counselor and team threads', icon: 'forum', action: 'quicklink_messages_clicked' },
              { href: '/dashboard/skills-assessment', label: 'Assessments', desc: 'Skills evaluation', icon: 'history_edu', action: 'quicklink_assessments_clicked' },
              { href: '/dashboard/resources', label: 'Resources', desc: 'Program materials', icon: 'terminal', action: 'quicklink_resources_clicked' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="portal-quick-action-item"
                onClick={() => handleDashboardAction(item.action)}
              >
                <div className="portal-quick-action-item__icon">
                  <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="portal-quick-action-item__label">{item.label}</p>
                  <p className="portal-quick-action-item__desc">{item.desc}</p>
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-on-surface-variant)', opacity: 0.3, flexShrink: 0 }}>chevron_right</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Recent Activity (collapsed) ── */}
        {recentActivity.length > 0 && (state === 'C' || state === 'D') && (
          <section className="portal-card portal-card--flat portal-card--padded" style={{ gridColumn: 'span 12' }}>
            <details>
              <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-on-surface)' }}>Recent Activity</summary>
              <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
                {recentActivity.map((a, i) => (
                  <li key={i} className="portal-checklist-item" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                    <span style={{ flex: 1 }}>{a.label}</span>
                    <span style={{ opacity: 0.5, flexShrink: 0 }}>{formatPortalDate(a.timestamp)}</span>
                  </li>
                ))}
              </ul>
            </details>
          </section>
        )}

        {/* ── Onboarding Checklist (collapsed) ── */}
        {!checklistAllDone && (
          <section className="portal-card portal-card--flat portal-card--padded" style={{ gridColumn: 'span 12' }}>
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
                  <li key={label} className="portal-checklist-item" style={{ color: done ? 'var(--color-on-surface-variant)' : 'var(--color-accent)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: done ? 'var(--color-green, #4a9b4f)' : 'var(--surface-container-highest)', fontVariationSettings: done ? "'FILL' 1" : "'FILL' 0" }}>
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
