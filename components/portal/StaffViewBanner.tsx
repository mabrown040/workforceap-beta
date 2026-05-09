'use client';

import { useState, useEffect } from 'react';

const COOKIE_NAME = 'wa_staff_view_banner_dismissed';

/**
 * Subtle banner shown to super-admins / admins when they're viewing a
 * member-side dashboard page. Reminds them that empty sections may just
 * mean their staff account isn't enrolled — not a bug.
 *
 * Dismissible per session via a cookie: `wa_staff_view_banner_dismissed`.
 * The cookie is session-scoped (no Max-Age) so the banner returns the
 * next time the staff member opens a fresh browser session.
 *
 * Rendered conditionally by the page (only when the viewer is staff),
 * so this component doesn't re-check the role itself.
 */
export default function StaffViewBanner({ page }: { page?: string }) {
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    const cookies = typeof document !== 'undefined' ? document.cookie : '';
    const isDismissed = cookies.split(';').some((c) => c.trim().startsWith(`${COOKIE_NAME}=1`));
    setDismissed(isDismissed);
  }, []);

  if (dismissed !== false) return null;

  const handleDismiss = () => {
    if (typeof document !== 'undefined') {
      document.cookie = `${COOKIE_NAME}=1; Path=/; SameSite=Lax`;
    }
    setDismissed(true);
  };

  return (
    <div
      role="status"
      aria-label="Staff view notice"
      data-staff-view-banner={page ?? ''}
      style={{
        background: 'rgba(43,123,185,0.06)',
        border: '1px solid rgba(43,123,185,0.2)',
        borderRadius: '0.5rem',
        padding: '0.5rem 0.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
        fontSize: '0.8125rem',
        color: 'var(--color-on-surface-variant)',
      }}
    >
      <span
        className="material-symbols-outlined"
        aria-hidden="true"
        style={{ fontSize: '1rem', color: 'var(--color-blue)' }}
      >
        settings
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        You&apos;re viewing this as a super-admin. Some sections may be empty if you&apos;re not enrolled in a program.
      </span>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss staff-view notice"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--color-on-surface-variant)',
          cursor: 'pointer',
          padding: '0.125rem 0.25rem',
          fontSize: '0.875rem',
          lineHeight: 1,
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>close</span>
      </button>
    </div>
  );
}
