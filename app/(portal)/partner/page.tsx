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
  description: 'Referral tracking and member progress for your organization.',
  path: '/partner',
});

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
          take: 10,
          include: { user: { select: { fullName: true } } },
        });

  let completions = 0;
  let placements = 0;
  let active = 0;

  for (const m of members) {
    if (m.placementRecord) placements++;
    else active++;

    const program = m.enrolledProgram ? getProgramBySlug(m.enrolledProgram) : null;
    const done = (m.coursesCompleted as string[] | null) ?? [];
    if (program?.courses.length && program.courses.every((c) => done.includes(c.slug))) {
      completions++;
    }
  }

  const total = members.length;

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Partner dashboard</h1>
      <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem' }}>
        Members referred by {ctx.partner.name}. Progress updates are scoped to your organization.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {[
          { label: 'Total members', value: total },
          { label: 'Active (not placed)', value: active },
          { label: 'Program completions', value: completions },
          { label: 'Placements', value: placements },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-light)',
            }}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>Members</h2>
      <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Program</th>
              <th>Progress</th>
              <th>Last active</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const program = m.enrolledProgram ? getProgramBySlug(m.enrolledProgram) : null;
              const pct = memberProgramProgressPct(m.enrolledProgram, m.coursesCompleted);
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
              return (
                <tr key={m.id}>
                  <td>
                    <Link href={`/partner/members/${m.id}`} style={{ fontWeight: 600, color: 'var(--color-accent)' }}>
                      {m.fullName}
                    </Link>
                  </td>
                  <td>{program?.title ?? '—'}</td>
                  <td>{pct}%</td>
                  <td>{m.updatedAt.toLocaleDateString()}</td>
                  <td>{PIPELINE_STAGE_LABELS[stage]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {members.length === 0 && (
        <p style={{ color: 'var(--color-gray-500)', marginBottom: '2rem' }}>No referred members yet.</p>
      )}

      <h2 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>Recent activity</h2>
      {events.length === 0 ? (
        <p style={{ color: 'var(--color-gray-500)' }}>No milestone events recorded yet for your members.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {events.map((ev) => (
            <li
              key={ev.id}
              style={{
                padding: '0.65rem 0',
                borderBottom: '1px solid var(--color-border)',
                fontSize: '0.9rem',
              }}
            >
              <strong>{ev.user.fullName}</strong>
              <span style={{ color: 'var(--color-gray-500)' }}> · {ev.eventName}</span>
              {ev.metadata && typeof ev.metadata === 'object' && ev.metadata !== null && 'label' in ev.metadata && (
                <span style={{ color: 'var(--color-gray-600)' }}> — {String((ev.metadata as { label?: string }).label)}</span>
              )}
              <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>
                {ev.createdAt.toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
