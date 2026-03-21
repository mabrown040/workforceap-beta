import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import PartnerInviteButton from './PartnerInviteButton';

type Props = { params: Promise<{ id: string }> };

export default async function AdminPartnerDetailPage({ params }: Props) {
  const { id } = await params;

  const partner = await prisma.partner.findUnique({
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
              enrolledProgram: true,
              enrolledAt: true,
              coursesCompleted: true,
              placementRecord: { select: { id: true } },
              userCertifications: { select: { id: true } },
            },
          },
        },
        orderBy: { referredAt: 'desc' },
      },
      _count: { select: { counselors: true } },
    },
  });

  if (!partner) notFound();

  // Build analytics
  const referredMembers = partner.referrals.map((r) => {
    const program = r.member.enrolledProgram ? getProgramBySlug(r.member.enrolledProgram) : null;
    const completed = (r.member.coursesCompleted as string[] | null) ?? [];
    const totalCourses = program?.courses.length ?? 0;
    const completedCount = program ? completed.filter((s) => program.courses.some((c) => c.slug === s)).length : 0;
    const progressPct = totalCourses > 0 ? Math.round((completedCount / totalCourses) * 100) : 0;
    const isPlaced = !!r.member.placementRecord;
    const hasCert = r.member.userCertifications.length > 0;

    let status = 'Enrolled';
    if (isPlaced) status = 'Placed';
    else if (hasCert) status = 'Certified';
    else if (progressPct === 100) status = 'Completed';
    else if (progressPct > 0) status = 'Active';

    return {
      id: r.member.id,
      name: r.member.fullName,
      program: program?.title ?? r.member.enrolledProgram ?? 'No program',
      progressPct,
      enrolledAt: r.member.enrolledAt,
      status,
      isPlaced,
    };
  });

  const totalReferred = referredMembers.length;
  const activeMembers = referredMembers.filter((m) => m.status === 'Active' || m.status === 'Enrolled').length;
  const completions = referredMembers.filter((m) => m.status === 'Completed' || m.status === 'Certified' || m.status === 'Placed').length;
  const placements = referredMembers.filter((m) => m.isPlaced).length;

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <Link href="/admin/partners" style={{ color: 'var(--color-accent)', marginBottom: '1rem', display: 'inline-block' }}>
        &larr; Back to Partners
      </Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.25rem' }}>{partner.name}</h1>
          <p style={{ margin: 0, color: 'var(--color-gray-500)', fontSize: '0.9rem' }}>
            {partner.contactName && <>{partner.contactName} &middot; </>}
            {partner.contactEmail && <>{partner.contactEmail} &middot; </>}
            {partner.contactPhone && <>{partner.contactPhone} &middot; </>}
            {partner._count.counselors} counselor{partner._count.counselors !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {partner.contactEmail && (
            <PartnerInviteButton partnerEmail={partner.contactEmail} partnerName={partner.contactName ?? partner.name} />
          )}
          <span style={{
            padding: '0.3rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.85rem',
            background: partner.active ? 'rgba(74, 155, 79, 0.12)' : 'var(--color-gray-100)',
            color: partner.active ? '#2d7a32' : 'var(--color-gray-600)',
          }}>
            {partner.active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Analytics Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Referred', value: totalReferred },
          { label: 'Active Members', value: activeMembers },
          { label: 'Completions', value: completions },
          { label: 'Placements', value: placements },
        ].map((stat) => (
          <div key={stat.label} style={{ padding: '1.25rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)' }}>{stat.value}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Referred Members Table */}
        <section style={{ gridColumn: '1 / -1' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Referred Members ({totalReferred})</h2>
          {referredMembers.length === 0 ? (
            <p style={{ color: 'var(--color-gray-500)', fontSize: '0.9rem' }}>No referrals recorded yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Program</th>
                    <th>Progress %</th>
                    <th>Status</th>
                    <th>Enrolled Date</th>
                  </tr>
                </thead>
                <tbody>
                  {referredMembers.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <Link href={`/admin/members/${m.id}`} style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 500 }}>
                          {m.name}
                        </Link>
                      </td>
                      <td style={{ fontSize: '0.9rem' }}>{m.program}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '50px', height: '6px', background: 'var(--color-gray-200)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${m.progressPct}%`, height: '100%', background: 'var(--color-green, #4a9b4f)', borderRadius: '3px' }} />
                          </div>
                          <span style={{ fontSize: '0.8rem' }}>{m.progressPct}%</span>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem',
                          background: m.status === 'Placed' ? 'rgba(74, 155, 79, 0.12)' : 'var(--color-gray-100)',
                          color: m.status === 'Placed' ? '#2d7a32' : 'var(--color-gray-600)',
                        }}>
                          {m.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)' }}>
                        {m.enrolledAt?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Counselors */}
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

        {/* Notification Preferences */}
        <section>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Notification Preferences</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
            <div>Enrollment notifications: <strong>{partner.notifyOnEnrollment ? 'On' : 'Off'}</strong></div>
            <div>Course completion: <strong>{partner.notifyOnCourse ? 'On' : 'Off'}</strong></div>
            <div>Certification: <strong>{partner.notifyOnCertified ? 'On' : 'Off'}</strong></div>
            <div>Job placement: <strong>{partner.notifyOnPlaced ? 'On' : 'Off'}</strong></div>
          </div>
        </section>
      </div>
    </div>
  );
}
