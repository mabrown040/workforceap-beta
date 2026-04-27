'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, Building2, Users } from 'lucide-react';

type ContextItem = { id: string; label: string };

const VIEWS = [
  { id: 'admin', label: 'Admin Portal', path: '/admin' },
  { id: 'partner', label: 'Partner Portal', path: '/partner', needsContext: true as const },
  { id: 'student', label: 'Member Portal', path: '/dashboard' },
  { id: 'employer', label: 'Employer Portal', path: '/employer', needsContext: true as const },
  { id: 'counselor', label: 'Counselor Portal', path: '/counselor' },
] as const;

type ViewId = (typeof VIEWS)[number]['id'];

function getCurrentView(pathname: string): ViewId {
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

export default function SuperAdminViewSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subPanel, setSubPanel] = useState<'employer' | 'partner' | null>(null);
  const [employers, setEmployers] = useState<ContextItem[] | null>(null);
  const [partners, setPartners] = useState<ContextItem[] | null>(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const isSuperAdmin = useIsSuperAdmin();
  const currentView = getCurrentView(pathname ?? '');
  const panelRef = useRef<HTMLDivElement>(null);

  const closeAll = useCallback(() => {
    setOpen(false);
    setSubPanel(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onEscape = (e: KeyboardEvent) => e.key === 'Escape' && closeAll();
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) closeAll();
    };
    document.addEventListener('keydown', onEscape);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('keydown', onEscape);
      document.removeEventListener('click', onClick);
    };
  }, [open, closeAll]);

  // Load employer/partner lists lazily when sub-panel opens
  useEffect(() => {
    if (subPanel === 'employer' && !employers) {
      setLoadingContext(true);
      fetch('/api/admin/employers')
        .then((r) => r.json())
        .then((data: { id: string; companyName: string }[]) =>
          setEmployers(data.map((e) => ({ id: e.id, label: e.companyName })))
        )
        .catch(() => setEmployers([]))
        .finally(() => setLoadingContext(false));
    }
    if (subPanel === 'partner' && !partners) {
      setLoadingContext(true);
      fetch('/api/admin/partners')
        .then((r) => r.json())
        .then((data: { id: string; name: string; active: boolean }[]) =>
          setPartners(data.filter((p) => p.active).map((p) => ({ id: p.id, label: p.name })))
        )
        .catch(() => setPartners([]))
        .finally(() => setLoadingContext(false));
    }
  }, [subPanel, employers, partners]);

  const handleSimpleSelect = (path: string) => {
    closeAll();
    if (!pathname?.startsWith(path)) router.push(path);
  };

  const handleContextSelect = async (type: 'employer' | 'partner', item: ContextItem) => {
    setSwitchingTo(item.id);
    try {
      await fetch(`/api/admin/${type}-context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(type === 'employer' ? { employerId: item.id } : { partnerId: item.id }),
      });
      closeAll();
      router.push(type === 'employer' ? '/employer' : '/partner');
    } finally {
      setSwitchingTo(null);
    }
  };

  if (!isSuperAdmin) return null;

  const currentLabel = VIEWS.find((v) => v.id === currentView)?.label ?? 'Member Portal';
  const shortLabel: Record<ViewId, string> = {
    admin: 'Admin',
    partner: 'Partner',
    student: 'Member',
    employer: 'Employer',
    counselor: 'Counselor',
  };

  return (
    <div
      ref={panelRef}
      className="super-admin-view-switcher super-admin-view-switcher--with-badge"
      onClick={(e) => e.stopPropagation()}
      role="presentation"
    >
      <span className="super-admin-view-switcher__badge" title="Super Admin access enabled">
        Admin
      </span>
      <button
        type="button"
        className="super-admin-view-switcher__trigger"
        onClick={() => { setOpen((o) => !o); setSubPanel(null); }}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`View: ${currentLabel}. Switch portal view`}
      >
        <span className="super-admin-view-switcher__label" title={currentLabel}>
          {shortLabel[currentView]}
        </span>
        <ChevronDown size={14} aria-hidden />
      </button>

      {open && (
        <div className="super-admin-view-switcher__panel">
          <div className="super-admin-view-switcher__header">Switch portal view</div>

          {subPanel ? (
            /* Sub-panel: entity picker */
            <>
              <button
                type="button"
                className="super-admin-view-switcher__back"
                onClick={() => setSubPanel(null)}
              >
                ← Back
              </button>
              <div className="super-admin-view-switcher__subheader">
                {subPanel === 'employer' ? (
                  <><Building2 size={13} aria-hidden /> Select company</>
                ) : (
                  <><Users size={13} aria-hidden /> Select partner</>
                )}
              </div>
              <ul className="super-admin-view-switcher__dropdown" role="listbox">
                {loadingContext ? (
                  <li className="super-admin-view-switcher__loading">Loading…</li>
                ) : (subPanel === 'employer' ? employers : partners)?.length === 0 ? (
                  <li className="super-admin-view-switcher__loading">None found</li>
                ) : (
                  (subPanel === 'employer' ? employers : partners)?.map((item) => (
                    <li key={item.id} role="option" aria-selected={false}>
                      <button
                        type="button"
                        className="super-admin-view-switcher__option"
                        disabled={switchingTo === item.id}
                        onClick={() => handleContextSelect(subPanel, item)}
                      >
                        {switchingTo === item.id ? 'Opening…' : item.label}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </>
          ) : (
            /* Top-level portal list */
            <ul
              className="super-admin-view-switcher__dropdown"
              role="listbox"
              aria-label="Portal view options"
            >
              {VIEWS.map((view) => {
                const isActive = currentView === view.id;
                const hasContext = 'needsContext' in view && view.needsContext;
                return (
                  <li key={view.id} role="option" aria-selected={isActive}>
                    {hasContext ? (
                      <button
                        type="button"
                        className={`super-admin-view-switcher__option super-admin-view-switcher__option--context${isActive ? ' active' : ''}`}
                        onClick={() => setSubPanel(view.id as 'employer' | 'partner')}
                      >
                        <span>{view.label}</span>
                        <ChevronRight size={13} aria-hidden />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={`super-admin-view-switcher__option${isActive ? ' active' : ''}`}
                        onClick={() => handleSimpleSelect(view.path)}
                      >
                        {view.label}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
