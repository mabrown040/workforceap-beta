import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { buildPageMetadata } from '@/app/seo';
import MobileBottomNav from '@/components/MobileBottomNav';
import PartnerInviteMemberButton from '@/components/portal/PartnerInviteMemberButton';
import PageHeader from '@/components/portal/PageHeader';
import PartnerMembersList from '@/components/portal/PartnerMembersList';
import { getPartnerForUser } from '@/lib/auth/roles';
import { getUser } from '@/lib/auth/server';
import { loadPartnerReferralBundle, toPartnerMembersListRows } from '@/lib/partner/referralBundle';

export const metadata: Metadata = buildPageMetadata({
  title: 'Referred members',
  description: 'All members referred by your organization.',
  path: '/partner/referred-members',
});

export default async function PartnerReferredMembersPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner/referred-members');

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) redirect('/dashboard');

  const { pipelineMembers } = await loadPartnerReferralBundle(ctx.partnerId);
  const rows = toPartnerMembersListRows(pipelineMembers);

  const activeCount = rows.filter((r) => r.stage !== 'placed' && r.stage !== 'closed').length;
  const placedCount = rows.filter((r) => r.stage === 'placed').length;
  const atRiskCount = rows.filter((r) => r.progress < 30 && r.stage === 'in_training').length;

  return (
    <>
      <div className="wa-block wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '1.25rem 1.5rem 0.75rem', gap: '1rem' }}>
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] font-bold" style={{ color: 'var(--color-accent)', marginBottom: '0.125rem' }}>Partner Portal</p>
            <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--color-on-surface)' }}>Referred members</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'stretch' }}>
            <PartnerInviteMemberButton compact />
            <a
              href="/partner/exports"
              className="active:scale-[0.98] transition-all"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.375rem',
                padding: '0.5rem 0.875rem',
                background: 'var(--surface-container)',
                borderRadius: '0.625rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--color-on-surface)',
                textDecoration: 'none',
                border: '1px solid #ebe7e7',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>download</span>
              Export CSV
            </a>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', padding: '0 1.5rem 1rem', overflowX: 'auto' }}>
          {[
            { label: 'All', count: rows.length, active: true },
            { label: 'Active', count: activeCount, active: false },
            { label: 'Placed', count: placedCount, active: false },
            { label: 'At Risk', count: atRiskCount, active: false },
          ].map((chip) => (
            <div
              key={chip.label}
              style={{
                flexShrink: 0,
                padding: '0.375rem 0.875rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                background: chip.active ? 'var(--color-accent)' : '#fff',
                color: chip.active ? '#fff' : 'var(--color-on-surface-variant)',
                border: `1px solid ${chip.active ? 'var(--color-accent)' : 'var(--outline-variant)'}`,
                cursor: 'pointer',
              }}
            >
              {chip.label}
              {chip.count > 0 ? (
                <span
                  style={{
                    marginLeft: '0.375rem',
                    fontSize: '0.625rem',
                    opacity: 0.8,
                  }}
                >
                  {chip.count}
                </span>
              ) : null}
            </div>
          ))}
        </div>

        <div style={{ padding: '0 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {rows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--outline-variant)', display: 'block', marginBottom: '0.75rem' }}>group</span>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-on-surface)', marginBottom: '0.25rem' }}>No members yet</p>
              <p className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>Share your referral link to start building your pipeline.</p>
            </div>
          ) : (
            rows.map((row) => {
              const initials = (row.fullName ?? '?')
                .split(' ')
                .map((name: string) => name[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();
              const isPlaced = row.stage === 'placed';
              const isAtRisk = row.progress < 30 && row.stage === 'in_training';
              const badgeBg = isPlaced ? '#dcfce7' : isAtRisk ? '#fef3c7' : 'rgba(173,44,77,0.08)';
              const badgeColor = isPlaced ? '#166534' : isAtRisk ? 'var(--color-gold)' : 'var(--color-accent)';

              return (
                <Link key={row.id} href={`/partner/referred-members/${row.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ background: '#fff', borderRadius: '0.75rem', padding: '0.875rem 1rem', border: '1px solid #ebe7e7', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    <div style={{ width: 38, height: 38, borderRadius: '9999px', background: 'var(--color-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-on-surface)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.fullName}</p>
                      <p className="text-xs" style={{ color: 'var(--color-on-surface-variant)', margin: 0 }}>{row.programTitle} · Enrolled {row.referredAtLabel}</p>
                    </div>
                    <span
                      style={{
                        flexShrink: 0,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: badgeBg,
                        color: badgeColor,
                      }}
                    >
                      {row.stageLabel}
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        <MobileBottomNav variant="partner" />
      </div>

      <div className="wa-hidden wa-md:wa-block">
        <PageHeader
          title="Referred members"
          subtitle="Search and filter everyone your organization has referred to WorkforceAP."
          action={<PartnerInviteMemberButton />}
        />
        <PartnerMembersList members={rows} />
      </div>
    </>
  );
}
