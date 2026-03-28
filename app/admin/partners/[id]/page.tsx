import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { memberProgramProgressPct } from '@/lib/partner/memberProgress';
import { getPipelineStage, PIPELINE_STAGE_LABELS, type PipelineStudent } from '@/lib/pipeline/stage';
import InvitePartnerUserButton from '@/components/admin/InvitePartnerUserButton';
import PartnerDetailActions from '@/components/admin/PartnerDetailActions';
import PageHeader from '@/components/portal/PageHeader';

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
    <div className="pipeline-page-wrap">
      <Link href="/admin/partners" className="portal-nav-back">
        &larr; Back to Partners
      </Link>
      <PageHeader
        title={partner.name}
        subtitle={`${partner._count.counselors} counselor${partner._count.counselors !== 1 ? 's' : ''} · ${partner._count.referrals} referral${partner._count.referrals !== 1 ? 's' : ''}`}
        action={
          <div className="admin-partner-status-action">
            <span className={`admin-partner-badge ${partner.active ? 'admin-partner-badge--active' : 'admin-partner-badge--inactive'}`}>
              {partner.active ? 'Active' : 'Inactive'}
            </span>
            <PartnerDetailActions partner={partner} subgroups={subgroups} allPartners={allPartners} />
          </div>
        }
      />

      <section className="admin-partner-invite">
        <h2>Invite partner user</h2>
        <p>
          Sends an email invitation with a link to the partner portal ({partner.contactEmail ? 'milestone notifications go to ' + partner.contactEmail : 'add a contact email on the partner record for notifications'}).
        </p>
        <InvitePartnerUserButton partnerId={partner.id} />
      </section>

      <div className="admin-partner-stats-grid">
        {[
          { label: 'Total referred', value: members.length },
          { label: 'Active (not placed)', value: active },
          { label: 'Completions', value: completions },
          { label: 'Placements', value: placements },
        ].map((s) => (
          <div key={s.label} className="admin-partner-stat-card">
            <div className="admin-partner-stat-value">{s.value}</div>
            <div className="admin-partner-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="admin-partner-grid">
        <section>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Counselors ({partner.counselors.length})</h2>
          {partner.counselors.length === 0 ? (
            <p style={{ color: 'var(--color-gray-500)', fontSize: '0.9rem' }}>No counselors assigned yet.</p>
          ) : (
            <div className="admin-partner-counselors-list">
              {partner.counselors.map((c) => (
                <div key={c.id} className="admin-partner-counselor">
                  <div className="admin-partner-counselor-name">{c.user.fullName}</div>
                  <div className="admin-partner-counselor-sub">{c.user.email}</div>
                  {c.title && <div className="admin-partner-counselor-sub">{c.title}</div>}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="admin-partner-details">
          <h2>Partner details</h2>
          <p><strong>Contact:</strong> {partner.contactName ?? '—'}</p>
          <p><strong>Email:</strong> {partner.contactEmail ?? '—'}</p>
          <p><strong>Phone:</strong> {partner.contactPhone ?? '—'}</p>
        </section>
      </div>

      <section className="admin-partner-referrals">
        <h2>Referred members</h2>
        {members.length === 0 ? (
          <p style={{ color: 'var(--color-gray-500)', fontSize: '0.9rem' }}>No referrals recorded yet.</p>
        ) : (
          <div className="admin-table-scroll">
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
                        <Link href={`/admin/members/${m.id}`} className="admin-partner-member-link">
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
