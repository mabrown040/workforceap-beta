import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';
import { memberTrainingProfileComplete } from '@/lib/platform/trainingEnrollmentGate';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { ASSESSMENT_QUESTIONS } from '@/lib/assessment/answer-key';
import MemberDetailActions from '@/components/admin/MemberDetailActions';
import MemberPartnerSection from '@/components/admin/MemberPartnerSection';
import MemberSubgroupSection from '@/components/admin/MemberSubgroupSection';
import AdminMemberCounselorChatClient from '@/components/admin/AdminMemberCounselorChatClient';
import AdminMemberCounselorAssign from '@/components/admin/AdminMemberCounselorAssign';
import AdminMemberPlacedOutcomeForm from '@/components/admin/AdminMemberPlacedOutcomeForm';
import AdminMemberEnrollmentFundingForm from '@/components/admin/AdminMemberEnrollmentFundingForm';
import CreateSuccessToast from './CreateSuccessToast';
import { formatPhone } from '@/lib/formatPhone';
import { getOrCreateMemberCounselorThread, serializeMessage } from '@/lib/messages/counselorThread';
import { ClipboardList, CheckCircle } from 'lucide-react';
import PageHeader from '@/components/portal/PageHeader';
import '@/css/counselor.css';

const BUCKET = 'member-resumes';

async function getResumeUrls(originalPath: string | null, enhancedPath: string | null) {
  if (!originalPath && !enhancedPath) return { originalUrl: null, enhancedUrl: null };
  const supabase = getSupabaseAdmin();
  const [originalUrl, enhancedUrl] = await Promise.all([
    originalPath
      ? supabase.storage
          .from(BUCKET)
          .createSignedUrl(originalPath, 3600)
          .then((r) => r.data?.signedUrl ?? null)
      : Promise.resolve(null),
    enhancedPath
      ? supabase.storage
          .from(BUCKET)
          .createSignedUrl(enhancedPath, 3600)
          .then((r) => r.data?.signedUrl ?? null)
      : Promise.resolve(null),
  ]);
  return { originalUrl, enhancedUrl };
}

export const metadata: Metadata = buildPageMetadata({
  title: 'Member Detail',
  description: 'View and manage member.',
  path: '/admin/members',
});

