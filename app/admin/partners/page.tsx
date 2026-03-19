import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';

export default async function AdminPartnersPage() {
  const partners = await prisma.partner.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          counselors: true,
          referrals: true,
        },
      },
    },
  });

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Partner Organizations</h1>
        <Link
          href="/admin/partners/new"
          style={{ padding: '0.5rem 1rem', background: 'var(--color-accent)', color: 'white', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 }}
        >
          Add Partner
        </Link>
      </div>

      {partners.length === 0 ? (
        <div className="admin-empty-state">
          <h3>No partner organizations yet</h3>
          <p style={{ maxWidth: '36rem', marginLeft: 'auto', marginRight: 'auto' }}>
            Partners are employers, workforce boards, and training providers who refer candidates to your programs.
          </p>
          <p>Add your first partner organization to start tracking referrals and assigning counselors.</p>
          <Link href="/admin/partners/new" className="btn btn-primary">Add Partner</Link>
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Organization</th>
              <th>Contact</th>
              <th>Counselors</th>
              <th>Referrals</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {partners.map((partner) => (
              <tr key={partner.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{partner.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>{partner.slug}</div>
                </td>
                <td style={{ fontSize: '0.9rem' }}>
                  {partner.contactName && <div>{partner.contactName}</div>}
                  {partner.contactEmail && <div style={{ color: 'var(--color-gray-500)' }}>{partner.contactEmail}</div>}
                </td>
                <td style={{ textAlign: 'center' }}>{partner._count.counselors}</td>
                <td style={{ textAlign: 'center' }}>{partner._count.referrals}</td>
                <td>
                  <span style={{
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    background: partner.active ? 'rgba(74, 155, 79, 0.12)' : 'var(--color-gray-100)',
                    color: partner.active ? '#2d7a32' : 'var(--color-gray-600)',
                  }}>
                    {partner.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <Link
                    href={`/admin/partners/${partner.id}`}
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