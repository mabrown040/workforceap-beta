import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';

export default async function PartnerDashboardPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner');

  const partnerUser = await getPartnerForUser(user.id);
  if (!partnerUser) redirect('/dashboard');

  const partnerId = partnerUser.partnerId;
  const partner = partnerUser.partner;

  // Fetch referred members
  const referrals = await prisma.partnerReferral.findMany({
    where: { partnerId, member: { deletedAt: null } },
    include: {
      member: {
        select: {
          id: true,
          fullName: true,
          enrolledProgram: true,
          coursesCompleted: true,
          enrolledAt: true,
          updatedAt: true,
          placementRecord: { select: { id: true } },
          userCertifications: { select: { id: true } },
        },
      },
    },
    orderBy: { referredAt: 'desc' },
  });

  const members = referrals.map((r) => {
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
    else if (progressPct > 0) status = 'In Progress';

    return {
      id: r.member.id,
      name: r.member.fullName,
      program: program?.title ?? r.member.enrolledProgram ?? 'No program',
      progressPct,
      lastActive: r.member.updatedAt,
      status,
      isPlaced,
      hasCert,
    };
  });

  const totalMembers = members.length;
  const activeMembers = members.filter((m) => m.status === 'In Progress' || m.status === 'Enrolled').length;
  const completedMembers = members.filter((m) => m.status === 'Completed' || m.status === 'Certified' || m.status === 'Placed').length;
  const placedMembers = members.filter((m) => m.isPlaced).length;

  // Recent activity: last 10 milestone events for partner's members
  const memberIds = members.map((m) => m.id);
  const recentEvents = memberIds.length > 0
    ? await prisma.memberEvent.findMany({
        where: {
          userId: { in: memberIds },
          eventName: { in: ['program_enrolled', 'course_completed', 'certified', 'placed'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: { select: { fullName: true } } },
      })
    : [];

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '0.8rem', background: 'var(--color-accent)', color: 'white', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>Partner View</span>
        </div>
        <h1 style={{ fontSize: '1.75rem', margin: '0.5rem 0 0.25rem' }}>{partner.name}</h1>
        <p style={{ color: 'var(--color-gray-500)', margin: 0 }}>Partner Portal Dashboard</p>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Members', value: totalMembers },
          { label: 'Active', value: activeMembers },
          { label: 'Completed', value: completedMembers },
          { label: 'Placed', value: placedMembers },
        ].map((stat) => (
          <div key={stat.label} style={{ padding: '1.25rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)' }}>{stat.value}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Members Table */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Members ({totalMembers})</h2>
        {members.length === 0 ? (
          <p style={{ color: 'var(--color-gray-500)' }}>No referred members yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Program</th>
                  <th>Progress</th>
                  <th>Last Active</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <Link href={`/partner/members/${m.id}`} style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 500 }}>
                        {m.name}
                      </Link>
                    </td>
                    <td style={{ fontSize: '0.9rem' }}>{m.program}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '60px', height: '6px', background: 'var(--color-gray-200)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${m.progressPct}%`, height: '100%', background: 'var(--color-green, #4a9b4f)', borderRadius: '3px' }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>{m.progressPct}%</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)' }}>
                      {m.lastActive.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        background: m.status === 'Placed' ? 'rgba(74, 155, 79, 0.12)' : m.status === 'In Progress' ? 'rgba(173, 44, 77, 0.08)' : 'var(--color-gray-100)',
                        color: m.status === 'Placed' ? '#2d7a32' : m.status === 'In Progress' ? 'var(--color-accent)' : 'var(--color-gray-600)',
                      }}>
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent Activity */}
      <section>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Recent Activity</h2>
        {recentEvents.length === 0 ? (
          <p style={{ color: 'var(--color-gray-500)' }}>No milestone events yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recentEvents.map((evt) => (
              <div key={evt.id} style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.9rem' }}>
                <strong>{evt.user.fullName}</strong>{' '}
                {evt.eventName === 'program_enrolled' && 'enrolled in a program'}
                {evt.eventName === 'course_completed' && 'completed a course'}
                {evt.eventName === 'certified' && 'earned a certification'}
                {evt.eventName === 'placed' && 'was placed in a job'}
                <span style={{ float: 'right', color: 'var(--color-gray-500)', fontSize: '0.8rem' }}>
                  {evt.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
