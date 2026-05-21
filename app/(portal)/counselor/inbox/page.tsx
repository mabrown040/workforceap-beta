import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import InboxZeroClient from '@/components/portal/counselor/InboxZeroClient';
import { getInboxZeroQueue, type InboxZeroQueue } from '@/lib/counselor/inboxZero';

export const dynamic = 'force-dynamic';

export default async function CounselorInboxZeroPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/counselor/inbox');

  const counselor = await isCounselor(user.id);
  const admin = await isAdmin(user.id);
  if (!counselor && !admin) redirect('/dashboard');

  const t = await getTranslations('counselor');

  let queue: InboxZeroQueue;
  let loadError = false;
  try {
    queue = await getInboxZeroQueue(user.id, { isAdmin: admin });
  } catch (err) {
    console.error('[counselor/inbox] getInboxZeroQueue failed:', err);
    loadError = true;
    queue = {
      rows: [],
      totals: {
        total: 0,
        dismissedToday: 0,
        byFlag: {
          doc_missing: 0,
          application_stalled: 0,
          at_risk: 0,
          last_contact: 0,
        },
      },
    };
  }

  return (
    <PortalPageFrame>
      <PageHeader
        title={t('inboxZeroTitle')}
        subtitle={t('inboxZeroSubtitle')}
        breadcrumbs={[
          { label: t('counselorPortal'), href: '/counselor' },
          { label: t('inboxZero') },
        ]}
      />

      <section style={{ padding: '0 clamp(1rem, 4vw, 1.5rem) 2rem' }}>
        {loadError ? (
          <div
            className="content-card"
            style={{
              padding: '1rem 1.25rem',
              borderLeft: '4px solid var(--color-accent, #b00020)',
              marginBottom: '1rem',
            }}
          >
            <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-accent, #b00020)' }}>
              {t('inboxZeroLoadError')}
            </p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
              {t('inboxZeroLoadErrorDesc')}
            </p>
          </div>
        ) : null}
        <InboxZeroClient initialQueue={queue} />
      </section>
    </PortalPageFrame>
  );
}
