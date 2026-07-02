'use client';

import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Several dozen admin/portal pages default to a redesigned ("kit") view and
 * fall back to their pre-redesign layout only when `?ui=legacy` is present in
 * the URL — with no visible sign to the user that they're looking at the old
 * UI. Mounted once in the shared admin/portal shells, this renders a small
 * note at the top whenever that flag is set, linking back to the current
 * view (same path + query, minus `ui`). Renders nothing otherwise.
 */
export default function LegacyViewNotice() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (searchParams?.get('ui') !== 'legacy') return null;

  const params = new URLSearchParams(searchParams?.toString());
  params.delete('ui');
  const qs = params.toString();
  const currentViewHref = `${pathname}${qs ? `?${qs}` : ''}`;

  return (
    <div
      role="note"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        flexWrap: 'wrap',
        padding: '0.4rem 1rem',
        fontSize: '0.8125rem',
        fontWeight: 600,
        color: 'var(--color-on-surface-variant, #57534e)',
        background: 'var(--surface-container-high, #f1efed)',
        borderBottom: '1px solid var(--outline-variant, #e5e1de)',
      }}
    >
      <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: '1rem' }}>
        history
      </span>
      <span>Legacy view</span>
      <span aria-hidden="true" style={{ opacity: 0.5 }}>·</span>
      <a href={currentViewHref} style={{ color: 'var(--color-accent)', fontWeight: 700, textDecoration: 'underline' }}>
        switch to the current view
      </a>
    </div>
  );
}
