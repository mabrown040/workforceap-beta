'use client';

import { useEffect } from 'react';
import Link from 'next/link';
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
  interviewRequestedAt?: Date | null;
  interviewCompletedAt?: Date | null;
  interviewEligible?: boolean;
};

export default function DashboardHomeClient({
  firstName,
  state,
  programTitle,
  completedCount,
  totalCourses,
  nextMilestone,
  recommendedActions,
  jobSearchUrl,
  age,
  isMinor,
  assessmentDone,
  preScreeningDone,
  interviewRequestedAt,
  interviewCompletedAt,
  interviewEligible,
  enrolledAt,
  assessmentScorePct,
  recentActivity,
  checklist,
  checklistAllDone,
  applicationStatus,
  noApplicationOnFile,
}: DashboardHomeClientProps) {
  useEffect(() => {
    trackFunnelEvent('view_dashboard_home', state, { member_state: state });
  }, [state]);

  const handleDashboardAction = (action: string) => {
    postMemberEvent({
      eventName: 'dashboard_action',
      metadata: { action, member_state: state }
    });
  };

  const progressPercent = totalCourses > 0 ? Math.round((completedCount / totalCourses) * 100) : 0;
  const primaryAction = recommendedActions[0];

  return (
    <div>
      {age !== null && age !== undefined && age < 18 ? <YouthDashboardNotice age={age} /> : null}

      <header className="mb-12">
        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary-fixed text-primary text-[11px] font-bold uppercase tracking-[0.1em] mb-6">
          Member Portal
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-on-surface tracking-tighter leading-[0.95] mb-6">
          {state === 'A' ? (
            <>Welcome, <br /><span className="text-primary italic">{firstName}.</span></>
          ) : (
            <>Good Morning, <br /><span className="text-primary italic">{firstName}.</span></>
          )}
        </h1>
        <p className="text-on-surface-variant text-lg md:text-xl max-w-xl leading-relaxed font-medium">
          Welcome to your Advancement Foundry. Your trajectory is currently at <span className="text-primary font-bold">{progressPercent}% completion</span>. Let&apos;s sharpen your next milestone.
        </p>
      </header>

      {noApplicationOnFile ? (
        <div className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/20 mb-8 editorial-shadow">
          <h2 className="text-2xl font-bold mb-4">Start your journey</h2>
          <p className="text-on-surface-variant mb-6">You haven&apos;t submitted an application yet. It takes about 10 minutes.</p>
          <Link href="/apply" className="bg-primary text-on-primary px-8 py-3 rounded-lg font-bold inline-block hover:brightness-110 transition-all">
            Apply Now
          </Link>
        </div>
      ) : applicationStatus ? (
        <div className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/20 mb-8 editorial-shadow">
          <h2 className="text-2xl font-bold mb-6">Application Status</h2>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Current Phase</p>
              <p className="text-xl font-bold text-primary">{applicationStatus.label}</p>
              <p className="text-sm text-on-surface-variant mt-2">Next: {applicationStatus.nextStep}</p>
            </div>

            {applicationStatus.submittedAt && (
              <div className="bg-surface-container-high px-4 py-3 rounded-lg text-sm">
                <p className="font-bold text-on-surface">Submitted on {new Date(applicationStatus.submittedAt).toLocaleDateString()}</p>
                {applicationStatus.showResponseEstimate && (
                  <p className="text-on-surface-variant mt-1 text-xs">Expect a response within 24-48 hrs</p>
                )}
              </div>
            )}
          </div>

          {!preScreeningDone && (
            <div className="mt-8 pt-8 border-t border-outline-variant/20">
              <MemberPreScreeningForm />
            </div>
          )}

          {preScreeningDone && interviewEligible && !interviewRequestedAt && !interviewCompletedAt && (
            <div className="mt-8 pt-8 border-t border-outline-variant/20">
              <MemberInterviewRequestButton />
            </div>
          )}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Your Journey Tracker (Wide) */}
        <section className="md:col-span-8 bg-white border border-outline-variant/20 rounded-2xl p-8 relative overflow-hidden flex flex-col justify-between min-h-[440px] shadow-sm">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-10">
              <h2 className="text-2xl font-bold tracking-tight text-on-surface">Your Journey</h2>
              <span className="text-sm font-semibold text-primary">{programTitle || 'Exploring Programs'}</span>
            </div>
            <div className="space-y-14">
              <div className="relative">
                {/* Step 1: Active */}
                <div className="flex items-start gap-6 relative z-10">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-on-primary ring-8 ring-primary-fixed">
                    <span className="material-symbols-outlined text-base">play_arrow</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-on-surface">Current Milestone</h3>
                    <p className="text-on-surface-variant text-sm mt-1">{nextMilestone || 'Begin Orientation'}</p>
                  </div>
                </div>
                <div className="absolute left-6 top-12 w-px h-16 bg-outline-variant/30"></div>
              </div>
              <div className="relative">
                {/* Step 2: Next */}
                <div className="flex items-start gap-6 relative z-10">
                  <div className="w-12 h-12 rounded-full bg-surface-container-high border border-outline-variant/20 flex items-center justify-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-base">lock</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-on-surface-variant opacity-70">Next Module</h3>
                    <p className="text-on-surface-variant/70 text-sm mt-1">Unlocks after completion</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Watermark Editorial Number */}
          <span className="absolute bottom-[-30px] right-[-15px] text-[240px] font-black text-primary/5 leading-none select-none">
            01
          </span>
          <div className="mt-8 z-10">
            <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(173,44,77,0.3)]" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <div className="flex justify-between mt-3">
              <p className="text-xs font-bold text-primary uppercase tracking-widest">{progressPercent}% Complete</p>
              {totalCourses > 0 && <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{completedCount} of {totalCourses} Courses</p>}
            </div>
          </div>
        </section>

        {/* AI Career Assistant (Small Vertical) */}
        <aside className="md:col-span-4 bg-gradient-to-br from-primary to-on-primary-fixed rounded-2xl p-8 text-white shadow-xl flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-8 backdrop-blur-md border border-white/10">
              <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            </div>
            <h2 className="text-2xl font-bold mb-6 tracking-tight leading-tight">Assistant Recommendations</h2>
            <p className="text-primary-fixed/90 text-sm leading-relaxed mb-8 font-medium">
              &quot;Based on your current progress in {programTitle || 'your program'}, I recommend exploring the **Resume Rewriter** tool to align your past experience with tech roles.&quot;
            </p>
          </div>
          {primaryAction && (
            <Link
              href={primaryAction.href}
              onClick={() => handleDashboardAction('primary_action_clicked')}
              className="w-full py-4 bg-white text-primary text-center rounded-xl font-bold text-sm transition-all hover:shadow-lg active:scale-95 block"
            >
              {primaryAction.label}
            </Link>
          )}
        </aside>

        {/* Curated Milestones (Asymmetric) */}
        <section className="md:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-8 mt-4">
          <div className="md:col-span-1 flex flex-col justify-center pr-8">
            <h2 className="text-3xl font-black tracking-tighter leading-tight mb-4 text-on-surface">Curated <br /><span className="text-on-surface-variant">Milestones.</span></h2>
            <p className="text-on-surface-variant text-base leading-relaxed">A selective record of your professional evolution and verified capabilities.</p>
          </div>
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Milestone Card 1 */}
            <div className="bg-white rounded-2xl p-7 shadow-sm border border-outline-variant/20 group cursor-pointer hover:border-primary-container/40 transition-colors">
              <div className="flex justify-between items-start mb-12">
                <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                <span className="px-2.5 py-1 bg-tertiary-container/10 text-tertiary-container text-[10px] font-black rounded uppercase tracking-wide">
                  {assessmentDone ? 'Earned' : 'Pending'}
                </span>
              </div>
              <h4 className="text-xl font-bold mb-1 text-on-surface">Career Assessment</h4>
              <p className="text-on-surface-variant text-xs mb-8">Foundation Mastery</p>
              <Link href="/dashboard/assessments" className="flex items-center gap-2 text-primary font-bold text-[11px] uppercase tracking-[0.1em] group-hover:translate-x-2 transition-transform">
                {assessmentDone ? 'View Results' : 'Take Assessment'} <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>

            {/* Milestone Card 2 */}
            <div className="bg-white rounded-2xl p-7 shadow-sm border border-outline-variant/20 group cursor-pointer hover:border-primary-container/40 transition-colors">
              <div className="flex justify-between items-start mb-12">
                <span className="material-symbols-outlined text-on-surface-variant text-3xl">school</span>
                <span className="px-2.5 py-1 bg-surface-container-highest text-on-surface-variant text-[10px] font-black rounded uppercase tracking-wide">In Progress</span>
              </div>
              <h4 className="text-xl font-bold mb-1 text-on-surface">{programTitle || 'Program Track'}</h4>
              <p className="text-on-surface-variant text-xs mb-8">{completedCount} of {totalCourses} Completed</p>
              <Link href="/dashboard/learning" className="flex items-center gap-2 text-primary font-bold text-[11px] uppercase tracking-[0.1em] group-hover:translate-x-2 transition-transform">
                Resume Training <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Secondary Grid Actions */}
        <div className="md:col-span-5 bg-white border border-outline-variant/20 rounded-2xl p-8 flex flex-col justify-between h-[320px] shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">analytics</span>
            </div>
            <h3 className="font-bold text-xl text-on-surface">Market Trends</h3>
          </div>
          <div>
            <p className="text-base text-on-surface-variant mb-6 leading-relaxed">
              Software and Tech salaries in the <span className="font-semibold text-on-surface">Austin region</span> have increased by **4.2%** this quarter. Your current skills align with top-tier vacancies.
            </p>
            <Link href={jobSearchUrl || "/jobs"} className="text-primary font-bold text-sm border-b-2 border-primary/20 hover:border-primary transition-colors inline-flex items-center gap-1">
              Explore Market Data <span className="material-symbols-outlined text-xs">open_in_new</span>
            </Link>
          </div>
        </div>

        <div className="md:col-span-7 rounded-2xl overflow-hidden relative h-[320px] group shadow-sm">
          <div className="absolute inset-0 bg-surface-container-high"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-on-primary-fixed/90 via-on-primary-fixed/40 to-transparent flex flex-col justify-end p-8 z-10">
            <h3 className="text-white text-2xl font-black mb-2 tracking-tight">AI Career Tools</h3>
            <p className="text-primary-fixed-dim/80 text-sm max-w-sm font-medium mb-4">Leverage our suite of AI tools to rewrite your resume, practice interviews, and track your applications.</p>
            <Link href="/dashboard/ai-tools" className="text-white font-bold text-sm underline underline-offset-4 w-fit">
              Browse Tools
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
