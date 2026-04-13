'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { PortalRole } from '@/lib/nav/portalNav';
import styles from './PortalRoleSwitcher.module.css';

interface PortalRoleSwitcherProps {
  userRoles: { role: PortalRole; roleLabel: string; homeHref: string }[];
  currentRole: PortalRole;
}

export default function PortalRoleSwitcher({ userRoles, currentRole }: PortalRoleSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname() ?? '';

  const currentRoleConfig = userRoles.find(r => r.role === currentRole);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && !(event.target as Element).closest('.portal-role-switcher')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (userRoles.length <= 1) {
    return null; // Don't show switcher if user only has one role
  }

  return (
    <div className={styles['portal-role-switcher']}>
      <button
        type="button"
        className={styles['portal-role-switcher-trigger']}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className={styles['portal-role-switcher-current']}>{currentRoleConfig?.roleLabel || currentRole}</span>
        <svg className={`${styles['portal-role-switcher-chevron']} ${isOpen ? styles.open : ''}`} width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {isOpen && (
        <div className={styles['portal-role-switcher-dropdown']} role="menu">
          <div className={styles['portal-role-switcher-header']}>
            Switch workspace
          </div>
          {userRoles.map(({ role, roleLabel, homeHref }) => (
            <Link
              key={role}
              href={homeHref}
              className={`${styles['portal-role-switcher-option']} ${role === currentRole ? styles.current : ''}`}
              onClick={() => setIsOpen(false)}
              role="menuitem"
            >
              {roleLabel}
              {role === currentRole && <span className={styles['portal-role-switcher-check']}>✓</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}