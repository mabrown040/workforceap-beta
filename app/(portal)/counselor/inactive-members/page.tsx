'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import PageHeader from '@/components/portal/PageHeader';
import PortalEmptyState from '@/components/portal/PortalEmptyState';
import DataTable from '@/components/portal/ui/DataTable';
import SectionHeader from '@/components/portal/ui/SectionHeader';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

interface InactiveMember {
  id: string;
  email: string;
  joinedAt: string;
  lastActiveAt: string | null;
  daysInactive: number;
  phone: string | null;
}

const THRESHOLDS = [7, 14, 30] as const;

function PortalListSkeleton({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{
        textAlign: 'center',
        padding: '2.5rem 1rem',
        color: 'var(--color-on-surface-variant)',
        fontSize: '0.9rem',
      }}
    >
      {label}
    </div>
  );
}

export default function InactiveMembersPage() {
  const t = useTranslations('counselor');
  const [days, setDays] = useState(7);
  const [members, setMembers] = useState<InactiveMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Per-action error is intentionally separate from the page-load `error`
  // so a single outreach failure doesn't hide the whole member list.
  const [actionError, setActionError] = useState<string | null>(null);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [reminderSent, setReminderSent] = useState<Set<string>>(new Set());
  const activeLoadId = useRef(0);

  const loadMembers = useCallback(async () => {
    const loadId = activeLoadId.current + 1;
    activeLoadId.current = loadId;
    const isCurrentLoad = () => activeLoadId.current === loadId;

    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithTimeout(`/api/counselor/inactive-members?days=${days}`, {}, 15000);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      if (!isCurrentLoad()) return;
      setMembers(data.members || []);
    } catch {
      if (isCurrentLoad()) {
        setError(t('couldNotLoadInactiveMembers'));
      }
    } finally {
      if (isCurrentLoad()) {
        setLoading(false);
      }
    }
  }, [days, t]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const logOutreach = async (member: InactiveMember) => {
    setSendingReminder(member.id);
    setActionError(null);
    try {
      const res = await fetchWithTimeout('/api/counselor/remind-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.id, daysInactive: member.daysInactive }),
      }, 15000);
      if (!res.ok) throw new Error('Failed to log outreach');
      setReminderSent((prev) => new Set(prev).add(member.id));
    } catch {
      setActionError(t('couldNotLogOutreach'));
    } finally {
      setSendingReminder(null);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return t('never');
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const severity = (daysInactive: number) => {
    if (daysInactive >= 30) return { color: 'var(--color-error)', label: t('critical') };
    if (daysInactive >= 14) return { color: 'var(--color-orange)', label: t('warning') };
    return { color: 'var(--color-yellow)', label: t('atRiskShort') };
  };

  return (
    <div style={{ width: '100%', maxWidth: 'var(--max-width, 80rem)', margin: '0 auto', padding: '0 clamp(1rem, 4vw, 1.5rem) 2rem' }}>
      <PageHeader
        title={t('inactiveMembersTitle')}
        subtitle={t('inactiveMembersSubtitle')}
        breadcrumbs={[{ label: t('counselorPortalBreadcrumb'), href: '/counselor' }, { label: t('inactiveMembersTitle') }]}
      />

      <div role="tablist" aria-label={t('minDaysInactive')} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {THRESHOLDS.map((d) => (
          <button
            type="button"
            key={d}
            role="tab"
            aria-selected={days === d}
            id={`inactive-tab-${d}`}
            onClick={() => setDays(d)}
            style={{
              minWidth: '2.75rem',
              minHeight: '2.75rem',
              padding: '0.625rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: days === d ? 'var(--color-accent)' : 'var(--surface-container-high)',
              color: days === d ? 'var(--color-white, #fff)' : 'var(--color-on-surface-variant)',
              fontWeight: days === d ? 700 : 500,
              cursor: 'pointer',
              fontSize: '0.85rem',
              outlineOffset: '2px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {t('daysThreshold', { days: d })}
          </button>
        ))}
      </div>

      {loading ? <PortalListSkeleton label={t('loadingMemberList')} /> : null}

      {error ? (
        <div role="alert" style={{ color: 'var(--color-error)', padding: '1rem', textAlign: 'center', fontWeight: 600 }}>
          {error}
        </div>
      ) : null}

      {actionError ? (
        <div role="alert" style={{ color: 'var(--color-error)', padding: '0.75rem 1rem', marginBottom: '1rem', background: 'color-mix(in srgb, var(--color-error) 8%, transparent)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: 600 }}>
          {actionError}
        </div>
      ) : null}

      {!loading && !error && members.length === 0 ? (
        <PortalEmptyState
          title={t('everyoneIsActive')}
          description={t('noMembersInactive', { days })}
          icon={<span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-on-surface-variant)' }} aria-hidden>celebration</span>}
        />
      ) : null}

      {!loading && !error && members.length > 0 ? (
        <div
          style={{
            background: 'var(--surface-container)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--outline-variant)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--outline-variant)' }}>
            <SectionHeader
              density="compact"
              title={t('needsAttention')}
              subtitle={t('membersThreshold', { count: members.length, days })}
              action={
                <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                  Updated {new Date().toLocaleTimeString()}
                </span>
              }
            />
          </div>
          <DataTable
            density="compact"
            variant="portal"
            scrollX
            rows={members}
            rowKey={(m) => m.id}
            columns={[
              {
                key: 'member',
                header: t('member'),
                cell: (m) => (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{m.email}</div>
                    {m.phone ? (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginTop: '0.15rem' }}>{m.phone}</div>
                    ) : null}
                  </div>
                ),
              },
              {
                key: 'days',
                header: t('daysInactive'),
                align: 'center',
                cell: (m) => {
                  const sev = severity(m.daysInactive);
                  return (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.35rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        background: `color-mix(in srgb, ${sev.color} 12%, transparent)`,
                        color: sev.color,
                        fontWeight: 700,
                        fontSize: '0.8rem',
                      }}
                    >
                      {m.daysInactive} {t('days')}
                    </span>
                  );
                },
              },
              {
                key: 'last',
                header: t('lastActive'),
                cell: (m) => (
                  <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.85rem' }}>{formatDate(m.lastActiveAt)}</span>
                ),
              },
              {
                key: 'joined',
                header: t('joined'),
                cell: (m) => (
                  <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.85rem' }}>{formatDate(m.joinedAt)}</span>
                ),
              },
              {
                key: 'action',
                header: t('action'),
                align: 'right',
                cell: (m) => (
                  <button
                    type="button"
                    onClick={() => logOutreach(m)}
                    disabled={sendingReminder === m.id || reminderSent.has(m.id)}
                    title={t('logOutreachTooltip')}
                    aria-label={
                      reminderSent.has(m.id)
                        ? t('outreachLoggedFor', { email: m.email })
                        : t('logOutreachFor', { email: m.email })
                    }
                    style={{
                      minWidth: '2.75rem',
                      minHeight: '2.75rem',
                      padding: '0.625rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      background: reminderSent.has(m.id) ? 'var(--color-green)' : 'var(--color-accent)',
                      color: 'var(--color-white, #fff)',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      cursor: sendingReminder === m.id || reminderSent.has(m.id) ? 'not-allowed' : 'pointer',
                      opacity: sendingReminder === m.id ? 0.7 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {sendingReminder === m.id ? t('saving') : reminderSent.has(m.id) ? t('logged') : t('logOutreach')}
                  </button>
                ),
              },
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}
