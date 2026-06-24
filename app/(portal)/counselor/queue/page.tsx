import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import PortalEmptyState from '@/components/portal/PortalEmptyState';
import {
  formatTimeWaiting,
  getCounselorWorkQueue,
  previewMessageBody,
} from '@/lib/counselor/workQueue';
import { getTranslations } from 'next-intl/server';
import { DesignSurface, QueueRow, SectionHeader, type QueueTone } from '@/components/portal/kit';

export const dynamic = 'force-dynamic';

export default async function CounselorWorkQueuePage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/counselor/queue');

  const counselor = await isCounselor(user.id);
  const admin = await isAdmin(user.id);
  if (!counselor && !admin) redirect('/dashboard');

  let rows: Awaited<ReturnType<typeof getCounselorWorkQueue>>;
  let error = false;
  try {
    rows = await getCounselorWorkQueue(user.id, { isAdmin: admin });
  } catch (err) {
    console.error('[counselor/queue] getCounselorWorkQueue failed:', err);
    rows = [];
    error = true;
  }

  const t = await getTranslations('counselor');

  return (
    <PortalPageFrame>
      <PageHeader
        title={t('workQueue')}
        subtitle={t('workQueueSubtitle')}
        breadcrumbs={[
          { label: t('counselorPortalBreadcrumb'), href: '/counselor' },
          { label: t('workQueue') },
        ]}
      />

      <section style={{ padding: '0 clamp(1rem, 4vw, 1.5rem) 2rem' }}>
        {error ? (
          <div
            style={{
              padding: '2rem',
              textAlign: 'center',
              background: 'var(--surface-container-low)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--outline-variant)',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '2rem', color: 'var(--color-error)', display: 'block', marginBottom: '1rem' }}
              aria-hidden="true"
            >
              error
            </span>
            <h3 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.5rem', color: 'var(--color-on-surface)' }}>
              {t('workQueueLoadError')}
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem' }}>
              {t('workQueueLoadErrorDesc')}
            </p>
            <Link href="/counselor/queue" className="btn btn-primary">
              {t('retry')}
            </Link>
          </div>
        ) : rows.length === 0 ? (
          <PortalEmptyState
            title={t('allCaughtUp')}
            description={t('workQueueEmptyDesc')}
            icon={
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '2rem', color: 'var(--color-green)' }}
                aria-hidden="true"
              >
                done_all
              </span>
            }
            primaryAction={{ label: t('openMessages'), href: '/counselor/messages' }}
            secondaryAction={{ label: t('backToDashboard'), href: '/counselor' }}
          />
        ) : (
          <DesignSurface surface="dense">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <SectionHeader
                title={t('workQueue')}
                goal={t('workQueueMembersAwaiting', { count: rows.length })}
                action={
                  <Link
                    href="/counselor/messages"
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: 'var(--color-accent)',
                      textDecoration: 'none',
                    }}
                  >
                    {t('openMessages')} →
                  </Link>
                }
              />
              {rows.map((row) => {
                const initials = row.memberName
                  .split(' ')
                  .filter(Boolean)
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();
                const tone: QueueTone =
                  row.hoursWaiting >= 72 ? 'red' : row.hoursWaiting >= 48 ? 'yellow' : 'blue';
                const preview = previewMessageBody(row.lastMessageBody) || '(empty message)';
                return (
                  <Link
                    key={row.threadId}
                    href={`/counselor/messages?studentId=${row.memberId}`}
                    style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                  >
                    <QueueRow
                      tone={tone}
                      icon={
                        <span style={{ fontSize: 13, fontWeight: 700 }} aria-hidden="true">
                          {initials || '?'}
                        </span>
                      }
                      title={row.memberName}
                      meta={`${formatTimeWaiting(row.hoursWaiting)} · ${preview}`}
                      flag={tone === 'red' ? 'Urgent' : tone === 'yellow' ? 'Watch' : undefined}
                      action={
                        <Link
                          href={`/counselor/messages?studentId=${row.memberId}`}
                          className="btn btn-sm btn-secondary"
                          style={{ fontSize: 11, textDecoration: 'none' }}
                        >
                          View
                        </Link>
                      }
                    />
                  </Link>
                );
              })}
            </div>
          </DesignSurface>
        )}
      </section>

    </PortalPageFrame>
  );
}
