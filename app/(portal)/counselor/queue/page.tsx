import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import PortalEmptyState from '@/components/portal/PortalEmptyState';
import MobileBottomNav from '@/components/MobileBottomNav';
import {
  formatTimeWaiting,
  getCounselorWorkQueue,
  previewMessageBody,
} from '@/lib/counselor/workQueue';

export const dynamic = 'force-dynamic';

export default async function CounselorWorkQueuePage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/counselor/queue');

  const counselor = await isCounselor(user.id);
  const admin = await isAdmin(user.id);
  if (!counselor && !admin) redirect('/dashboard');

  const rows = await getCounselorWorkQueue(user.id, { isAdmin: admin });

  return (
    <PortalPageFrame>
      <PageHeader
        title="Work Queue"
        subtitle={`Members waiting on a reply for more than 24 hours. Sorted oldest first.`}
        breadcrumbs={[
          { label: 'Counselor Portal', href: '/counselor' },
          { label: 'Work Queue' },
        ]}
      />

      <section style={{ padding: '0 clamp(1rem, 4vw, 1.5rem) 2rem' }}>
        {rows.length === 0 ? (
          <PortalEmptyState
            title="All caught up"
            description="No member is waiting more than 24 hours for a reply. Nice work."
            icon={
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '2rem', color: 'var(--color-green)' }}
                aria-hidden="true"
              >
                done_all
              </span>
            }
            primaryAction={{ label: 'Open Messages', href: '/counselor/messages' }}
            secondaryAction={{ label: 'Back to Dashboard', href: '/counselor' }}
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
                {rows.length} member{rows.length === 1 ? '' : 's'} awaiting reply
              </p>
              <Link
                href="/counselor/messages"
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--color-accent)',
                }}
              >
                Open Messages →
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
                const overdueColor =
                  row.hoursWaiting >= 72
                    ? 'var(--color-error)'
                    : row.hoursWaiting >= 48
                      ? 'var(--color-orange, var(--color-accent))'
                      : 'var(--color-accent)';
                return (
                  <li key={row.threadId}>
                    <Link
                      href={`/counselor/students/${row.memberId}`}
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
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: overdueColor,
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                              }}
                            >
                              {formatTimeWaiting(row.hoursWaiting)}
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
                            {previewMessageBody(row.lastMessageBody) || '(empty message)'}
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

      <MobileBottomNav variant="counselor" />
    </PortalPageFrame>
  );
}
