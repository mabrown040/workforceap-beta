import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import PartnersTableClient from '@/components/admin/PartnersTableClient';
import PageHeader from '@/components/portal/PageHeader';

export default async function AdminPartnersPage() {
  const [partners, subgroups] = await Promise.all([
    prisma.partner.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            counselors: true,
            referrals: true,
          },
        },
      },
    }),
    prisma.subgroup.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, type: true, partnerId: true },
    }),
  ]);

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <PageHeader
        title="Partner Organizations"
        action={<Link href="/admin/partners/new" style={{ padding: '0.5rem 1rem', background: 'var(--color-accent)', color: 'white', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 }}>Add Partner</Link>}
      />

      {partners.length === 0 ? (
        <div className="admin-empty-state">
          <h3>No partner organizations yet</h3>
          <p>
            Partner organizations refer candidates to WorkforceAP. Each partner gets their own portal login, referral tracking, and milestone notifications for their members.
          </p>
          <Link href="/admin/partners/new" className="btn btn-primary">Add Partner</Link>
        </div>
      ) : (
        <PartnersTableClient partners={partners} subgroups={subgroups} />
      )}
    </div>
  );
}
