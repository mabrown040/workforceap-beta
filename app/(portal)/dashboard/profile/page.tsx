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

  type DashboardProfileUser = Prisma.UserGetPayload<{ select: typeof userSelect }>;
  type DashboardProfileUserFallback = Omit<DashboardProfileUser, 'profile'> & { profile: null };

  let dbUser: DashboardProfileUser | DashboardProfileUserFallback | null = null;

  try {
    dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: userSelect,
    });
  } catch (error) {
    console.error('[dashboard/profile] user+profile query failed, retrying without profile relation:', error);
    const fallbackUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
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
      },
    });
    dbUser = fallbackUser ? { ...fallbackUser, profile: null } : null;
  }

  if (!dbUser) redirect('/login');

  const nameParts = dbUser.fullName?.split(' ') ?? [];
  const firstName = nameParts[0] ?? '';
  const lastName = nameParts.slice(1).join(' ') ?? '';

  const program = dbUser.enrolledProgram ? getProgramBySlug(dbUser.enrolledProgram) : null;
  const rawAnswers = dbUser.assessmentAnswers;
  const assessmentAnswers =
    rawAnswers && typeof rawAnswers === 'object' && !Array.isArray(rawAnswers)
      ? (rawAnswers as Record<string, unknown>)
      : null;

  const initials = dbUser.fullName
    ? dbUser.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  /* Profile completion: count non-empty fields */
  const profileFields = [
    dbUser.fullName,
    dbUser.email,
    dbUser.profile?.profilePhone ?? dbUser.phone,
    dbUser.profile?.profileAddress,
    dbUser.profile?.profileLinkedin,
    dbUser.profile?.profileBio,
    dbUser.enrolledProgram,
    dbUser.assessmentCompleted ? 'done' : '',
  ];
  const filledFields = profileFields.filter(Boolean).length;
  const profilePct = Math.round((filledFields / profileFields.length) * 100);
  const completeness = getProfileCompleteness(dbUser.profile, dbUser);
  const witData = {
    name: dbUser.fullName ?? '',
    email: dbUser.email,
    phone: dbUser.phone ?? dbUser.profile?.profilePhone ?? '',
    recentEmployer: '—',
    targetJob: program?.title ?? dbUser.enrolledProgram ?? 'Target role',
    skills: program?.skills?.join(', ') ?? '—',
  };
  const hasEnhanced = !!dbUser.profile?.resumeEnhancedPath;
  const hasOriginal = !!dbUser.profile?.resumeOriginalPath;

  return (
    <>
      {/* ── Mobile profile view (≤640px) ── */}
      <div className="md:wa-hidden wa-pb-24">
        {/* Profile hero section */}
        <section className="wa-pt-6 wa-pb-4 wa-text-center wa-px-6">
          <div className="wa-flex wa-flex-col wa-items-center">
            {/* Avatar */}
            <div
              className="wa-w-24 wa-h-24 wa-rounded-full wa-flex wa-items-center wa-justify-center wa-text-3xl wa-font-bold wa-mb-4 wa-shadow-sm"
              style={{ background: 'var(--color-accent)', color: 'var(--color-white)' }}
            >
              {initials}
            </div>
            {/* Identity */}
            <h2
              className="wa-text-2xl wa-font-extrabold wa-tracking-tight wa-mb-1"
              style={{ color: 'var(--color-on-surface)' }}
            >
              {dbUser.fullName ?? 'Your Name'}
            </h2>
            <div
              className="wa-inline-flex wa-items-center wa-px-3 wa-py-1 wa-rounded-full wa-text-[10px] wa-font-bold wa-uppercase wa-tracking-wider wa-mb-2"
              style={{
                background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
                color: 'var(--color-accent)',
              }}
            >
              {program?.title ?? 'WorkforceAP Member'}
            </div>
            <p className="wa-text-sm wa-font-medium" style={{ color: 'var(--color-on-surface-variant)' }}>
              {dbUser.createdAt
                ? `Member since ${new Date(dbUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
                : 'WorkforceAP Member'}
            </p>
          </div>
        </section>

        {/* Completion meter */}
        <div className="wa-mx-6 wa-mb-5">
          <PortalCard
            className="portal-card--flat"
            title={`Profile ${profilePct}% complete`}
            action={<span className="wa-text-xs wa-font-bold" style={{ color: 'var(--color-accent)' }}>Fill in missing info</span>}
          >
            <div
              className="wa-h-1.5 wa-w-full wa-rounded-full wa-overflow-hidden"
              style={{ background: 'color-mix(in srgb, var(--outline-variant) 55%, transparent)' }}
            >
              <div
                className="wa-h-full wa-rounded-full wa-transition-all"
                style={{ width: `${profilePct}%`, background: 'var(--color-accent-dark)' }}
              />
            </div>
          </PortalCard>
        </div>

        {/* Personal info card */}
        <div className="wa-mx-6 wa-mb-4 wa-bg-[#fcf9f8] wa-p-5 wa-rounded-xl wa-border border-[#debfc2]/30">
          <div className="wa-flex wa-justify-between wa-items-start wa-mb-4">
            <h3 className="wa-text-[11px] wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-[#584144]">Personal Info</h3>
            <Link href="/dashboard/settings" className="wa-text-[#8c0f37] wa-p-1 active:wa-scale-90 wa-duration-200" aria-label="Edit personal info">
              <span className="material-symbols-outlined wa-text-[20px]" aria-hidden="true">edit</span>
            </Link>
          </div>
          <div className="wa-space-y-3">
            <div>
              <p className="wa-text-[10px] wa-text-[#584144] wa-font-medium wa-uppercase wa-tracking-wider wa-mb-0.5">Full Name</p>
              <p className="wa-text-sm wa-font-semibold wa-text-[#1c1b1b]">{dbUser.fullName ?? '—'}</p>
            </div>
            <div>
              <p className="wa-text-[10px] wa-text-[#584144] wa-font-medium wa-uppercase wa-tracking-wider wa-mb-0.5">Email</p>
              <p className="wa-text-sm wa-font-semibold wa-text-[#1c1b1b]">{dbUser.email}</p>
            </div>
            <div>
              <p className="wa-text-[10px] wa-text-[#584144] wa-font-medium wa-uppercase wa-tracking-wider wa-mb-0.5">Phone</p>
              <p className="wa-text-sm wa-font-semibold wa-text-[#1c1b1b]">{dbUser.profile?.profilePhone ?? dbUser.phone ?? '—'}</p>
            </div>
            <div>
              <p className="wa-text-[10px] wa-text-[#584144] wa-font-medium wa-uppercase wa-tracking-wider wa-mb-0.5">Location</p>
              <p className="wa-text-sm wa-font-semibold wa-text-[#1c1b1b]">
                {dbUser.profile?.profileAddress ?? '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Program info card */}
        {program && (
          <div className="wa-mx-6 wa-mb-4 wa-bg-[#fcf9f8] wa-p-5 wa-rounded-xl wa-border border-[#debfc2]/30">
            <h3 className="wa-text-[11px] wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-[#584144] wa-mb-3">Program</h3>
            <p className="wa-text-sm wa-font-semibold wa-text-[#1c1b1b]">{program.title}</p>
            {dbUser.enrolledAt && (
              <p className="wa-text-xs wa-text-[#584144] wa-mt-1">Enrolled {dbUser.enrolledAt.toLocaleDateString()}</p>
            )}
          </div>
        )}

        {/* Skills card */}
        {program && program.skills && program.skills.length > 0 && (
          <div className="wa-mx-6 wa-mb-4 wa-bg-[#fcf9f8] wa-p-5 wa-rounded-xl wa-border border-[#debfc2]/30">
            <div className="wa-flex wa-justify-between wa-items-start wa-mb-4">
              <h3 className="wa-text-[11px] wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-[#584144]">Skills</h3>
              <Link href="/dashboard/skills-assessment" className="wa-text-[#8c0f37] wa-p-1 active:wa-scale-90 wa-duration-200" aria-label="Edit skills">
                <span className="material-symbols-outlined wa-text-[20px]" aria-hidden="true">edit</span>
              </Link>
            </div>
            <div className="wa-flex wa-flex-wrap wa-gap-2">
              {program.skills.map((skill) => (
                <span
                  key={skill}
                  className="wa-px-3 wa-py-1.5 wa-text-[11px] wa-font-bold wa-rounded-full"
                  style={{ background: 'var(--outline-variant)', color: 'var(--color-on-surface)' }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Resume — link to dedicated page */}
        <div id="resume" className="wa-mx-6 wa-mb-4">
          <a
            href="/dashboard/resume"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              background: 'var(--surface-container-low)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--outline-variant)',
              color: 'var(--color-accent)',
              fontWeight: 600,
              fontSize: '0.875rem',
              textDecoration: 'none',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }} aria-hidden="true">description</span>
            Manage My Resume →
          </a>
        </div>

        {/* Voice coach + rewriter (Accept pushes into editor — same as desktop) */}
        <div className="wa-mx-6 wa-mb-4">
          <ResumeCoachWorkspace />
        </div>

        {/* Account + settings card */}
        <div id="settings" className="wa-mx-6 wa-mb-4 wa-bg-[#fcf9f8] wa-p-5 wa-rounded-xl wa-border border-[#debfc2]/30">
          <h3 className="wa-text-[11px] wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-[#584144] wa-mb-4">Account & Settings</h3>
          <div className="wa-space-y-4">
            <div>
              <p className="wa-text-[10px] wa-text-[#584144] wa-font-medium wa-uppercase wa-tracking-wider wa-mb-1">Notifications</p>
              <SettingsForm
                defaultUpdates={dbUser.notificationsUpdates ?? true}
                defaultReminders={dbUser.notificationsReminders ?? true}
              />
            </div>
            <div className="wa-flex wa-flex-wrap wa-gap-2 wa-pt-1">
              <Link href={`/forgot-password?email=${encodeURIComponent(dbUser.email)}`} className="btn btn-outline">
                Reset password
              </Link>
              <StartTourButton />
            </div>
            <div>
              <p className="wa-text-[10px] wa-text-[#584144] wa-font-medium wa-uppercase wa-tracking-wider wa-mb-1">Danger Zone</p>
              <DeleteAccountButton />
            </div>
          </div>
        </div>

        {/* Assessment card */}
        {dbUser.assessmentCompleted && (
          <div className="wa-mx-6 wa-mb-4 wa-bg-[#fcf9f8] wa-p-5 wa-rounded-xl wa-border border-[#debfc2]/30">
            <h3 className="wa-text-[11px] wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-[#584144] wa-mb-3">Assessment</h3>
            <p className="wa-text-sm wa-font-semibold wa-text-[#1c1b1b]">
              Score: {dbUser.assessmentScore ?? 0}/90 ({dbUser.assessmentScorePct ?? 0}%)
            </p>
            {dbUser.assessmentCompletedAt && (
              <p className="wa-text-xs wa-text-[#584144] wa-mt-1">
                Completed {dbUser.assessmentCompletedAt.toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Desktop profile view ── */}
      <div className="wa-hidden md:wa-block" style={{ paddingBottom: '2rem' }}>

        {/* Profile hero banner */}
        <div className="portal-profile-hero">
          <div className="portal-profile-avatar">{initials}</div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-on-surface)', margin: '0 0 0.375rem' }}>
              {dbUser.fullName ?? 'Your Profile'}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {program && (
                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0.2rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)', color: 'var(--color-accent)' }}>
                  {program.title}
                </span>
              )}
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
                {dbUser.createdAt
                  ? `Member since ${new Date(dbUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
                  : 'WorkforceAP Member'}
              </span>
            </div>
            {/* Profile completeness bar */}
            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="portal-progress-bar" style={{ width: '180px' }}>
                <div className="portal-progress-bar__fill" style={{ width: `${profilePct}%` }} />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>
                {profilePct}% complete
              </span>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', flexShrink: 0, alignSelf: 'flex-start' }}>
            <a href="#profile" className="btn btn-outline" style={{ fontSize: '0.8125rem' }}>Edit Profile</a>
            <a href="#resume" className="btn btn-outline" style={{ fontSize: '0.8125rem' }}>Resume</a>
            <a href="#settings" className="btn btn-outline" style={{ fontSize: '0.8125rem' }}>Settings</a>
          </div>
        </div>

        {/* Contact info card */}
        <div id="profile" className="portal-profile-section-card">
          <div className="portal-profile-section-card__header">
            <h2 className="portal-profile-section-card__title">Contact Information</h2>
          </div>
          <div className="portal-profile-section-card__body">
            <DashboardProfileForm
              defaultFirstName={firstName}
              defaultLastName={lastName}
              defaultPhone={dbUser.profile?.profilePhone ?? dbUser.phone ?? ''}
              defaultAddress={dbUser.profile?.profileAddress ?? ''}
              defaultLinkedin={dbUser.profile?.profileLinkedin ?? ''}
              defaultBio={dbUser.profile?.profileBio ?? ''}
              defaultFinancialAidInterest={dbUser.profile?.financialAidInterest ?? null}
            />
          </div>
        </div>

        {/* Account + Program cards side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: program ? '1fr 1fr' : '1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div className="portal-profile-section-card">
            <div className="portal-profile-section-card__header">
              <h2 className="portal-profile-section-card__title">Account</h2>
            </div>
            <div className="portal-profile-section-card__body">
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <div>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)', marginBottom: '0.25rem' }}>Email</p>
                  <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-on-surface)', margin: 0 }}>{dbUser.email}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: '0.25rem 0 0' }}>Cannot be changed here</p>
                </div>
              </div>
            </div>
          </div>

          {program && (
            <div className="portal-profile-section-card">
              <div className="portal-profile-section-card__header">
                <h2 className="portal-profile-section-card__title">Enrolled Program</h2>
                <Link href="/dashboard/program" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)', textDecoration: 'none' }}>View →</Link>
              </div>
              <div className="portal-profile-section-card__body">
                <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-on-surface)', margin: '0 0 0.375rem' }}>{program.title}</p>
                {dbUser.enrolledAt && (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', margin: 0 }}>
                    Enrolled {dbUser.enrolledAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Assessment card */}
        {dbUser.assessmentCompleted && (
          <div className="portal-profile-section-card" style={{ marginBottom: '1rem' }}>
            <div className="portal-profile-section-card__header">
              <h2 className="portal-profile-section-card__title">Skills Assessment</h2>
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0.2rem 0.625rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 700, background: 'color-mix(in srgb, var(--color-green) 10%, transparent)', color: 'var(--color-green)' }}>
                Complete
              </span>
            </div>
            <div className="portal-profile-section-card__body">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)', marginBottom: '0.375rem' }}>Score</p>
                  <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-accent)', letterSpacing: '-0.04em', margin: 0, lineHeight: 1 }}>
                    {dbUser.assessmentScorePct ?? 0}<span style={{ fontSize: '1rem' }}>%</span>
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: '0.25rem 0 0' }}>
                    {dbUser.assessmentScore ?? 0}/90 points
                  </p>
                </div>
                {dbUser.assessmentCompletedAt && (
                  <div>
                    <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)', marginBottom: '0.375rem' }}>Completed</p>
                    <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-on-surface)', margin: 0 }}>
                      {dbUser.assessmentCompletedAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                )}
              </div>
              <details style={{ marginTop: '1rem' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>View Assessment Answers</summary>
                {assessmentAnswers && (
                  <ul style={{ marginTop: '1rem', paddingLeft: '1.25rem', fontSize: '0.875rem' }}>
                    {ASSESSMENT_QUESTIONS.map((q) => {
                      const v = assessmentAnswers[String(q.id)] ?? assessmentAnswers[q.id as unknown as string];
                      const text = v == null ? '—' : typeof v === 'string' ? v : JSON.stringify(v);
                      return (
                        <li key={q.id} style={{ marginBottom: '0.5rem', color: 'var(--color-on-surface-variant)' }}>
                          <strong style={{ color: 'var(--color-on-surface)' }}>Q{q.id}:</strong> {q.question} → {text}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </details>
            </div>
          </div>
        )}

        {/* Resume tools card */}
        <div id="resume" className="portal-profile-section-card" style={{ marginBottom: '1rem' }}>
          <div className="portal-profile-section-card__header">
            <h2 className="portal-profile-section-card__title">Resume &amp; AI Toolkit</h2>
          </div>
          <div className="portal-profile-section-card__body">
            <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              Upload, generate, and improve your resume without leaving your profile.
            </p>
            <ResumeClient
              completeness={completeness}
              witData={witData}
              hasOriginal={hasOriginal}
              hasEnhanced={hasEnhanced}
            />
            <ResumeCoachWorkspace />
          </div>
        </div>

        {/* Settings card */}
        <div id="settings" className="portal-profile-section-card">
          <div className="portal-profile-section-card__header">
            <h2 className="portal-profile-section-card__title">Account Settings</h2>
          </div>
          <div className="portal-profile-section-card__body">
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <section>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '0.75rem' }}>Email Notifications</h3>
                <SettingsForm
                  defaultUpdates={dbUser.notificationsUpdates ?? true}
                  defaultReminders={dbUser.notificationsReminders ?? true}
                />
              </section>
              <section>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '0.75rem' }}>Password &amp; Security</h3>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <Link href={`/forgot-password?email=${encodeURIComponent(dbUser.email)}`} className="btn btn-outline">
                    Reset password
                  </Link>
                  <StartTourButton />
                </div>
              </section>
              <section>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-error, #c00)', marginBottom: '0.75rem' }}>Danger Zone</h3>
                <DeleteAccountButton />
              </section>
            </div>
          </div>
        </div>
      </div> {/* end hidden md:block */}

      <MobileBottomNav variant="portal" />
    </>
  );
}