export default async function AdminMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/members');

  const hasAdmin = await isAdmin(user.id);
  if (!hasAdmin) redirect('/dashboard');

  const { id } = await params;

  const [member, partners, partnerReferral, subgroups, memberSubgroups, counselorRows, activeCounselorAssign, placedOutcomeRow, courseEnrollment] =
    await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    }),
    prisma.partner.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.partnerReferral.findFirst({
      where: { memberId: id },
      select: { partnerId: true },
    }),
    prisma.subgroup.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, type: true },
    }),
    prisma.memberSubgroup.findMany({
      where: { memberId: id },
      select: { subgroupId: true },
    }),
    prisma.counselor.findMany({
      where: { active: true },
      orderBy: [{ partner: { name: 'asc' } }, { user: { fullName: 'asc' } }],
      include: {
        user: { select: { fullName: true } },
        partner: { select: { name: true } },
      },
    }),
    prisma.counselorAssignment.findFirst({
      where: { memberId: id, active: true },
      include: { counselor: { select: { userId: true, user: { select: { fullName: true } } } } },
    }),
    prisma.placedOutcome.findUnique({ where: { userId: id } }),
    prisma.courseEnrollment.findUnique({
      where: { userId: id },
      select: {
        fundingSource: true,
        fundingNotes: true,
        workspaceEmail: true,
        workspaceEmailProvisioned: true,
      },
    }),
  ]);

  if (!member || member.deletedAt) notFound();

  const preScreening = await prisma.preScreeningResponse.findUnique({
    where: { userId: member.id },
  });

  const organizationId = await getDefaultOrganizationId();
  const catalogPrograms = await prisma.organizationProgramCatalog.findMany({
    where: { organizationId },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    select: { programSlug: true, name: true, status: true },
  });
  const programOptions =
    catalogPrograms.length > 0
      ? catalogPrograms.map((r) => ({ slug: r.programSlug, name: r.name, status: r.status }))
      : null;

  const gate = memberTrainingProfileComplete({
    phone: member.phone,
    profilePhone: member.profile?.profilePhone,
    profileAddress: member.profile?.profileAddress,
    financialAidInterest: member.profile?.financialAidInterest,
  });
  const profileIncomplete = !gate.ok;

  const program = member.enrolledProgram ? getProgramBySlug(member.enrolledProgram) : null;
  const coursesCompleted = (member.coursesCompleted as string[] | null) ?? [];
  const completedCount = program ? coursesCompleted.filter((s) => program.courses.some((c) => c.slug === s)).length : 0;
  const assessmentAnswers = member.assessmentAnswers as Record<number, string> | null;
  const { originalUrl, enhancedUrl } = await getResumeUrls(
    member.profile?.resumeOriginalPath ?? null,
    member.profile?.resumeEnhancedPath ?? null
  );

  const chatThread = await getOrCreateMemberCounselorThread(member.id);
  const chatMsgs = await prisma.message.findMany({
    where: { threadId: chatThread.id },
    orderBy: { createdAt: 'asc' },
  });
  const chatAuthorIds = [...new Set(chatMsgs.map((m) => m.authorId))];
  const chatAuthors =
    chatAuthorIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: chatAuthorIds } },
          select: { id: true, fullName: true },
        })
      : [];
  const chatNameById = new Map(chatAuthors.map((n) => [n.id, n.fullName]));

  const counselorChatInitial = {
    staffUserId: user.id,
    member: { id: member.id, fullName: member.fullName },
    thread: {
      id: chatThread.id,
      memberId: chatThread.memberId,
      counselorUserId: chatThread.counselorUserId,
      memberLastReadAt: chatThread.memberLastReadAt?.toISOString() ?? null,
      counselorLastReadAt: chatThread.counselorLastReadAt?.toISOString() ?? null,
    },
    messages: chatMsgs.map((m) => ({
      ...serializeMessage(m),
      authorName: chatNameById.get(m.authorId) ?? 'User',
    })),
  };

  return (
    <div>
      <Suspense fallback={null}>
        <CreateSuccessToast />
      </Suspense>
      <PageHeader
        title={member.fullName}
        subtitle={member.email}
        action={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Link href={`/admin/members/${id}/readiness`} className="btn btn-outline">
              <ClipboardList size={18} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} />
              Readiness
            </Link>
            <Link href="/admin/members" className="btn btn-outline">← Back to Members</Link>
          </div>
        }
      />

      <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '800px' }}>
        <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Profile</h2>
          <p><strong>Phone:</strong> {formatPhone(member.phone ?? member.profile?.profilePhone)}</p>
          <p><strong>Address:</strong> {member.profile?.profileAddress ?? member.profile?.address ?? '—'}</p>
          <p>
            <strong>Financial aid interest:</strong>{' '}
            {member.profile?.financialAidInterest === true
              ? 'Yes'
              : member.profile?.financialAidInterest === false
                ? 'No'
                : '—'}
          </p>
          <p><strong>LinkedIn:</strong> {member.profile?.profileLinkedin ? <a href={member.profile.profileLinkedin} target="_blank" rel="noopener noreferrer">{member.profile.profileLinkedin}</a> : '—'}</p>
          <p><strong>Bio:</strong> {member.profile?.profileBio ?? '—'}</p>
        </section>

        {preScreening && (
          <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Pre-screening</h2>
            <p><strong>Employment:</strong> {preScreening.employmentStatus}</p>
            <p><strong>Primary goal:</strong> {preScreening.primaryGoal}</p>
            <p><strong>Weekly hours:</strong> {preScreening.weeklyHours}</p>
            <p><strong>Barrier:</strong> {preScreening.barrier}</p>
            <p><strong>Heard about us:</strong> {preScreening.hearAbout}{preScreening.hearAboutOther ? ` — ${preScreening.hearAboutOther}` : ''}</p>
            <p><strong>Workforce assistance:</strong> {preScreening.workforceAssistance ? 'Yes' : 'No'}</p>
            <p><strong>Submitted:</strong> {preScreening.createdAt.toLocaleString()}</p>
            <p><strong>Interview eligible:</strong> {member.interviewEligible ? 'Yes' : 'No'}</p>
            {member.interviewRequestedAt && (
              <p><strong>Interview requested:</strong> {member.interviewRequestedAt.toLocaleString()}</p>
            )}
            {member.interviewCompletedAt && (
              <p><strong>Interview completed:</strong> {member.interviewCompletedAt.toLocaleString()}</p>
            )}
          </section>
        )}

        <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Program</h2>
          <p><strong>Enrolled:</strong> {program?.title ?? member.enrolledProgram ?? '—'}</p>
          <p><strong>Enrolled date:</strong> {member.enrolledAt?.toLocaleDateString() ?? '—'}</p>
          <p><strong>Course progress:</strong> {completedCount} of {program?.courses.length ?? 0} complete</p>
          <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', listStyle: 'none' }}>
            {program?.courses.map((c) => (
              <li key={c.slug} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                {coursesCompleted.includes(c.slug) ? <CheckCircle size={18} style={{ color: 'var(--color-green)', flexShrink: 0 }} /> : <span style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid var(--outline-variant)', borderRadius: 4, flexShrink: 0 }} />}
                {c.name}
              </li>
            ))}
          </ul>
          <MemberDetailActions
            userId={member.id}
            memberName={member.fullName}
            profileIncomplete={profileIncomplete}
            currentProgramSlug={member.enrolledProgram}
            assessmentCompleted={member.assessmentCompleted}
            programOptions={programOptions ?? []}
          />
        </section>

        <MemberPartnerSection
          memberId={member.id}
          partners={partners}
          currentPartnerId={partnerReferral?.partnerId ?? null}
        />

        <MemberSubgroupSection
          memberId={member.id}
          subgroups={subgroups}
          currentSubgroupIds={memberSubgroups.map((ms) => ms.subgroupId)}
        />

        <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Counselor assignment</h2>
          {activeCounselorAssign?.counselor ? (
            <p style={{ marginBottom: '0.75rem', fontSize: '0.95rem' }}>
              Current: <strong>{activeCounselorAssign.counselor.user.fullName}</strong>
            </p>
          ) : (
            <p style={{ marginBottom: '0.75rem', fontSize: '0.95rem', color: 'var(--color-on-surface-variant)' }}>
              No active counselor assignment.
            </p>
          )}
          <AdminMemberCounselorAssign
            memberId={member.id}
            counselors={counselorRows.map((c) => ({
              userId: c.userId,
              fullName: c.user.fullName,
              partnerName: c.partner?.name ?? 'WorkforceAP',
            }))}
            currentCounselorUserId={activeCounselorAssign?.counselor.userId ?? null}
          />
        </section>

        <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>WorkforceAP placement (grants)</h2>
          <AdminMemberPlacedOutcomeForm
            memberId={member.id}
            initial={
              placedOutcomeRow
                ? {
                    employerName: placedOutcomeRow.employerName,
                    jobTitle: placedOutcomeRow.jobTitle,
                    startingSalary: placedOutcomeRow.startingSalary,
                    placedAt: placedOutcomeRow.placedAt.toISOString(),
                    programSlug: placedOutcomeRow.programSlug,
                    notes: placedOutcomeRow.notes,
                  }
                : null
            }
          />
        </section>

        <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Enrollment funding &amp; workspace</h2>
          {!courseEnrollment && (
            <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}>
              Member is not currently enrolled in a program. Enrollment must be created first.
            </p>
          )}
          <AdminMemberEnrollmentFundingForm
            memberId={member.id}
            initial={
              courseEnrollment
                ? {
                    fundingSource: courseEnrollment.fundingSource,
                    fundingNotes: courseEnrollment.fundingNotes,
                    workspaceEmail: courseEnrollment.workspaceEmail ?? member.workspaceEmail ?? null,
                    workspaceEmailProvisioned:
                      courseEnrollment.workspaceEmailProvisioned || member.workspaceEmailProvisioned,
                  }
                : {
                    fundingSource: null,
                    fundingNotes: null,
                    workspaceEmail: member.workspaceEmail ?? null,
                    workspaceEmailProvisioned: member.workspaceEmailProvisioned,
                  }
            }
          />
        </section>

        <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Counselor chat</h2>
          <AdminMemberCounselorChatClient initial={counselorChatInitial} />
        </section>

        {(member.profile?.resumeOriginalPath || member.profile?.resumeEnhancedPath) && (
          <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Resumes</h2>
            {member.profile?.resumeOriginalPath && (
              <p style={{ marginBottom: '0.5rem' }}>
                <strong>Original:</strong>{' '}
                {originalUrl ? <a href={originalUrl} target="_blank" rel="noopener noreferrer">View</a> : '—'}{' '}
                {originalUrl ? <a href={originalUrl} download>Download</a> : ''}
              </p>
            )}
            {member.profile?.resumeEnhancedPath && (
              <p>
                <strong>Enhanced:</strong>{' '}
                {enhancedUrl ? <a href={enhancedUrl} target="_blank" rel="noopener noreferrer">View</a> : '—'}{' '}
                {enhancedUrl ? <a href={enhancedUrl} download>Download</a> : ''}
              </p>
            )}
          </section>
        )}

        {member.assessmentCompleted && (
          <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Assessment</h2>
            <p><strong>Score:</strong> {member.assessmentScore ?? 0}/90 ({member.assessmentScorePct ?? 0}%)</p>
            <p><strong>Date:</strong> {member.assessmentCompletedAt?.toLocaleDateString() ?? '—'}</p>
            <p><strong>Program interest:</strong> {member.programInterest ?? '—'}</p>
            <details style={{ marginTop: '0.75rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Full Q&A</summary>
              {assessmentAnswers && (
                <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', fontSize: '0.9rem' }}>
                  {ASSESSMENT_QUESTIONS.map((q) => (
                    <li key={q.id}>Q{q.id}: {q.question} → {assessmentAnswers[q.id] ?? '—'}</li>
                  ))}
                </ul>
              )}
            </details>
          </section>
        )}
      </div>
    </div>
  );
}
