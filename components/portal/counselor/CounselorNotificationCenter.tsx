'use client';

import { useEffect, useState, useCallback } from 'react';
import PortalEmptyState from '@/components/portal/PortalEmptyState';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
};

type MemberOption = {
  id: string;
  fullName: string | null;
};

const NOTIFICATION_TYPES = [
  { value: '', label: 'All types' },
  { value: 'message', label: 'Message' },
  { value: 'course_complete', label: 'Course complete' },
  { value: 'job_match', label: 'Job match' },
  { value: 'survey_due', label: 'Survey due' },
  { value: 'task_assigned', label: 'Task assigned' },
  { value: 'broadcast', label: 'Broadcast' },
];

const TYPE_ICON: Record<string, string> = {
  message: 'forum',
  course_complete: 'school',
  job_match: 'work',
  survey_due: 'assignment',
  task_assigned: 'task_alt',
  broadcast: 'campaign',
};

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function CounselorNotificationCenter({ members }: { members: MemberOption[] }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [type, setType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [readFilter, setReadFilter] = useState('');

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('limit', '50');
      if (memberId) params.set('memberId', memberId);
      if (type) params.set('type', type);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (readFilter) params.set('read', readFilter === 'read' ? 'true' : 'false');

      const r = await fetch(`/api/counselor/notifications?${params.toString()}`, { credentials: 'include' });
      if (r.ok) {
        const data = await r.json() as { notifications: NotificationItem[]; unreadCount: number };
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch {
      /* non-fatal */
    } finally {
      setLoading(false);
    }
  }, [memberId, type, dateFrom, dateTo, readFilter]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const markRead = useCallback(async (id: string) => {
    try {
      const r = await fetch(`/api/member/notifications/${id}/read`, { method: 'PATCH', credentials: 'include' });
      if (r.ok) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch {
      /* non-fatal */
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      const r = await fetch('/api/member/notifications/read-all', { method: 'POST', credentials: 'include' });
      if (r.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
        setUnreadCount(0);
      }
    } catch {
      /* non-fatal */
    }
  }, []);

  const dismiss = useCallback(async (id: string) => {
    try {
      const r = await fetch(`/api/member/notifications/${id}`, { method: 'DELETE', credentials: 'include' });
      if (r.ok) {
        // Only decrement the unread badge if the dismissed notification was
        // actually unread. Mirrors the fix in NotificationBell.dismiss().
        setNotifications((prev) => {
          const target = prev.find((n) => n.id === id);
          if (target && !target.readAt) {
            setUnreadCount((c) => Math.max(0, c - 1));
          }
          return prev.filter((n) => n.id !== id);
        });
      }
    } catch {
      /* non-fatal */
    }
  }, []);

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fill, minmax(12rem, 1fr))', marginBottom: '1.25rem', padding: '1rem', borderRadius: '0.75rem', background: 'var(--surface-container-low, #1a1c1e)', border: '1px solid var(--outline-variant)' }}>
        <div>
          <label htmlFor="cn-member-filter" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-on-surface-variant)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Member</label>
          <select id="cn-member-filter" value={memberId} onChange={(e) => setMemberId(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.625rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', background: 'var(--surface-container)', color: 'var(--color-on-surface)', fontSize: '0.875rem' }}>
            <option value="">All members</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.fullName ?? m.id}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="cn-type-filter" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-on-surface-variant)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Type</label>
          <select id="cn-type-filter" value={type} onChange={(e) => setType(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.625rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', background: 'var(--surface-container)', color: 'var(--color-on-surface)', fontSize: '0.875rem' }}>
            {NOTIFICATION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="cn-date-from" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-on-surface-variant)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>From</label>
          <input id="cn-date-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.625rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', background: 'var(--surface-container)', color: 'var(--color-on-surface)', fontSize: '0.875rem' }} />
        </div>
        <div>
          <label htmlFor="cn-date-to" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-on-surface-variant)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>To</label>
          <input id="cn-date-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.625rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', background: 'var(--surface-container)', color: 'var(--color-on-surface)', fontSize: '0.875rem' }} />
        </div>
        <div>
          <label htmlFor="cn-status-filter" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-on-surface-variant)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</label>
          <select id="cn-status-filter" value={readFilter} onChange={(e) => setReadFilter(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.625rem', borderRadius: '0.5rem', border: '1px solid var(--outline-variant)', background: 'var(--surface-container)', color: 'var(--color-on-surface)', fontSize: '0.875rem' }}>
            <option value="">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </div>
      </div>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-on-surface)' }}>
            {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
          </span>
          {unreadCount > 0 && (
            <span style={{ fontSize: '0.625rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '9999px', background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)', color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {unreadCount} unread
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0.5rem', borderRadius: '0.375rem' }}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      {loading && notifications.length === 0 ? (
        <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', margin: 0 }}>Loading…</p>
        </div>
      ) : notifications.length === 0 ? (
        <PortalEmptyState
          title="No notifications"
          description="Notifications will appear here when members complete courses, match with jobs, or need follow-up."
          icon={<span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }} aria-hidden="true">notifications_none</span>}
          primaryAction={{ label: 'Refresh', onClick: fetchNotifications }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.875rem',
                padding: '1rem',
                borderRadius: '0.75rem',
                background: n.readAt ? 'var(--surface-container-low)' : 'color-mix(in srgb, var(--color-accent) 5%, var(--surface-container-low))',
                border: '1px solid var(--outline-variant)',
                transition: 'background 0.15s',
                opacity: n.readAt ? 0.85 : 1,
              }}
            >
              <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.5rem', background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>
                  {TYPE_ICON[n.type] ?? 'notifications'}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-on-surface)', margin: 0, lineHeight: 1.3 }}>{n.title}</p>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)', flexShrink: 0, whiteSpace: 'nowrap' }}>{formatTimeAgo(n.createdAt)}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', margin: '0.25rem 0 0', lineHeight: 1.4 }}>{n.body}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)', opacity: 0.7 }}>{formatDate(n.createdAt)}</span>
                  {!n.readAt && (
                    <button
                      onClick={() => void markRead(n.id)}
                      style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      Mark read
                    </button>
                  )}
                  <button
                    onClick={() => void dismiss(n.id)}
                    style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
