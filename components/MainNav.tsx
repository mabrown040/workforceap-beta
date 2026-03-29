'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback, useRef, useId } from 'react';

const navItems = [
  { href: '/', label: 'Home' },
  {
    label: 'About Us',
    children: [
      { href: '/what-we-do', label: 'What We Do' },
      { href: '/partners', label: 'Partners' },
      { href: '/leadership', label: 'Leadership Team' },
      { href: '/employers', label: 'For Employers' },
    ],
  },
  { href: '/how-it-works', label: 'How It Works' },
  {
    label: 'Programs',
    children: [
      { href: '/programs', label: 'All Programs' },
      { href: '/find-your-path', label: 'Find Your Career' },
      { href: '/program-comparison', label: 'Program Comparison' },
      { href: '/salary-guide', label: 'Salary Guide' },
    ],
  },
  { href: '/jobs', label: 'Jobs' },
  { href: '/blog', label: 'Blog' },
  { href: '/faq', label: 'FAQ' },
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
  const [portalLinks, setPortalLinks] = useState<{ href: string; label: string }[]>([{ href: '/login', label: 'Sign in' }]);
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
            setPortalLinks([{ href: '/login', label: 'Sign in' }]);
            return;
          }
          const partnerExclusive = !!data.partner && !data.superAdmin;
          if (partnerExclusive) {
            setPortalLinks([{ href: '/partner', label: 'Partner Portal' }]);
            return;
          }
          const links: { href: string; label: string }[] = [];
          if (data.canAccessMemberDashboard) {
            links.push({ href: '/dashboard', label: 'Member Portal' });
          }
          if (data.employer) {
            links.push({ href: '/employer', label: 'Employer Portal' });
          }
          if (links.length === 0) {
            links.push({ href: '/dashboard', label: 'Member Portal' });
          }
          setPortalLinks(links);
        } catch {
          if (!cancelled) setPortalLinks([{ href: '/login', label: 'Sign in' }]);
        }
      })();
    };

    refreshPortalLinks();
    window.addEventListener('focus', refreshPortalLinks);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', refreshPortalLinks);
    };
  }, []);

  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  useEffect(() => {
    if (!mobileOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const menu = menuRef.current;
    if (!menu) return;

    const getFocusable = () =>
      Array.from(
        menu.querySelectorAll<HTMLElement>(
          'a[href]:not([tabindex="-1"]), button:not([disabled]):not([aria-hidden="true"])'
        )
      ).filter((el) => !el.hasAttribute('disabled'));

    const t = window.setTimeout(() => getFocusable()[0]?.focus(), 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMobile();
        toggleRef.current?.focus();
        return;
      }
      if (e.key !== 'Tab' || !menu) return;
      const focusables = getFocusable();
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [mobileOpen, closeMobile]);

  useEffect(() => {
    if (!activeDropdown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveDropdown(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [activeDropdown]);

  useEffect(() => {
    if (!activeDropdown) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const root = navContainerRef.current;
      const t = e.target;
      if (!root || !(t instanceof Node) || root.contains(t)) return;
      setActiveDropdown(null);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [activeDropdown]);

  const toggleMobile = () => {
    if (mobileOpen) {
      closeMobile();
    } else {
      setMobileOpen(true);
      document.body.classList.add('mobile-nav-open');
    }
  };

  const isActive = (href: string) => pathname === href;
  const isParentActive = (children: { href: string }[]) => children.some((c) => pathname === c.href);

  const handleDropdownKeyDown = useCallback(
    (e: React.KeyboardEvent, label: string, isOpen: boolean, subMenuId: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setActiveDropdown(isOpen ? null : label);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setActiveDropdown(null);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!isOpen) setActiveDropdown(label);
        queueMicrotask(() => {
          document.getElementById(subMenuId)?.querySelector<HTMLElement>('a[href]')?.focus();
        });
      }
    },
    []
  );

  const portalHrefActive = (href: string) => {
    if (href === '/login' || href.startsWith('/login?')) {
      return pathname === '/login';
    }
    return (
      pathname === href ||
      (href === '/dashboard' && pathname.startsWith('/dashboard')) ||
      (href === '/employer' && pathname.startsWith('/employer')) ||
      (href === '/partner' && pathname.startsWith('/partner'))
    );
  };

  return (
    <nav
      className={`main-nav glass-nav${scrolled ? ' scrolled' : ''}`}
      aria-label="Main navigation"
      style={{
        position: 'fixed',
        top: 0,
        width: '100%',
        zIndex: 50,
        borderBottom: '1px solid var(--outline-variant, rgba(255,255,255,0.06))',
      }}
    >
      <div className="nav-container" ref={navContainerRef} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1400px', margin: '0 auto', padding: '0 2rem' }}>
        <Link href="/" className="logo" aria-label="Workforce Advancement Project home" onClick={closeMobile}>
          <Image
            src="/images/logo-tight.png"
            alt="Workforce Advancement Project"
            width={1930}
            height={985}
            className="nav-logo-image"
            sizes="(max-width: 900px) 130px, 210px"
            quality={85}
            priority
          />
        </Link>

        {/* Desktop nav links */}
        <div className="nav-desktop-links" style={{ display: 'none' }}>
          {navItems.map((item) => {
            if ('children' in item && item.children) {
              const parentActive = isParentActive(item.children);
              const subMenuId = dropdownMenuId(navMenuId, item.label);
              const isOpen = activeDropdown === item.label;
              return (
                <div key={item.label} className={`dropdown${isOpen ? ' active' : ''}`} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    id={`${subMenuId}-trigger`}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    aria-controls={subMenuId}
                    className={`nav-link-glass${parentActive ? ' nav-link-active' : ''}`}
                    onClick={() => setActiveDropdown(isOpen ? null : item.label)}
                    onKeyDown={(e) => handleDropdownKeyDown(e, item.label, isOpen, subMenuId)}
                  >
                    {item.label}
                  </button>
                  {isOpen && (
                    <ul className="dropdown-menu glass-panel" id={subMenuId} role="menu" aria-labelledby={`${subMenuId}-trigger`} style={{ position: 'absolute', top: '100%', left: 0, minWidth: '200px', marginTop: '0.5rem', padding: '0.5rem 0' }}>
                      {item.children.map((child) => (
                        <li key={child.href} role="none">
                          <Link
                            href={child.href}
                            role="menuitem"
                            className={`dropdown-item-glass${isActive(child.href) ? ' nav-link-active' : ''}`}
                            onClick={closeMobile}
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href!}
                className={`nav-link-glass${isActive(item.href!) ? ' nav-link-active' : ''}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Right side: portal links + Apply CTA + theme toggle */}
        <div className="nav-right-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {portalLinks.map((pl) => (
            <Link
              key={`portal-${pl.href}`}
              href={pl.href}
              className={`nav-login-btn${portalHrefActive(pl.href) ? ' nav-link-active' : ''}`}
            >
              {pl.label}
            </Link>
          ))}
          <Link href="/apply" className="nav-apply-btn">
            Apply Now
          </Link>
          <div className="nav-theme-slot-desktop">
            <ThemeToggle variant="marketing" />
          </div>
        </div>

        {/* Mobile toggle */}
        <button
          ref={toggleRef}
          type="button"
          className="mobile-nav-toggle"
          aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileOpen}
          aria-controls={navMenuId}
          onClick={toggleMobile}
        >
          {mobileOpen ? <X size={26} strokeWidth={2} aria-hidden /> : <Menu size={26} strokeWidth={2} aria-hidden />}
        </button>

        {/* Mobile backdrop */}
        <button
          type="button"
          className={`mobile-nav-backdrop${mobileOpen ? ' visible' : ''}`}
          aria-label="Close navigation menu"
          tabIndex={mobileOpen ? 0 : -1}
          onClick={closeMobile}
          {...(!mobileOpen ? { 'data-nav-hidden': 'true' } : {})}
        />

        {/* Mobile menu */}
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
                        <Link
                          href={child.href}
                          role="menuitem"
                          className={isActive(child.href) ? 'active' : undefined}
                          onClick={closeMobile}
                        >
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
                <Link
                  href={item.href!}
                  className={isActive(item.href!) ? 'active' : undefined}
                  onClick={closeMobile}
                >
                  {item.label}
                </Link>
              </li>,
            ];
          })}
          {portalLinks.map((pl) => (
            <li key={`mobile-portal-${pl.href}`}>
              <Link href={pl.href} className={portalHrefActive(pl.href) ? 'active' : undefined} onClick={closeMobile}>
                {pl.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/apply" className="nav-cta" onClick={closeMobile}>Apply Now</Link>
          </li>
          <li className="nav-theme-mobile-item" key="theme-toggle-mobile">
            <div className="nav-theme-mobile-wrapper">
              <ThemeToggle variant="marketing" />
            </div>
          </li>
        </ul>
      </div>
    </nav>
  );
}
