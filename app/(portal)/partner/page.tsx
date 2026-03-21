import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { memberProgramProgressPct } from '@/lib/partner/memberProgress';
import { getPipelineStage, PIPELINE_STAGE_LABELS, type PipelineStudent } from '@/lib/pipeline/stage';

export const metadata: Metadata = buildPageMetadata({
  title: 'Partner Dashboard',
  description: 'Referral outcomes and member progress for your organization.',
  path: '/partner',
});

const JOURNEY_STAGES = ['applied', 'enrolled', 'in_training', 'certified', 'placed'] as const;

export default async function PartnerDashboardPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner');

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) redirect('/dashboard');

  const referrals = await prisma.partnerReferral.findMany({
    where: { partnerId: ctx.partnerId, member: { deletedAt: null } },
    include: {
      member: {
        select: {
          id: true,
          fullName: true,
          enrolledProgram: true,
          enrolledAt: true,
          coursesCompleted: true,
          updatedAt: true,
          deletedAt: true,
          assessmentCompleted: true,
          placementRecord: {
            select: { employerName: true, jobTitle: true, salaryOffered: true, placedAt: true },
          },
          userCertifications: { select: { certName: true, earnedAt: true } },
          applications: { select: { status: true, submittedAt: true } },
        },
      },
    },
    orderBy: { referredAt: 'desc' },
  });

  const members = referrals.map((r) => r.member);
  const memberIds = members.map((m) => m.id);

  const events =
    memberIds.length === 0
      ? []
      : await prisma.memberEvent.findMany({
          where: { userId: { in: memberIds } },
          orderBy: { createdAt: 'desc' },
          take: 15,
          include: { user: { select: { fullName: true } } },
        });

  const stageCounts: Record<string, number> = {};
  for (const s of JOURNEY_STAGES) {
    stageCounts[s] = 0;
  }

  const pipelineMembers: { member: (typeof members)[0]; stage: string; progress: number; programTitle: string }[] = [];

  for (const m of members) {
    const program = m.enrolledProgram ? getProgramBySlug(m.enrolledProgram) : null;
    const student: PipelineStudent = {
      id: m.id,
      fullName: m.fullName,
      email: '',
      enrolledProgram: m.enrolledProgram,
      enrolledAt: m.enrolledAt,
      assessmentCompleted: m.assessmentCompleted,
      coursesCompleted: m.coursesCompleted,
      deletedAt: m.deletedAt,
      placementRecord: m.placementRecord,
      userCertifications: m.userCertifications,
      applications: m.applications,
    };
    const stage = getPipelineStage(student);
    if (stage !== 'closed') {
      stageCounts[stage] = (stageCounts[stage] ?? 0) + 1;
    }
    pipelineMembers.push({
      member: m,
      stage,
      progress: memberProgramProgressPct(m.enrolledProgram, m.coursesCompleted),
      programTitle: program?.title ?? '—',
    });
  }

  const placements = members.filter((m) => m.placementRecord).length;
  const inTraining = pipelineMembers.filter((p) => p.stage === 'in_training' || p.stage === 'certified').length;
  const completions = pipelineMembers.filter((p) => {
    const program = p.member.enrolledProgram ? getProgramBySlug(p.member.enrolledProgram) : null;
    const done = (p.member.coursesCompleted as string[] | null) ?? [];
    return program?.courses.length && program.courses.every((c) => done.includes(c.slug));
  }).length;

  const total = members.length;

  const nextAction = total === 0
    ? { label: 'Share workforceap.org/apply with your community', href: '/partner/guide', tip: 'Ask applicants to list your organization when asked how they heard about us.' }
    : placements === 0 && inTraining > 0
      ? { label: `${inTraining} member${inTraining !== 1 ? 's' : ''} in training — encourage completion`, href: '/partner', tip: 'Check in with members who are close to finishing their program.' }
      : placements > 0
        ? { label: 'Celebrate placements, share more referrals', href: '/partner/guide', tip: 'Your referrals are landing jobs. Keep the pipeline full.' }
        : { label: 'Review member progress', href: '/partner', tip: 'Members are moving through the journey — track their outcomes.' };

  const nearCompletion = pipelineMembers.filter((p) => p.stage === 'in_training' && p.progress >= 70);

  return (
    <div className="partner-impact-console">
      <header className="partner-impact-header">
        <h1>Partnership impact</h1>
        <p className="partner-impact-subtitle">
          {ctx.partner.name} — referral outcomes and member journey.
        </p>
      </header>

      {total === 0 ? (
        <div className="partner-empty-state">
          <div className="partner-empty-icon">👋</div>
          <h2>No referred members yet</h2>
          <p>
            Direct applicants to <strong>workforceap.org/apply</strong> and ask them to list <strong>{ctx.partner.name}</strong> when asked how they heard about us. Referrals will appear here.
          </p>
          <Link href="/partner/guide" className="btn btn-primary">
            Referral guide
          </Link>
        </div>
      ) : (
        <>
          <section className="partner-impact-summary">
            <div className="partner-impact-hero">
              <div className="partner-impact-hero-main">
                <span className="partner-impact-hero-value">{placements}</span>
                <span className="partner-impact-hero-label">Placed</span>
              </div>
              <div className="partner-impact-hero-secondary">
                <span className="partner-impact-hero-value">{completions}</span>
                <span className="partner-impact-hero-label">Program completions</span>
              </div>
              <div className="partner-impact-hero-secondary">
                <span className="partner-impact-hero-value">{inTraining}</span>
                <span className="partner-impact-hero-label">In training</span>
              </div>
            </div>

            <div className="partner-journey-strip">
              <span className="partner-journey-label">Journey</span>
              <div className="partner-journey-stages">
                {JOURNEY_STAGES.map((s) => (
                  <div
                    key={s}
                    className={`partner-journey-stage ${stageCounts[s] > 0 ? 'has-count' : ''}`}
                    title={PIPELINE_STAGE_LABELS[s]}
                  >
                    <span className="partner-journey-stage-count">{stageCounts[s] ?? 0}</span>
                    <span className="partner-journey-stage-label">{PIPELINE_STAGE_LABELS[s]}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="partner-next-action">
            <h2>What to do next</h2>
            <div className="partner-next-action-card">
              <p className="partner-next-action-label">{nextAction.label}</p>
              <p className="partner-next-action-tip">{nextAction.tip}</p>
              <Link href={nextAction.href} className="btn btn-secondary btn-sm">
                {nextAction.href === '/partner/guide' ? 'View guide' : 'Review members'}
              </Link>
            </div>
          </section>

          {nearCompletion.length > 0 && (
            <section className="partner-momentum">
              <h2>Near completion</h2>
              <p className="partner-momentum-desc">
                {nearCompletion.length} member{nearCompletion.length !== 1 ? 's' : ''} at 70%+ — a check-in could help.
              </p>
              <div className="partner-momentum-list">
                {nearCompletion.slice(0, 5).map((p) => (
                  <Link key={p.member.id} href={`/partner/members/${p.member.id}`} className="partner-momentum-item">
                    <span className="partner-momentum-name">{p.member.fullName}</span>
                    <span className="partner-momentum-progress">{p.progress}% · {p.programTitle}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="partner-members">
            <h2>Members</h2>
            <div className="partner-members-list">
              {pipelineMembers.map(({ member: m, stage, progress, programTitle }) => {
                const stageLabel = PIPELINE_STAGE_LABELS[stage as keyof typeof PIPELINE_STAGE_LABELS];
                const story = m.placementRecord
                  ? `Placed at ${m.placementRecord.employerName} as ${m.placementRecord.jobTitle}`
                  : progress >= 100
                    ? `Completed ${programTitle}`
                    : progress > 0
                      ? `${progress}% through ${programTitle}`
                      : stage === 'enrolled'
                        ? `Enrolled in ${programTitle}`
                        : stageLabel;

                return (
                  <Link key={m.id} href={`/partner/members/${m.id}`} className="partner-member-card">
                    <div className="partner-member-main">
                      <span className="partner-member-name">{m.fullName}</span>
                      <span className="partner-member-story">{story}</span>
                    </div>
                    <div className="partner-member-meta">
                      <span className={`partner-member-stage stage-${stage}`}>{stageLabel}</span>
                      <span className="partner-member-date">{m.updatedAt.toLocaleDateString()}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="partner-activity">
            <details className="partner-activity-collapsed">
              <summary>Recent activity</summary>
              {events.length === 0 ? (
                <p className="partner-activity-empty">No milestone events yet.</p>
              ) : (
                <ul>
                  {events.map((ev) => (
                    <li key={ev.id}>
                      <strong>{ev.user.fullName}</strong>
                      <span> · {ev.eventName}</span>
                      {ev.metadata && typeof ev.metadata === 'object' && ev.metadata !== null && 'label' in ev.metadata && (
                        <span> — {String((ev.metadata as { label?: string }).label)}</span>
                      )}
                      <span className="partner-activity-date">{ev.createdAt.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </details>
          </section>
        </>
      )}
    </div>
  );
}
