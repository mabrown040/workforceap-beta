import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';

import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin - Subgroups',
  description: 'Manage member subgroups.',
  path: '/admin/subgroups',
});

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
      <PageHeader
        title="Subgroups"
        action={<Link href="/admin/subgroups/new" style={{ padding: '0.5rem 1rem', background: 'var(--color-accent)', color: 'white', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 }}>Create Subgroup</Link>}
      />

      <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem', maxWidth: '600px' }}>
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
        <>
          {/* Desktop table */}
          <div className="admin-table-scroll admin-subgroup-desktop">
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
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', maxWidth: 200 }}>{sg.description}</div>
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
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>{sg.leader.email}</div>
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
          </div>

          {/* Mobile cards */}
          <ul className="admin-portal-card-list admin-subgroup-cards" aria-label="Subgroups (mobile layout)">
            {subgroups.map((sg) => (
              <li key={sg.id} className="admin-portal-card">
                <div className="admin-portal-card__header">
                  <div>
                    <div style={{ fontWeight: 700 }}>{sg.name}</div>
                    <div className="admin-portal-card__meta">{sg.leader.fullName}</div>
                  </div>
                  <span className="admin-portal-card__badge" style={{ background: 'var(--color-light)', color: 'var(--color-on-surface)' }}>
                    {sg._count.members} members
                  </span>
                </div>
                {sg.description && <p className="admin-portal-card__meta">{sg.description}</p>}
                <p className="admin-portal-card__meta">Type: <span style={{ textTransform: 'capitalize' }}>{sg.type}</span></p>
                <p className="admin-portal-card__meta">Partner: {sg.partner?.name ?? '—'}</p>
                <div className="admin-portal-card__actions">
                  <Link href={`/admin/subgroups/${sg.id}`} style={{ color: 'var(--color-accent)', textDecoration: 'none', fontSize: '0.9rem' }}>
                    Manage &rarr;
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
