'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

const VIEWS = [
  { id: 'admin', label: 'Admin Portal', path: '/admin' },
  { id: 'partner', label: 'Partner Portal', path: '/partner' },
  { id: 'student', label: 'Student Portal', path: '/dashboard' },
  { id: 'employer', label: 'Employer Portal', path: '/employer' },
  { id: 'my-group', label: 'My Group Portal', path: '/my-group' },
] as const;

function getCurrentView(pathname: string): (typeof VIEWS)[number]['id'] {
  if (pathname?.startsWith('/admin')) return 'admin';
  if (pathname?.startsWith('/partner')) return 'partner';
  if (pathname?.startsWith('/employer')) return 'employer';
  if (pathname?.startsWith('/my-group')) return 'my-group';
  return 'student';
}

export default function SuperAdminViewSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const currentView = getCurrentView(pathname ?? '');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setIsSuperAdmin(d.superAdmin === true))
      .catch(() => {});
  }, []);

  const closeMenu = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onEscape = (e: KeyboardEvent) => e.key === 'Escape' && closeMenu();
    const onClick = () => closeMenu();
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

  const currentLabel = VIEWS.find((v) => v.id === currentView)?.label ?? 'Student Portal';

  return (
    <div className="super-admin-view-switcher" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="super-admin-view-switcher__trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`View: ${currentLabel}. Switch portal view`}
      >
        <span className="super-admin-view-switcher__label">View: {currentLabel}</span>
        <ChevronDown size={16} aria-hidden />
      </button>
      {open && (
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
      )}
    </div>
  );
}
