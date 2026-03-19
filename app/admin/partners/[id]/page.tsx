import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';

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
          member: { select: { id: true, fullName: true, email: true, enrolledProgram: true, createdAt: true } },
        },
        orderBy: { referredAt: 'desc' },
        take: 50,
      },
      _count: { select: { counselors: true, referrals: true } },
    },
  });

  if (!partner) notFound();

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <Link href="/admin/partners" style={{ color: 'var(--color-accent)', marginBottom: '1rem', display: 'inline-block' }}>
        &larr; Back to Partners
      </Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.25rem' }}>{partner.name}</h1>
          <p style={{ margin: 0, color: 'var(--color-gray-500)', fontSize: '0.9rem' }}>
            {partner._count.counselors} counselor{partner._count.counselors !== 1 ? 's' : ''} &middot; {partner._count.referrals} referral{partner._count.referrals !== 1 ? 's' : ''}
          </p>
        </div>
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
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Recent Referrals ({partner._count.referrals})</h2>
          {partner.referrals.length === 0 ? (
            <p style={{ color: 'var(--color-gray-500)', fontSize: '0.9rem' }}>No referrals recorded yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {partner.referrals.map((r) => (
                <div key={r.id} style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.9rem' }}>
                  <div style={{ fontWeight: 500 }}>{r.member.fullName}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>
                    {r.member.enrolledProgram ?? 'No program yet'} &middot; {new Date(r.referredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}