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
      <div className="wa-md:hidden" style={{ paddingBottom: "6rem" }}>
        {/* Profile hero section */}
        <section className="text-center" style={{ padding: '1.5rem 1.5rem 1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Avatar */}
            <div style={{ width: '6rem', height: '6rem', borderRadius: '9999px', background: '#ad2c4d', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.875rem', fontWeight: 700, marginBottom: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              {initials}
            </div>
            {/* Identity */}
            <h2 className="text-2xl font-extrabold tracking-tight text-[#1c1b1b] mb-1">{dbUser.fullName ?? 'Your Name'}</h2>
            <div style={{ display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.75rem', borderRadius: '9999px', background: 'rgba(255,187,0,0.2)', color: '#7b5800', fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
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
        <section style={{ margin: '0 1.5rem 1.25rem', background: '#f2eeed', padding: '1.25rem', borderRadius: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
            <p className="text-[#1c1b1b] font-semibold text-sm tracking-tight">Profile {profilePct}% complete</p>
            <span className="text-[#8c0f37] text-xs font-bold">Fill in missing info</span>
          </div>
          <div style={{ height: '0.375rem', width: '100%', background: '#debfc2', borderRadius: '9999px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#8c0f37', borderRadius: '9999px', transition: 'width 0.3s', width: `${profilePct}%` }} />
          </div>
        </section>

        {/* Personal info card */}
        <div style={{ margin: '0 1.5rem 1rem', background: '#fcf9f8', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(222,191,194,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#584144]">Personal Info</h3>
            <button className="text-[#8c0f37] active:scale-90 duration-200" style={{ padding: '0.25rem' }}>
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
          <div style={{ margin: '0 1.5rem 1rem', background: '#fcf9f8', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(222,191,194,0.3)' }}>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#584144] mb-3">Program</h3>
            <p className="text-sm font-semibold text-[#1c1b1b]">{program.title}</p>
            {dbUser.enrolledAt && (
              <p className="text-xs text-[#584144] mt-1">Enrolled {dbUser.enrolledAt.toLocaleDateString()}</p>
            )}
          </div>
        )}

        {/* Skills card */}
        {program && program.skills && program.skills.length > 0 && (
          <div style={{ margin: '0 1.5rem 1rem', background: '#fcf9f8', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(222,191,194,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#584144]">Skills</h3>
              <button className="text-[#8c0f37] active:scale-90 duration-200" style={{ padding: '0.25rem' }}>
                <span className="material-symbols-outlined text-[20px]">edit</span>
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {program.skills.map((skill) => (
                <span
                  key={skill}
                  className="text-[11px] font-bold"
                  style={{ padding: '0.375rem 0.75rem', borderRadius: '9999px', background: '#ebe7e7', color: '#1c1b1b' }}
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
          <div style={{ margin: '0 1.5rem 1rem', background: '#fcf9f8', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(222,191,194,0.3)' }}>
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
      <div className="wa-hidden wa-md:block">
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
      </div> {/* end hidden md:block */}

      <MobileBottomNav variant="portal" />
    </>
  );
}
