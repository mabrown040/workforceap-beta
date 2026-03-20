import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';

export default async function AdminSubgroupsPage() {
  const subgroups = await prisma.subgroup.findMany({
    orderBy: { name: 'asc' },
    include: {
      leader: { select: { id: true, fullName: true, email: true } },
      partner: { select: { id: true, name: true } },
      _count: { select: { members: true } },
    },
  });

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Subgroups</h1>
        <Link
          href="/admin/subgroups/new"
          style={{ padding: '0.5rem 1rem', background: 'var(--color-accent)', color: 'white', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 }}
        >
          Create Subgroup
        </Link>
      </div>

      <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem', maxWidth: '600px' }}>
        Subgroups let partners, managers, and churches see all members assigned to their group. Members can be assigned manually or auto-assigned when referred by a linked partner.
      </p>

      {subgroups.length === 0 ? (
        <div className="admin-empty-state">
          <h3>No subgroups yet</h3>
          <p>
            Create subgroups to give partners, managers, or churches visibility into their assigned members. Each subgroup has a leader who can view member progress in the portal.
          </p>
          <Link href="/admin/subgroups/new" className="btn btn-primary">Create Subgroup</Link>
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Leader</th>
              <th>Partner</th>
              <th>Members</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subgroups.map((sg) => (
              <tr key={sg.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{sg.name}</div>
                  {sg.description && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', maxWidth: 200 }}>{sg.description}</div>
                  )}
                </td>
                <td>
                  <span style={{
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    textTransform: 'capitalize',
                    background: 'var(--color-light)',
                  }}>
                    {sg.type}
                  </span>
                </td>
                <td style={{ fontSize: '0.9rem' }}>
                  {sg.leader.fullName}
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>{sg.leader.email}</div>
                </td>
                <td>{sg.partner?.name ?? '—'}</td>
                <td style={{ textAlign: 'center' }}>{sg._count.members}</td>
                <td>
                  <Link
                    href={`/admin/subgroups/${sg.id}`}
                    style={{ color: 'var(--color-accent)', textDecoration: 'none', fontSize: '0.9rem' }}
                  >
                    Manage &rarr;
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
