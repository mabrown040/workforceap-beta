'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

const VIEWS = [
  { id: 'admin', label: 'Admin Portal', path: '/admin' },
  { id: 'partner', label: 'Partner Portal', path: '/partner' },
  { id: 'student', label: 'Member Portal', path: '/dashboard' },
  { id: 'employer', label: 'Employer Portal', path: '/employer' },
  { id: 'counselor', label: 'Counselor Portal', path: '/counselor' },
] as const;

function getCurrentView(pathname: string): (typeof VIEWS)[number]['id'] {
  if (pathname?.startsWith('/admin')) return 'admin';
  if (pathname?.startsWith('/partner')) return 'partner';
  if (pathname?.startsWith('/employer')) return 'employer';
  if (pathname?.startsWith('/counselor')) return 'counselor';
  return 'student';
}

export function useIsSuperAdmin() {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setIsSuperAdmin(d.superAdmin === true))
      .catch(() => {});
  }, []);

  return isSuperAdmin;
}

export default function SuperAdminViewSwitcher({ initialIsSuperAdmin = false }: { initialIsSuperAdmin?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const fetchedSuperAdmin = useIsSuperAdmin();
  const isSuperAdmin = initialIsSuperAdmin || fetchedSuperAdmin;
  const currentView = getCurrentView(pathname ?? '');

  const closeMenu = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onEscape = (e: KeyboardEvent) => e.key === 'Escape' && closeMenu();
    const onClick = (e: MouseEvent) => {
      if (open && !(e.target as HTMLElement).closest('.super-admin-view-switcher')) {
        closeMenu();
      }
    };
    document.addEventListener('keydown', onEscape);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('keydown', onEscape);
      document.removeEventListener('click', onClick);
    };
  }, [open, closeMenu]);

  const handleSelect = (view: (typeof VIEWS)[number]) => {
    closeMenu();
    if (view.path !== pathname && !pathname?.startsWith(view.path)) {
      router.push(view.path);
    }
  };

  if (!isSuperAdmin) return null;

  const currentLabel = VIEWS.find((v) => v.id === currentView)?.label ?? 'Member Portal';
  const shortLabel = {
    admin: 'Admin',
    partner: 'Partner',
    student: 'Member',
    employer: 'Employer',
    counselor: 'Counselor',
  }[currentView] ?? currentLabel;

  return (
    <div className="super-admin-view-switcher super-admin-view-switcher--with-badge" onClick={(e) => e.stopPropagation()} role="presentation">
      <span className="super-admin-view-switcher__badge" title="Super Admin access enabled">Admin</span>
      <button
        type="button"
        className="super-admin-view-switcher__trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`View: ${currentLabel}. Switch portal view`}
      >
        <span className="super-admin-view-switcher__label" title={currentLabel}>{shortLabel}</span>
        <ChevronDown size={14} aria-hidden />
      </button>
      {open && (
        <div className="super-admin-view-switcher__panel">
          <div className="super-admin-view-switcher__header">
            Switch portal view
          </div>
          <ul
            className="super-admin-view-switcher__dropdown"
            role="listbox"
            aria-label="Portal view options"
          >
            {VIEWS.map((view) => (
              <li key={view.id} role="option" aria-selected={currentView === view.id}>
                <button
                  type="button"
                  className={`super-admin-view-switcher__option${currentView === view.id ? ' active' : ''}`}
                  onClick={() => handleSelect(view)}
                >
                  {view.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
