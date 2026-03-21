'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
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
      { href: '/find-your-path', label: 'Find Your Path' },
      { href: '/program-comparison', label: 'Program Comparison' },
      { href: '/salary-guide', label: 'Salary Guide' },
    ],
  },
  { href: '/jobs', label: 'Jobs' },
  { href: '/blog', label: 'Blog' },
  { href: '/faq', label: 'FAQ' },
  { href: '/apply', label: 'Apply Now', cta: true },
  { href: '/login', label: 'Sign in', portalEntry: true },
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
    <nav className={`main-nav${scrolled ? ' scrolled' : ''}`} aria-label="Main navigation">
      <div className="nav-container">
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
        <button
          type="button"
          className={`mobile-nav-backdrop${mobileOpen ? ' visible' : ''}`}
          aria-label="Close navigation menu"
          aria-hidden={!mobileOpen}
          tabIndex={mobileOpen ? 0 : -1}
          onClick={closeMobile}
        />
        <ul ref={menuRef} id={navMenuId} className={`nav-menu${mobileOpen ? ' mobile-open' : ''}`}>
          {mobileOpen && (
            <li className="mobile-nav-close">
              <button type="button" onClick={closeMobile} aria-label="Close navigation">
                &times;
              </button>
            </li>
          )}
          {navItems.flatMap((item) => {
            if ('children' in item && item.children) {
              const parentActive = isParentActive(item.children);
              const subMenuId = dropdownMenuId(navMenuId, item.label);
              const isOpen = activeDropdown === item.label;
              return [
                <li key={item.label} className={`dropdown${isOpen ? ' active' : ''}`}>
                  <span
                    id={`${subMenuId}-trigger`}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    aria-controls={subMenuId}
                    className={parentActive ? 'active' : undefined}
                    onClick={() => setActiveDropdown(isOpen ? null : item.label)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveDropdown(isOpen ? null : item.label);
                      }
                    }}
                  >
                    {item.label}
                  </span>
                  <ul className="dropdown-menu" id={subMenuId} aria-labelledby={`${subMenuId}-trigger`}>
                    {item.children.map((child) => (
                      <li key={child.href}>
                        <Link
                          href={child.href}
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
            const isPortalEntry = 'portalEntry' in item && item.portalEntry;
            if (isPortalEntry) {
              return portalLinks.map((pl) => (
                <li key={`portal-${pl.href}-${pl.label}`}>
                  <Link
                    href={pl.href}
                    className={portalHrefActive(pl.href) ? 'active' : undefined}
                    onClick={closeMobile}
                  >
                    {pl.label}
                  </Link>
                </li>
              ));
            }
            return [
              <li key={item.href}>
                <Link
                  href={item.href!}
                  className={`${item.cta ? 'nav-cta' : ''}${isActive(item.href!) ? ' active' : ''}`}
                  onClick={closeMobile}
                >
                  {item.label}
                </Link>
              </li>,
            ];
          })}
        </ul>
      </div>
    </nav>
  );
}
