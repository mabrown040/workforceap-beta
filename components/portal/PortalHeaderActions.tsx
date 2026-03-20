'use client';

import { useState, useEffect, useCallback } from 'react';
import { Menu, X } from 'lucide-react';
import DevViewToggle from './DevViewToggle';
import SuperAdminViewSwitcher from '@/components/super-admin-view-switcher';
import { SignOutButton } from './SignOutButton';

function ActionItems({ onItemClick }: { onItemClick?: () => void }) {
  return (
    <>
      <SuperAdminViewSwitcher />
      <DevViewToggle />
      <a
        href="https://www.workforceap.org/"
        className="btn btn-outline btn-sm"
        rel="noopener noreferrer"
        onClick={onItemClick}
      >
        Return to Homepage
      </a>
      <SignOutButton className="btn btn-outline btn-sm" onSignOutStart={onItemClick} />
    </>
  );
}

export default function PortalHeaderActions() {
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
        <ActionItems />
      </div>
      {/* Mobile: hamburger + dropdown (hidden on desktop via CSS) */}
      <div className="portal-header-actions-mobile">
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
              <div className="portal-header-actions-dropdown__items" onClick={closeMenu}>
                <ActionItems onItemClick={closeMenu} />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
