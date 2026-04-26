'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback, useRef, useId } from 'react';

const navItems = [
  {
    label: 'About Us',
    children: [
      { href: '/what-we-do', label: 'What We Do' },
      { href: '/how-it-works', label: 'How It Works' },
      { href: '/leadership', label: 'Leadership' },
      { href: '/faq', label: 'FAQ' },
    ],
  },
  { href: '/programs', label: 'Programs' },
  { href: '/wioa-qualification', label: 'Check Eligibility' },
  { href: '/find-your-path', label: 'Find Your Path' },
  { href: '/partners', label: 'Partners' },
  { href: '/employers', label: 'Employers' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact Us' },
];

function dropdownMenuId(baseId: string, label: string) {
  return `${baseId}-${label.replace(/\s+/g, '-').toLowerCase()}`;
}

export default function MainNav() {
  const pathname = usePathname();
  const navMenuId = useId();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  /** Primary nav target + optional submenu for portal entry points */
  const [portalState, setPortalState] = useState<{
    primary: { href: string; label: string };
    submenu: Array<{ href: string; label: string }>;
  }>({
      primary: { href: '/login', label: 'Login' },
      submenu: [
      { href: '/login?redirectTo=/counselor', label: 'Counselor sign in' },
      { href: '/login?redirectTo=/partner', label: 'Partner sign in' },
      { href: '/login?redirectTo=/employer', label: 'Employer sign in' },
      { href: '/login?redirectTo=/dashboard', label: 'Member sign in' },
      ],
  });
  const menuRef = useRef<HTMLUListElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
    setActiveDropdown(null);
    document.body.classList.remove('mobile-nav-open');
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.pageYOffset > 60);
    const onResize = () => {
      if (window.innerWidth > 900) closeMobile();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [closeMobile]);

  useEffect(() => {
    let cancelled = false;
    const refreshPortalLinks = () => {
      void (async () => {
        try {
          const res = await fetch('/api/auth/me', { credentials: 'include' });
          const data = (await res.json()) as {
            role: string | null;
            partner: { partnerId: string } | null;
            employer: { employerId: string; companyName: string } | null;
            superAdmin: boolean;
            canAccessMemberDashboard: boolean;
          };
          if (cancelled) return;
          if (!data.role) {
            setPortalState({
              primary: { href: '/login', label: 'Login' },
              submenu: [
                { href: '/login?redirectTo=/counselor', label: 'Counselor sign in' },
                { href: '/login?redirectTo=/partner', label: 'Partner sign in' },
                { href: '/login?redirectTo=/employer', label: 'Employer sign in' },
                { href: '/login?redirectTo=/dashboard', label: 'Member sign in' },
              ],
            });
            return;
          }
          const partnerExclusive = !!data.partner && !data.superAdmin;
          if (partnerExclusive) {
            setPortalState({
              primary: { href: '/partner', label: 'Partner' },
              submenu: [
                { href: '/login?redirectTo=/counselor', label: 'Counselor sign in' },
                { href: '/login?redirectTo=/employer', label: 'Employer sign in' },
                { href: '/login?redirectTo=/dashboard', label: 'Member sign in' },
              ],
            });
            return;
          }
          const sub: Array<{ href: string; label: string }> = [
            { href: '/dashboard', label: 'Member dashboard' },
          ];
          if (data.employer) {
            sub.push({ href: '/employer', label: 'Employer portal' });
          }
          if (data.partner && data.superAdmin) {
            sub.push({ href: '/partner', label: 'Partner portal' });
          }
          sub.push({ href: '/dashboard/account', label: 'Account settings' });
          setPortalState({
            primary: { href: '/dashboard', label: 'Account' },
            submenu: sub,
          });
        } catch {
          if (!cancelled) {
            setPortalState({
              primary: { href: '/login', label: 'Login' },
              submenu: [
                { href: '/login?redirectTo=/counselor', label: 'Counselor sign in' },
                { href: '/login?redirectTo=/partner', label: 'Partner sign in' },
                { href: '/login?redirectTo=/employer', label: 'Employer sign in' },
                { href: '/login?redirectTo=/dashboard', label: 'Member sign in' },
              ],
            });
          }
        }
      })();
    };
    refreshPortalLinks();
    window.addEventListener('focus', refreshPortalLinks);
    return () => { cancelled = true; window.removeEventListener('focus', refreshPortalLinks); };
  }, []);

  useEffect(() => { closeMobile(); }, [pathname, closeMobile]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const menu = menuRef.current;
    if (!menu) return;
    const getFocusable = () =>
      Array.from(menu.querySelectorAll<HTMLElement>('a[href]:not([tabindex="-1"]), button:not([disabled]):not([aria-hidden="true"])')).filter((el) => !el.hasAttribute('disabled'));
    const t = window.setTimeout(() => getFocusable()[0]?.focus(), 0);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); closeMobile(); toggleRef.current?.focus(); return; }
      if (e.key !== 'Tab' || !menu) return;
      const focusables = getFocusable();
      if (focusables.length === 0) return;
      const first = focusables[0]; const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) { if (active === first) { e.preventDefault(); last.focus(); } }
      else if (active === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { window.clearTimeout(t); document.removeEventListener('keydown', onKeyDown); previouslyFocused?.focus?.(); };
  }, [mobileOpen, closeMobile]);

  useEffect(() => {
    if (!activeDropdown) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActiveDropdown(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [activeDropdown]);

  useEffect(() => {
    if (!activeDropdown) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const root = navContainerRef.current; const t = e.target;
      if (!root || !(t instanceof Node) || root.contains(t)) return;
      setActiveDropdown(null);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown, { passive: true });
    return () => { document.removeEventListener('mousedown', onPointerDown); document.removeEventListener('touchstart', onPointerDown); };
  }, [activeDropdown]);

  const toggleMobile = () => {
    if (mobileOpen) { closeMobile(); } else { setMobileOpen(true); document.body.classList.add('mobile-nav-open'); }
  };

  const isActive = (href: string) => pathname === href;
  const isParentActive = (children: { href: string }[]) => children.some((c) => pathname === c.href);

  const handleDropdownKeyDown = useCallback(
    (e: React.KeyboardEvent, label: string, isOpen: boolean, subMenuId: string) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveDropdown(isOpen ? null : label); return; }
      if (e.key === 'Escape') { e.preventDefault(); setActiveDropdown(null); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault(); if (!isOpen) setActiveDropdown(label);
        queueMicrotask(() => { document.getElementById(subMenuId)?.querySelector<HTMLElement>('a[href]')?.focus(); });
      }
    }, []
  );

  const portalHrefActive = (href: string) => {
    if (href === '/login' || href.startsWith('/login?')) return pathname === '/login';
    if (href === '/partner') return pathname.startsWith('/partner');
    if (href === '/dashboard') {
      return (
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/employer') ||
        pathname.startsWith('/admin') ||
        pathname.startsWith('/counselor') ||
        pathname.startsWith('/mentor') ||
        pathname.startsWith('/account') ||
        pathname.startsWith('/dashboard/account')
      );
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const loginDropdownId = `${navMenuId}-login-submenu`;
  const isLoginMenuOpen = activeDropdown === '__login__';
  const loginSubmenuItems = portalState.submenu.filter((item) => item.href !== portalState.primary.href);

  return (
    <nav className={`main-nav${scrolled ? ' scrolled' : ''}`} aria-label="Main navigation">
      <div className="nav-container" ref={navContainerRef}>
        <Link href="/" className="logo" aria-label="Workforce Advancement Project home" onClick={closeMobile}>
          <Image src="/images/logo-tight.png" alt="Workforce Advancement Project" width={1930} height={985} className="nav-logo-image" sizes="(max-width: 900px) 130px, 210px" quality={85} priority />
        </Link>

        {/* Mobile toggle */}
        <button ref={toggleRef} type="button" className="mobile-nav-toggle" aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileOpen} aria-controls={navMenuId} onClick={toggleMobile}>
          {mobileOpen ? <X size={26} strokeWidth={2} aria-hidden /> : <Menu size={26} strokeWidth={2} aria-hidden />}
        </button>

        {/* Mobile backdrop */}
        <button type="button" className={`mobile-nav-backdrop${mobileOpen ? ' visible' : ''}`} aria-label="Close navigation menu" tabIndex={mobileOpen ? 0 : -1} onClick={closeMobile} {...(!mobileOpen ? { 'data-nav-hidden': 'true' } : {})} />

        {/* Nav links — single list, used for both desktop and mobile */}
        <ul ref={menuRef} id={navMenuId} className={`nav-menu${mobileOpen ? ' mobile-open' : ''}`}>
          {navItems.flatMap((item) => {
            if ('children' in item && item.children) {
              const parentActive = isParentActive(item.children);
              const subMenuId = dropdownMenuId(navMenuId, item.label);
              const isOpen = activeDropdown === item.label;
              return [
                <li key={item.label} className={`dropdown${isOpen ? ' active' : ''}`}>
                  <button
                    type="button"
                    id={`${subMenuId}-trigger`}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    aria-controls={subMenuId}
                    className={`dropdown-trigger${parentActive ? ' active' : ''}`}
                    onClick={() => setActiveDropdown(isOpen ? null : item.label)}
                    onKeyDown={(e) => handleDropdownKeyDown(e, item.label, isOpen, subMenuId)}
                  >
                    {item.label}
                  </button>
                  <ul className="dropdown-menu" id={subMenuId} role="menu" aria-labelledby={`${subMenuId}-trigger`}>
                    {item.children.map((child) => (
                      <li key={child.href} role="none">
                        <Link href={child.href} role="menuitem" className={isActive(child.href) ? 'active' : undefined} onClick={closeMobile}>
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>,
              ];
            }
            return [
              <li key={item.href}>
                <Link href={item.href!} className={isActive(item.href!) ? 'active' : undefined} onClick={closeMobile}>
                  {item.label}
                </Link>
              </li>,
            ];
          })}
          <li
            key="nav-login-portal"
            className={`dropdown nav-login-dropdown${isLoginMenuOpen ? ' active' : ''}`}
          >
            <div className="nav-login-split">
              <Link
                href={portalState.primary.href}
                className={`nav-login-primary${portalHrefActive(portalState.primary.href) ? ' active' : ''}`}
                onClick={closeMobile}
              >
                {portalState.primary.label}
              </Link>
              {loginSubmenuItems.length > 0 ? (
                <button
                  type="button"
                  id={`${loginDropdownId}-trigger`}
                  className={`nav-login-flyout-trigger${isLoginMenuOpen ? ' active' : ''}`}
                  aria-expanded={isLoginMenuOpen}
                  aria-haspopup="true"
                  aria-controls={loginDropdownId}
                  onClick={() => setActiveDropdown(isLoginMenuOpen ? null : '__login__')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveDropdown(isLoginMenuOpen ? null : '__login__');
                    }
                    if (e.key === 'Escape') setActiveDropdown(null);
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      if (!isLoginMenuOpen) setActiveDropdown('__login__');
                      queueMicrotask(() => {
                        document.getElementById(loginDropdownId)?.querySelector<HTMLElement>('a[href]')?.focus();
                      });
                    }
                  }}
                  aria-label="More sign-in and portal options"
                >
                  <span className="nav-login-flyout-chevron" aria-hidden />
                </button>
              ) : null}
            </div>
            {loginSubmenuItems.length > 0 ? (
              <ul className="dropdown-menu nav-login-flyout-menu" id={loginDropdownId} role="menu">
                {loginSubmenuItems.map((item) => (
                  <li key={item.href} role="none">
                    <Link
                      href={item.href}
                      role="menuitem"
                      className={portalHrefActive(item.href.split('?')[0]) ? 'active' : undefined}
                      onClick={closeMobile}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
          <li>
            <Link href="/apply" className="nav-cta" onClick={closeMobile}>Apply Now</Link>
          </li>
          <li className="nav-theme-mobile-item" key="theme-toggle-mobile">
            <div className="nav-theme-mobile-wrapper">
              <ThemeToggle variant="marketing" />
            </div>
          </li>
        </ul>

        {/* Desktop-only theme toggle */}
        <div className="nav-theme-slot-desktop">
          <ThemeToggle variant="marketing" />
        </div>
      </div>
    </nav>
  );
}
