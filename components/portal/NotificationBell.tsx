'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import type { NavBadgeKey } from '@/lib/nav/portalNav';

type Notification = {
  key: string;
  label: string;
  href: string;
  icon: string;
  count: number;
};

function getRole(pathname: string): string {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/employer')) return 'employer';
  if (pathname.startsWith('/partner')) return 'partner';
  if (pathname.startsWith('/counselor')) return 'counselor';
  return 'member';
}

function buildNotifications(badges: Partial<Record<NavBadgeKey, number>>, role: string): Notification[] {
  const items: Notification[] = [];

  if (role === 'member') {
    if ((badges.counselor_messages_unread ?? 0) > 0) {
      items.push({ key: 'msg', label: 'New message from counselor', href: '/dashboard/messages', icon: 'forum', count: badges.counselor_messages_unread! });
    }
  }

  if (role === 'employer') {
    if ((badges.applications_new ?? 0) > 0) {
      items.push({ key: 'apps', label: `${badges.applications_new} new applicants`, href: '/employer/applications', icon: 'person_add', count: badges.applications_new! });
    }
    if ((badges.employer_messages_unread ?? 0) > 0) {
      items.push({ key: 'emsg', label: 'New message', href: '/employer/messages', icon: 'forum', count: badges.employer_messages_unread! });
    }
    if ((badges.employer_queue_review_today ?? 0) > 0) {
      items.push({ key: 'review', label: 'Candidates to review today', href: '/employer/work-queue', icon: 'grading', count: badges.employer_queue_review_today! });
    }
  }

  if (role === 'partner') {
    if ((badges.partner_needs_attention ?? 0) > 0) {
      items.push({ key: 'attn', label: `${badges.partner_needs_attention} members need attention`, href: '/partner/attention', icon: 'warning', count: badges.partner_needs_attention! });
    }
    if ((badges.partner_messages_unread ?? 0) > 0) {
      items.push({ key: 'pmsg', label: 'New message', href: '/partner/messages', icon: 'forum', count: badges.partner_messages_unread! });
    }
    if ((badges.milestones_new ?? 0) > 0) {
      items.push({ key: 'mile', label: `${badges.milestones_new} new milestones`, href: '/partner/milestones', icon: 'flag', count: badges.milestones_new! });
    }
  }

  if (role === 'counselor') {
    if ((badges.counselor_messages_unread ?? 0) > 0) {
      items.push({ key: 'cmsg', label: 'Unread member messages', href: '/counselor/messages', icon: 'forum', count: badges.counselor_messages_unread! });
    }
    if ((badges.counselor_sla_breach_48h ?? 0) > 0) {
      items.push({ key: 'sla', label: `${badges.counselor_sla_breach_48h} SLA breaches >48h`, href: '/counselor/messages', icon: 'schedule', count: badges.counselor_sla_breach_48h! });
    }
  }

  if (role === 'admin') {
    if ((badges.counselor_sla_breach_48h ?? 0) > 0) {
      items.push({ key: 'asla', label: `${badges.counselor_sla_breach_48h} message SLA breaches`, href: '/admin/messages', icon: 'schedule', count: badges.counselor_sla_breach_48h! });
    }
  }

  return items;
}

export default function NotificationBell({ badges: externalBadges }: { badges?: Partial<Record<NavBadgeKey, number>> }) {
  const pathname = usePathname() ?? '';
  const role = getRole(pathname);
  const [selfBadges, setSelfBadges] = useState<Partial<Record<NavBadgeKey, number>>>({});
  const [open, setOpen] = useState(false);
  const [lastFetch, setLastFetch] = useState(0);
  const dropRef = useRef<HTMLDivElement>(null);

  // When the parent (WorkspaceShell) provides badges, use those directly so the
  // bell badge and the dropdown panel always read from the same source (#10).
  const badges = externalBadges ?? selfBadges;

  const fetchBadges = useCallback(async () => {
    if (externalBadges) return; // parent owns the data
    try {
      const r = await fetch(`/api/portal/nav-badges?role=${encodeURIComponent(role)}`, { credentials: 'include' });
      if (r.ok) {
        const data = await r.json() as Partial<Record<NavBadgeKey, number>>;
        setSelfBadges(data);
        setLastFetch(Date.now());
      }
    } catch {
      /* non-fatal */
    }
  }, [role, externalBadges]);

  // Initial load + poll every 45s (only when not driven by parent)
  useEffect(() => {
    if (externalBadges) return;
    void fetchBadges();
    const id = setInterval(() => void fetchBadges(), 45_000);
    return () => clearInterval(id);
  }, [fetchBadges, externalBadges]);

  // Also refresh on wa-nav-badges-refresh event (only when not driven by parent)
  useEffect(() => {
    if (externalBadges) return;
    const handler = () => void fetchBadges();
    window.addEventListener('wa-nav-badges-refresh', handler);
    return () => window.removeEventListener('wa-nav-badges-refresh', handler);
  }, [fetchBadges, externalBadges]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const notifications = buildNotifications(badges, role);
  const total = notifications.reduce((s, n) => s + n.count, 0);

  return (
    <div ref={dropRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        className="portal-icon-btn"
        onClick={() => { setOpen(o => !o); if (!open && Date.now() - lastFetch > 10_000) void fetchBadges(); }}
        aria-label={total > 0 ? `${total} notification${total !== 1 ? 's' : ''}` : 'Notifications'}
        aria-expanded={open}
        style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2.25rem', height: '2.25rem', borderRadius: '0.5rem', background: open ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)' : 'transparent', border: 'none', cursor: 'pointer', color: total > 0 ? 'var(--color-accent)' : 'var(--color-on-surface-variant)', transition: 'background 0.15s' }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', fontVariationSettings: total > 0 ? "'FILL' 1" : "'FILL' 0" }}>
          notifications
        </span>
        {total > 0 && (
          <span style={{ position: 'absolute', top: '-2px', right: '-2px', minWidth: '1.125rem', height: '1.125rem', borderRadius: '9999px', background: 'var(--color-accent)', color: '#fff', fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 0.25rem', lineHeight: 1, border: '2px solid var(--surface-container-low, #1a1c1e)' }}>
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0, width: '20rem', maxWidth: '90vw', zIndex: 200, borderRadius: '0.875rem', background: 'var(--surface-container-low)', border: '1px solid var(--outline-variant)', boxShadow: '0 8px 32px rgba(0,0,0,0.22)', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontWeight: 800, fontSize: '0.8125rem', color: 'var(--color-on-surface)', margin: 0 }}>Notifications</p>
            {total > 0 && (
              <span style={{ fontSize: '0.625rem', fontWeight: 800, padding: '0.1rem 0.4rem', borderRadius: '9999px', background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)', color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {total} new
              </span>
            )}
          </div>

          {notifications.length === 0 ? (
            <div style={{ padding: '1.5rem 1rem', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.75rem', color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: '0.5rem', fontVariationSettings: "'FILL' 1" }}>notifications_none</span>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', margin: 0 }}>All caught up</p>
            </div>
          ) : (
            <div>
              {notifications.map((n) => (
                <a
                  key={n.key}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="portal-notification-item"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1rem', textDecoration: 'none', color: 'inherit', transition: 'background 0.15s', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <div style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>{n.icon}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-on-surface)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.label}</p>
                  </div>
                  {n.count > 0 && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-accent)', flexShrink: 0 }}>{n.count}</span>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
