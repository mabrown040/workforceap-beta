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
    <div role="note" className="legacy-view-notice">
      <span className="material-symbols-outlined legacy-view-notice__icon" aria-hidden="true">
        history
      </span>
      <span>Legacy view</span>
      <span aria-hidden="true" className="legacy-view-notice__sep">
        ·
      </span>
      <a href={currentViewHref} className="legacy-view-notice__link">
        switch to the current view
      </a>
    </div>
  );
}
