'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { Menu, X } from 'lucide-react';
import DevViewToggle from './DevViewToggle';
import ThemeToggle from '@/components/theme/ThemeToggle';
import NotificationBell from './NotificationBell';
import { SignOutButton } from './SignOutButton';
import { PRODUCT_COPY } from '@/lib/nav/workspaceCopy';
import type { NavBadgeKey } from '@/lib/nav/portalNav';

function ActionItems({
  onItemClick,
  badges,
  hideSidebarDuplicates,
}: {
  onItemClick?: () => void;
  badges?: Partial<Record<NavBadgeKey, number>>;
  /**
   * The mobile drawer sidebar already renders its own public-site link and
   * sign-out button (WorkspaceShell.tsx), so this dropdown skips them to
   * avoid duplicates — but NotificationBell/ThemeToggle/DevViewToggle are
   * NOT duplicated anywhere else in the mobile drawer, so they must stay.
   */
  hideSidebarDuplicates?: boolean;
}) {
  return (
    <>
      <NotificationBell badges={badges} />
      <ThemeToggle variant="portal" />
      <DevViewToggle />
      {!hideSidebarDuplicates && (
        <>
          <Link href="/" prefetch={false} className="btn btn-outline btn-sm" onClick={onItemClick}>
            {PRODUCT_COPY.publicSiteLabel}
          </Link>
          <SignOutButton className="btn btn-outline btn-sm" onSignOutStart={onItemClick} />
        </>
      )}
    </>
  );
}

export default function PortalHeaderActions({ badges }: { badges?: Partial<Record<NavBadgeKey, number>> }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return;
    const onEscape = (e: KeyboardEvent) => e.key === 'Escape' && closeMenu();
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [menuOpen, closeMenu]);

  return (
    <>
      {/* Desktop: inline actions (hidden on mobile via CSS) */}
      <div className="portal-shell-header__actions portal-header-actions-desktop">
        <ActionItems badges={badges} />
      </div>
      {/* Mobile: theme + notifications always visible; overflow menu for dev tools only */}
      <div className="portal-header-actions-mobile">
        <div className="portal-header-actions-mobile__primary">
          <NotificationBell badges={badges} />
          <ThemeToggle variant="portal" />
        </div>
        <button
          type="button"
          className="portal-header-actions-hamburger"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        {menuOpen && (
          <>
            <div
              className="portal-header-actions-overlay"
              onClick={closeMenu}
              onKeyDown={(e) => e.key === 'Escape' && closeMenu()}
              role="button"
              tabIndex={-1}
              aria-hidden
            />
            <div className="portal-header-actions-dropdown" role="menu">
              <div className="portal-header-actions-dropdown__items" onClick={closeMenu} role="menu" tabIndex={-1}>
                <DevViewToggle />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
