'use client';

import Link from 'next/link';
import DevViewToggle from './DevViewToggle';
import NotificationBell from './NotificationBell';
import { SignOutButton } from './SignOutButton';
import { PRODUCT_COPY } from '@/lib/nav/workspaceCopy';
import type { NavBadgeKey } from '@/lib/nav/portalNav';

function ActionItems({
  onItemClick,
  badges,
  hidePublicSite,
  readOnlyAudit,
}: {
  onItemClick?: () => void;
  badges?: Partial<Record<NavBadgeKey, number>>;
  /** Brand block already has marketingSiteHref — don't repeat it here. */
  hidePublicSite?: boolean;
  readOnlyAudit?: boolean;
}) {
  return (
    <>
      <NotificationBell badges={badges} readOnlyAudit={readOnlyAudit} />
      <DevViewToggle />
      {!hidePublicSite ? (
        <Link href="/" prefetch={false} className="wa-shell-text-action wa-kit-focus" onClick={onItemClick}>
          {PRODUCT_COPY.publicSiteLabel}
        </Link>
      ) : null}
      <SignOutButton className="wa-shell-text-action wa-kit-focus" onSignOutStart={onItemClick} />
    </>
  );
}

export default function PortalHeaderActions({
  badges,
  hidePublicSite,
  readOnlyAudit,
}: {
  badges?: Partial<Record<NavBadgeKey, number>>;
  hidePublicSite?: boolean;
  readOnlyAudit?: boolean;
}) {
  return (
    <>
      {/* Desktop: inline actions (hidden on mobile via CSS) */}
      <div className="portal-shell-header__actions portal-header-actions-desktop">
        <ActionItems badges={badges} hidePublicSite={hidePublicSite} readOnlyAudit={readOnlyAudit} />
      </div>
      {/* Mobile: bell only. Appearance, public site, and sign-out live in the
          WorkspaceShell drawer. Keeping one appearance control prevents a
          detached icon from cutting into the shared header wash. */}
      <div className="portal-header-actions-mobile">
        <div className="portal-header-actions-mobile__primary">
          <NotificationBell badges={badges} readOnlyAudit={readOnlyAudit} />
        </div>
      </div>
    </>
  );
}
