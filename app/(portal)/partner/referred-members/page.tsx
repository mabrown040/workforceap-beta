import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { unlinkedPartnerHref } from '@/lib/auth/portalGuards';

import { buildPageMetadataAsync } from '@/app/seo';
import PartnerInviteMemberButton from '@/components/portal/PartnerInviteMemberButton';
import PageHeader from '@/components/portal/PageHeader';
import { getPartnerForUser } from '@/lib/auth/roles';
import { getUser } from '@/lib/auth/server';
import { loadPartnerReferralBundle, toPartnerMembersListRows } from '@/lib/partner/referralBundle';
import PartnerReferredMembersKit from '@/components/portal/kit/pages/PartnerReferredMembersKit';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('partner');
  return buildPageMetadataAsync({
  title: t('referredMembers'),
  description: t('referredMembersDescription'),
  path: '/partner/referred-members',
});
}

export default async function PartnerReferredMembersPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/partner/referred-members');
  const t = await getTranslations('partner');

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) redirect(await unlinkedPartnerHref(user.id));

  const { pipelineMembers } = await loadPartnerReferralBundle(ctx.partnerId, ctx.partner.organizationId);
  const rows = toPartnerMembersListRows(pipelineMembers);

  return (
    <PortalPageFrame>
      <PageHeader
        title={t('referredMembers')}
        subtitle={t('searchAndFilter')}
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <PartnerInviteMemberButton />
            <a
              href="/partner/exports"
              className="active:scale-[0.98] wa-transition-all"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.5rem 0.875rem',
                background: 'var(--surface-container)',
                borderRadius: '0.625rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--color-on-surface)',
                textDecoration: 'none',
                border: '1px solid var(--outline-variant)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              {t('exportCsv')}
            </a>
          </div>
        }
      />
      <PartnerReferredMembersKit rows={rows} />
    </PortalPageFrame>
  );
}
