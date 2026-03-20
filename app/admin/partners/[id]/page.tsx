import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { memberProgramProgressPct } from '@/lib/partner/memberProgress';
import { getPipelineStage, PIPELINE_STAGE_LABELS, type PipelineStudent } from '@/lib/pipeline/stage';
import InvitePartnerUserButton from '@/components/admin/InvitePartnerUserButton';
import PartnerDetailActions from '@/components/admin/PartnerDetailActions';

type Props = { params: Promise<{ id: string }> };

export default async function AdminPartnerDetailPage({ params }: Props) {
  const { id } = await params;

  const [partner, subgroups, allPartners] = await Promise.all([
    prisma.partner.findUnique({
      where: { id },
      include: {
      counselors: {
        include: { user: { select: { id: true, fullName: true, email: true } } },
        where: { active: true },
      },
      referrals: {
        where: { member: { deletedAt: null } },
        include: {
          member: {
            select: {
              id: true,
              fullName: true,
              email: true,
              enrolledProgram: true,
              enrolledAt: true,
              coursesCompleted: true,
              assessmentCompleted: true,
              deletedAt: true,
              placementRecord: {
                select: { employerName: true, jobTitle: true, salaryOffered: true, placedAt: true },
              },
              userCertifications: { select: { certName: true, earnedAt: true } },
              applications: { select: { status: true, submittedAt: true } },
            },
          },
        },
        orderBy: { referredAt: 'desc' },
      },
      _count: { select: { counselors: true, referrals: true } },
    },
  }),
    prisma.subgroup.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, type: true, partnerId: true },
    }),
    prisma.partner.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, active: true },
    }),
  ]);

  if (!partner) notFound();

  const members = partner.referrals.map((r) => r.member);
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

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <Link href="/admin/partners" style={{ color: 'var(--color-accent)', marginBottom: '1rem', display: 'inline-block' }}>
        &larr; Back to Partners
      </Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.25rem' }}>{partner.name}</h1>
          <p style={{ margin: 0, color: 'var(--color-gray-500)', fontSize: '0.9rem' }}>
            {partner._count.counselors} counselor{partner._count.counselors !== 1 ? 's' : ''} · {partner._count.referrals} referral
            {partner._count.referrals !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span
            style={{
              padding: '0.3rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              background: partner.active ? 'rgba(74, 155, 79, 0.12)' : 'var(--color-gray-100)',
              color: partner.active ? '#2d7a32' : 'var(--color-gray-600)',
            }}
          >
            {partner.active ? 'Active' : 'Inactive'}
          </span>
          <PartnerDetailActions partner={partner} subgroups={subgroups} allPartners={allPartners} />
        </div>
      </div>

      <section style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Invite partner user</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-600)', marginBottom: '0.75rem' }}>
          Sends an email invitation with a link to the partner portal ({partner.contactEmail ? 'milestone notifications go to ' + partner.contactEmail : 'add a contact email on the partner record for notifications'}).
        </p>
        <InvitePartnerUserButton partnerId={partner.id} />
      </section>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {[
          { label: 'Total referred', value: members.length },
          { label: 'Active (not placed)', value: active },
          { label: 'Completions', value: completions },
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <section>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Counselors ({partner.counselors.length})</h2>
          {partner.counselors.length === 0 ? (
            <p style={{ color: 'var(--color-gray-500)', fontSize: '0.9rem' }}>No counselors assigned yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {partner.counselors.map((c) => (
                <div key={c.id} style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                  <div style={{ fontWeight: 600 }}>{c.user.fullName}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)' }}>{c.user.email}</div>
                  {c.title && <div style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)' }}>{c.title}</div>}
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Partner details</h2>
          <p style={{ fontSize: '0.9rem', margin: '0.25rem 0' }}>
            <strong>Contact:</strong> {partner.contactName ?? '—'}
          </p>
          <p style={{ fontSize: '0.9rem', margin: '0.25rem 0' }}>
            <strong>Email:</strong> {partner.contactEmail ?? '—'}
          </p>
          <p style={{ fontSize: '0.9rem', margin: '0.25rem 0' }}>
            <strong>Phone:</strong> {partner.contactPhone ?? '—'}
          </p>
        </section>
      </div>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Referred members</h2>
        {members.length === 0 ? (
          <p style={{ color: 'var(--color-gray-500)', fontSize: '0.9rem' }}>No referrals recorded yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Program</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>Enrolled</th>
                </tr>
              </thead>
              <tbody>
                {partner.referrals.map((r) => {
                  const m = r.member;
                  const program = m.enrolledProgram ? getProgramBySlug(m.enrolledProgram) : null;
                  const pct = memberProgramProgressPct(m.enrolledProgram, m.coursesCompleted);
                  const student: PipelineStudent = {
                    id: m.id,
                    fullName: m.fullName,
                    email: m.email,
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
                    <tr key={r.id}>
                      <td>
                        <Link href={`/admin/members/${m.id}`} style={{ fontWeight: 600, color: 'var(--color-accent)' }}>
                          {m.fullName}
                        </Link>
                      </td>
                      <td>{program?.title ?? '—'}</td>
                      <td>{pct}%</td>
                      <td>{PIPELINE_STAGE_LABELS[stage]}</td>
                      <td>{m.enrolledAt?.toLocaleDateString() ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
