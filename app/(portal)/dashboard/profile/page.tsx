import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { ASSESSMENT_QUESTIONS } from '@/lib/assessment/answer-key';
import DashboardProfileForm from '@/components/portal/DashboardProfileForm';
import MobileBottomNav from '@/components/MobileBottomNav';
import MobileProfileSkillsResume from '@/components/portal/MobileProfileSkillsResume';

export const metadata: Metadata = buildPageMetadata({
  title: 'My Profile',
  description: 'View and edit your profile.',
  path: '/dashboard/profile',
});

export default async function DashboardProfilePage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/profile');

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { profile: true },
  });

  if (!dbUser) redirect('/login');

  const nameParts = dbUser.fullName?.split(' ') ?? [];
  const firstName = nameParts[0] ?? '';
  const lastName = nameParts.slice(1).join(' ') ?? '';

  const program = dbUser.enrolledProgram ? getProgramBySlug(dbUser.enrolledProgram) : null;
  const assessmentAnswers = dbUser.assessmentAnswers as Record<number, string> | null;

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

  return (
    <>
      {/* ── Mobile profile view (≤640px) ── */}
      <div className="md:wa-hidden wa-pb-24">
        {/* Profile hero section */}
        <section className="pt-6 pb-4 text-center px-6">
          <div className="flex flex-col items-center">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-[#ad2c4d] flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-sm">
              {initials}
            </div>
            {/* Identity */}
            <h2 className="text-2xl font-extrabold tracking-tight text-[#1c1b1b] mb-1">{dbUser.fullName ?? 'Your Name'}</h2>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#ffbb00]/20 text-[#7b5800] text-[10px] font-bold uppercase tracking-wider mb-2">
              {program?.title ?? 'WorkforceAP Member'}
            </div>
            <p className="text-[#584144] text-sm font-medium">
              {dbUser.createdAt
                ? `Member since ${new Date(dbUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
                : 'WorkforceAP Member'}
            </p>
          </div>
        </section>

        {/* Completion meter */}
        <section className="mx-6 mb-5 bg-[#f2eeed] p-5 rounded-xl">
          <div className="flex justify-between items-end mb-2">
            <p className="text-[#1c1b1b] font-semibold text-sm tracking-tight">Profile {profilePct}% complete</p>
            <span className="text-[#8c0f37] text-xs font-bold">Fill in missing info</span>
          </div>
          <div className="h-1.5 w-full bg-[#debfc2] rounded-full overflow-hidden">
            <div className="h-full bg-[#8c0f37] rounded-full transition-all" style={{ width: `${profilePct}%` }} />
          </div>
        </section>

        {/* Personal info card */}
        <div className="mx-6 mb-4 bg-[#fcf9f8] p-5 rounded-xl border border-[#debfc2]/30">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#584144]">Personal Info</h3>
            <button className="text-[#8c0f37] p-1 active:scale-90 duration-200">
              <span className="material-symbols-outlined text-[20px]">edit</span>
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-[#584144] font-medium uppercase tracking-wider mb-0.5">Full Name</p>
              <p className="text-sm font-semibold text-[#1c1b1b]">{dbUser.fullName ?? '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#584144] font-medium uppercase tracking-wider mb-0.5">Email</p>
              <p className="text-sm font-semibold text-[#1c1b1b]">{dbUser.email}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#584144] font-medium uppercase tracking-wider mb-0.5">Phone</p>
              <p className="text-sm font-semibold text-[#1c1b1b]">{dbUser.profile?.profilePhone ?? dbUser.phone ?? '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#584144] font-medium uppercase tracking-wider mb-0.5">Location</p>
              <p className="text-sm font-semibold text-[#1c1b1b]">
                {[dbUser.profile?.city, dbUser.profile?.state].filter(Boolean).join(', ') || (dbUser.profile?.profileAddress ?? '—')}
              </p>
            </div>
          </div>
        </div>

        {/* Program info card */}
        {program && (
          <div className="mx-6 mb-4 bg-[#fcf9f8] p-5 rounded-xl border border-[#debfc2]/30">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#584144] mb-3">Program</h3>
            <p className="text-sm font-semibold text-[#1c1b1b]">{program.title}</p>
            {dbUser.enrolledAt && (
              <p className="text-xs text-[#584144] mt-1">Enrolled {dbUser.enrolledAt.toLocaleDateString()}</p>
            )}
          </div>
        )}

        {/* Skills card */}
        {program && program.skills && program.skills.length > 0 && (
          <div className="mx-6 mb-4 bg-[#fcf9f8] p-5 rounded-xl border border-[#debfc2]/30">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#584144]">Skills</h3>
              <button className="text-[#8c0f37] p-1 active:scale-90 duration-200">
                <span className="material-symbols-outlined text-[20px]">edit</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {program.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1.5 text-[11px] font-bold rounded-full"
                  style={{ background: 'var(--outline-variant)', color: 'var(--color-on-surface)' }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Resume upload section */}
        <MobileProfileSkillsResume
          resumeOriginalPath={dbUser.profile?.resumeOriginalPath ?? null}
        />

        {/* Assessment card */}
        {dbUser.assessmentCompleted && (
          <div className="mx-6 mb-4 bg-[#fcf9f8] p-5 rounded-xl border border-[#debfc2]/30">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#584144] mb-3">Assessment</h3>
            <p className="text-sm font-semibold text-[#1c1b1b]">
              Score: {dbUser.assessmentScore ?? 0}/90 ({dbUser.assessmentScorePct ?? 0}%)
            </p>
            {dbUser.assessmentCompletedAt && (
              <p className="text-xs text-[#584144] mt-1">
                Completed {dbUser.assessmentCompletedAt.toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Desktop profile view ── */}
      <div className="wa-hidden md:wa-block">
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>My Profile</h1>
      <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem' }}>
        Manage your contact information and career goals.
      </p>

      <div className="dashboard-profile-section">
        <h3>Contact info</h3>
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

      <div className="dashboard-profile-section">
        <h3>Account</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', margin: 0 }}>
          <strong>Email:</strong> {dbUser.email} (tied to account, cannot be changed here)
        </p>
      </div>

      {dbUser.assessmentCompleted && (
        <div className="dashboard-profile-section">
          <h3>Assessment</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}>
            <strong>Assessment Score:</strong> {dbUser.assessmentScore ?? 0}/90 ({dbUser.assessmentScorePct ?? 0}%) — completed{' '}
            {dbUser.assessmentCompletedAt?.toLocaleDateString() ?? ''}
          </p>
          <details style={{ marginTop: '0.75rem', padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>View My Answers</summary>
            {assessmentAnswers && (
              <ul style={{ marginTop: '1rem', paddingLeft: '1.25rem', fontSize: '0.9rem' }}>
                {ASSESSMENT_QUESTIONS.map((q) => (
                  <li key={q.id} style={{ marginBottom: '0.5rem' }}>
                    Q{q.id}: {q.question} → {assessmentAnswers[q.id] ?? '—'}
                  </li>
                ))}
              </ul>
            )}
          </details>
        </div>
      )}

      {program && (
        <div className="dashboard-profile-section">
          <h3>Program</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', margin: 0 }}>
            <strong>Current Program:</strong>{' '}
            <Link href="/dashboard/program">{program.title}</Link>
            {dbUser.enrolledAt && ` — Enrolled ${dbUser.enrolledAt.toLocaleDateString()}`}
          </p>
        </div>
      )}
      </div> {/* end wa-hidden md:wa-block */}

      <MobileBottomNav variant="portal" />
    </>
  );
}
