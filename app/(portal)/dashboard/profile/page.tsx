import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Prisma } from '@prisma/client';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { ASSESSMENT_QUESTIONS } from '@/lib/assessment/answer-key';
import DashboardProfileForm from '@/components/portal/DashboardProfileForm';
import SettingsForm from '@/components/portal/SettingsForm';
import DeleteAccountButton from '@/components/portal/DeleteAccountButton';
import StartTourButton from '@/components/onboarding/StartTourButton';
import ResumeClient from '@/app/(portal)/dashboard/resume/ResumeClient';
import ResumeCoachWorkspace from '@/components/portal/ResumeCoachWorkspace';
import { getProfileCompleteness } from '@/lib/resume/profileCompleteness';
import MobileBottomNav from '@/components/MobileBottomNav';
import PortalCard from '@/components/portal/ui/PortalCard';

export const metadata: Metadata = buildPageMetadata({
  title: 'My Profile',
  description: 'View and edit your profile.',
  path: '/dashboard/profile',
});

export default async function DashboardProfilePage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/profile');

  const userSelect = {
    id: true,
    fullName: true,
    email: true,
    phone: true,
    createdAt: true,
    enrolledProgram: true,
    enrolledAt: true,
    assessmentCompleted: true,
    assessmentCompletedAt: true,
    assessmentScore: true,
    assessmentScorePct: true,
    assessmentAnswers: true,
    notificationsUpdates: true,
    notificationsReminders: true,
    profile: {
      select: {
        profilePhone: true,
        profileAddress: true,
        profileLinkedin: true,
        profileBio: true,
        financialAidInterest: true,
        resumeEnhancedPath: true,
        resumeOriginalPath: true,
      },
    },
  } satisfies Prisma.UserSelect;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: userSelect,
  });

  if (!dbUser) redirect('/login');

  const nameParts = dbUser.fullName?.split(' ') ?? [];
  const firstName = nameParts[0] ?? '';
  const lastName = nameParts.slice(1).join(' ') ?? '';

  const program = dbUser.enrolledProgram ? getProgramBySlug(dbUser.enrolledProgram) : null;
  const initials = dbUser.fullName
    ? dbUser.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  const profilePct = getProfileCompleteness(dbUser.profile, dbUser);
  const witData = {
    name: dbUser.fullName ?? '',
    email: dbUser.email,
    phone: dbUser.phone ?? dbUser.profile?.profilePhone ?? '',
    recentEmployer: '—',
    targetJob: program?.title ?? dbUser.enrolledProgram ?? 'Target role',
    skills: program?.skills?.join(', ') ?? '—',
  };

  const rawAnswers = dbUser.assessmentAnswers;
  const assessmentAnswers =
    rawAnswers && typeof rawAnswers === 'object' && !Array.isArray(rawAnswers)
      ? (rawAnswers as Record<string, unknown>)
      : null;

  return (
    <div className="wa-max-w-[var(--max-width)] wa-mx-auto wa-px-4 md:wa-px-8 wa-pb-24">
      
      {/* ── Profile Hero (Responsive) ── */}
      <section className="wa-py-8 wa-flex wa-flex-col md:wa-flex-row wa-items-center md:wa-items-start wa-gap-6">
        <div
          className="wa-w-24 wa-h-24 wa-rounded-full wa-flex wa-items-center wa-justify-center wa-text-3xl wa-font-bold wa-shadow-sm wa-flex-shrink-0"
          style={{ background: 'var(--color-accent)', color: 'var(--color-white)' }}
        >
          {initials}
        </div>
        <div className="wa-text-center md:wa-text-left wa-flex-1">
          <h1 className="wa-text-2xl md:wa-text-3xl wa-font-extrabold wa-tracking-tight wa-mb-1">
            {dbUser.fullName ?? 'Your Profile'}
          </h1>
          <div className="wa-flex wa-flex-wrap wa-justify-center md:wa-justify-start wa-items-center wa-gap-3 wa-mb-3">
            {program && (
              <span className="wa-inline-flex wa-items-center wa-px-3 wa-py-1 wa-rounded-full wa-text-[10px] wa-font-bold wa-uppercase wa-tracking-wider wa-bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] wa-text-[var(--color-accent)]">
                {program.title}
              </span>
            )}
            <span className="wa-text-sm wa-text-[var(--color-on-surface-variant)]">
              {dbUser.createdAt ? `Member since ${new Date(dbUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : 'WorkforceAP Member'}
            </span>
          </div>

          {/* Completeness Meter */}
          <div className="wa-max-w-md wa-mx-auto md:wa-mx-0">
            <div className="wa-flex wa-justify-between wa-items-end wa-mb-2">
              <span className="wa-text-xs wa-font-bold">Profile {profilePct}% complete</span>
              <a href="#profile-form" className="wa-text-[10px] wa-font-bold wa-text-[var(--color-accent)] wa-uppercase">Fill missing info</a>
            </div>
            <div className="wa-h-1.5 wa-w-full wa-bg-[var(--surface-container-high)] wa-rounded-full wa-overflow-hidden">
              <div
                className="wa-h-full wa-bg-[var(--color-accent-dark)] wa-rounded-full wa-transition-all"
                style={{ width: `${profilePct}%` }}
              />
            </div>
          </div>
        </div>
        <div className="wa-hidden md:wa-flex wa-gap-2">
          <a href="#profile-form" className="btn btn-outline btn-sm">Edit info</a>
          <a href="#settings" className="btn btn-outline btn-sm">Settings</a>
        </div>
      </section>

      {/* ── Content Grid ── */}
      <div className="wa-grid wa-gap-8 md:wa-grid-cols-[1fr_320px]">
        
        {/* Main Column */}
        <div className="wa-flex wa-flex-col wa-gap-8">
          
          {/* Personal Information */}
          <section id="profile-form" className="portal-card wa-p-6">
            <h2 className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-widest wa-text-[var(--color-on-surface-variant)] wa-mb-6">Contact Information</h2>
            <DashboardProfileForm
              defaultFirstName={firstName}
              defaultLastName={lastName}
              defaultPhone={dbUser.profile?.profilePhone ?? dbUser.phone ?? ''}
              defaultAddress={dbUser.profile?.profileAddress ?? ''}
              defaultLinkedin={dbUser.profile?.profileLinkedin ?? ''}
              defaultBio={dbUser.profile?.profileBio ?? ''}
              defaultFinancialAidInterest={dbUser.profile?.financialAidInterest ?? null}
            />
          </section>

          {/* Resume & AI Toolkit */}
          <section id="resume" className="portal-card wa-p-6">
            <h2 className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-widest wa-text-[var(--color-on-surface-variant)] wa-mb-6">Resume & AI Toolkit</h2>
            <ResumeClient
              completeness={profilePct}
              witData={witData}
              hasOriginal={!!dbUser.profile?.resumeOriginalPath}
              hasEnhanced={!!dbUser.profile?.resumeEnhancedPath}
            />
            <div className="wa-mt-6">
              <ResumeCoachWorkspace />
            </div>
          </section>

          {/* Assessment Details */}
          {dbUser.assessmentCompleted && (
            <section className="portal-card wa-p-6">
              <div className="wa-flex wa-items-center wa-justify-between wa-mb-6">
                <h2 className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-widest wa-text-[var(--color-on-surface-variant)]">Skills Assessment</h2>
                <span className="wa-bg-green-100 wa-text-green-700 wa-px-3 wa-py-1 wa-rounded-full wa-text-[10px] wa-font-bold wa-uppercase">Complete</span>
              </div>
              <div className="wa-flex wa-gap-8 wa-mb-6">
                <div>
                  <p className="wa-text-[10px] wa-font-bold wa-uppercase wa-tracking-widest wa-text-[var(--color-on-surface-variant)] wa-mb-1">Score</p>
                  <p className="wa-text-3xl wa-font-black wa-text-[var(--color-accent)]">{dbUser.assessmentScorePct}%</p>
                  <p className="wa-text-xs wa-text-[var(--color-on-surface-variant)]">{dbUser.assessmentScore}/90 pts</p>
                </div>
                {dbUser.assessmentCompletedAt && (
                  <div>
                    <p className="wa-text-[10px] wa-font-bold wa-uppercase wa-tracking-widest wa-text-[var(--color-on-surface-variant)] wa-mb-1">Completed</p>
                    <p className="wa-text-lg wa-font-bold">{new Date(dbUser.assessmentCompletedAt).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
              <details className="wa-group">
                <summary className="wa-cursor-pointer wa-text-xs wa-font-bold wa-text-[var(--color-on-surface-variant)] hover:wa-text-[var(--color-on-surface)] wa-transition-colors">View Assessment Answers</summary>
                <div className="wa-mt-4 wa-space-y-4 wa-max-h-64 wa-overflow-y-auto wa-pr-4">
                  {ASSESSMENT_QUESTIONS.map((q) => {
                    const v = assessmentAnswers?.[String(q.id)];
                    return (
                      <div key={q.id} className="wa-border-b wa-border-[var(--outline-variant)] wa-pb-2">
                        <p className="wa-text-xs wa-font-bold wa-mb-1">Q{q.id}: {q.question}</p>
                        <p className="wa-text-sm wa-text-[var(--color-accent)] wa-font-medium">{v ? String(v) : '—'}</p>
                      </div>
                    );
                  })}
                </div>
              </details>
            </section>
          )}
        </div>

        {/* Sidebar Column */}
        <div className="wa-flex wa-flex-col wa-gap-8">
          
          {/* Settings Section */}
          <section id="settings" className="portal-card wa-p-6">
            <h2 className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-widest wa-text-[var(--color-on-surface-variant)] wa-mb-6">Account Settings</h2>
            <div className="wa-space-y-6">
              <div>
                <h3 className="wa-text-xs wa-font-bold wa-mb-3">Notifications</h3>
                <SettingsForm
                  defaultUpdates={dbUser.notificationsUpdates ?? true}
                  defaultReminders={dbUser.notificationsReminders ?? true}
                />
              </div>
              <div className="wa-pt-4 wa-border-t wa-border-[var(--outline-variant)]">
                <h3 className="wa-text-xs wa-font-bold wa-mb-3">Security</h3>
                <div className="wa-flex wa-flex-col wa-gap-2">
                  <Link href={`/forgot-password?email=${encodeURIComponent(dbUser.email)}`} className="btn btn-outline btn-sm wa-w-full">Reset Password</Link>
                  <StartTourButton />
                </div>
              </div>
              <div className="wa-pt-4 wa-border-t wa-border-[var(--outline-variant)]">
                <h3 className="wa-text-xs wa-font-bold wa-text-red-600 wa-mb-3">Danger Zone</h3>
                <DeleteAccountButton />
              </div>
            </div>
          </section>

          {/* Program Quick View */}
          {program && (
            <section className="portal-card wa-p-6">
              <h2 className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-widest wa-text-[var(--color-on-surface-variant)] wa-mb-4">Enrolled Program</h2>
              <p className="wa-text-sm wa-font-bold wa-mb-1">{program.title}</p>
              <Link href="/dashboard/program" className="wa-text-xs wa-font-bold wa-text-[var(--color-accent)]">View details →</Link>
            </section>
          )}
        </div>
      </div>

      <MobileBottomNav variant="portal" />
    </div>
  );
}
