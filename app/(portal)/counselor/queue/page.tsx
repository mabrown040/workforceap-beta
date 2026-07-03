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
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  color: 'var(--color-on-surface-variant)',
                  fontWeight: 600,
                }}
              >
                {t('workQueueMembersAwaiting', { count: rows.length })}
              </p>
              <Link
                href="/counselor/messages"
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--color-accent)',
                }}
              >
                {t('openMessages')} →
              </Link>
            </div>

            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.625rem',
              }}
            >
              {rows.map((row) => {
                const initials = row.memberName
                  .split(' ')
                  .filter(Boolean)
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();
                // `--color-error` isn't defined in the counselor portal's
                // stylesheet (only inside the unrelated .auth-depth scope),
                // so the most-overdue rows were rendering with no color at
                // all — less urgent-looking than the 48-71h tier below it.
                const overdueColor =
                  row.hoursWaiting >= 72
                    ? 'var(--color-error, #dc2626)'
                    : row.hoursWaiting >= 48
                      ? 'var(--color-orange, var(--color-accent))'
                      : 'var(--color-accent)';
                return (
                  <li key={row.threadId}>
                    <Link
                      href={`/counselor/messages?studentId=${row.memberId}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <div
                        className="portal-card portal-card--flat portal-card--padded-sm"
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '1rem',
                          transition: 'background-color 0.15s',
                        }}
                      >
                        <div
                          style={{
                            width: '2.75rem',
                            height: '2.75rem',
                            borderRadius: '0.75rem',
                            background:
                              'linear-gradient(135deg, var(--color-accent-dark), var(--color-accent))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.875rem',
                            fontWeight: 700,
                            color: '#fff',
                            flexShrink: 0,
                          }}
                          aria-hidden="true"
                        >
                          {initials || '?'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'baseline',
                              gap: '0.75rem',
                              justifyContent: 'space-between',
                              marginBottom: '0.25rem',
                            }}
                          >
                            <h3
                              title={row.memberName}
                              style={{
                                fontWeight: 700,
                                fontSize: '0.9375rem',
                                color: 'var(--color-on-surface)',
                                margin: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {row.memberName}
                            </h3>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  color: overdueColor,
                                  whiteSpace: 'nowrap',
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {formatTimeWaiting(row.hoursWaiting)}
                              </span>
                              {row.hoursWaiting >= 72 && (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.15rem',
                                    padding: '0.05rem 0.375rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.625rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.03em',
                                    whiteSpace: 'nowrap',
                                    color: overdueColor,
                                    background: 'color-mix(in srgb, var(--color-error, #dc2626) 12%, transparent)',
                                  }}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '0.75rem' }} aria-hidden="true">
                                    warning
                                  </span>
                                  {t('workQueueOverdueChip')}
                                </span>
                              )}
                            </span>
                          </div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: '0.8125rem',
                              color: 'var(--color-on-surface-variant)',
                              lineHeight: 1.45,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {previewMessageBody(row.lastMessageBody) || t('emptyMessagePreview')}
                          </p>
                        </div>
                        <span
                          className="material-symbols-outlined"
                          style={{
                            color: 'var(--color-on-surface-variant)',
                            opacity: 0.35,
                            fontSize: '1rem',
                            alignSelf: 'center',
                            flexShrink: 0,
                          }}
                          aria-hidden="true"
                        >
                          chevron_right
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

    </PortalPageFrame>
  );
}
