import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { buildPageMetadata } from '@/app/seo';
import MobileBottomNav from '@/components/MobileBottomNav';
import PartnerInviteMemberButton from '@/components/portal/PartnerInviteMemberButton';
import PageHeader from '@/components/portal/PageHeader';
import PartnerMembersList from '@/components/portal/PartnerMembersList';
import { getPartnerForUser } from '@/lib/auth/roles';
import { getUser } from '@/lib/auth/server';
import { loadPartnerReferralBundle, toPartnerMembersListRows } from '@/lib/partner/referralBundle';
import PartnerReferredMembersMobile from '@/components/partner/PartnerReferredMembersMobile';
import PortalPageFrame from '@/components/portal/PortalPageFrame';

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

  return (
    <PortalPageFrame>
      <PageHeader
        title="Referred members"
        subtitle="Search and filter everyone your organization has referred to WorkforceAP."
        action={
          <>
            <div className="wa-flex wa-flex-col wa-gap-2 wa-items-stretch wa-block wa-md:wa-hidden">
              <PartnerInviteMemberButton compact />
              <a
                href="/partner/exports"
                className="active:scale-[0.98] wa-transition-all"
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
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden="true">download</span>
                Export CSV
              </a>
            </div>
            <div className="wa-hidden wa-md:wa-block">
              <PartnerInviteMemberButton />
            </div>
          </>
        }
      />
      <div className="wa-block wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        <PartnerReferredMembersMobile rows={rows} />

        <MobileBottomNav variant="partner" />
      </div>

      <div className="wa-hidden wa-md:wa-block">
        <PartnerMembersList members={rows} />
      </div>
    </PortalPageFrame>
  );
}
