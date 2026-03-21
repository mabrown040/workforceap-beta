'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

const navItems = [
  { href: '/', label: 'Home' },
  {
    label: 'About Us',
    children: [
      { href: '/what-we-do', label: 'What We Do' },
      { href: '/partners', label: 'Partners' },
      { href: '/leadership', label: 'Leadership Team' },
      { href: '/employers', label: 'Employers' },
    ],
  },
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
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/blog', label: 'Blog' },
  { href: '/faq', label: 'FAQ' },
  { href: '/apply', label: 'Apply Now', cta: true },
  { href: '/login', label: 'Member Portal', portalEntry: true },
  { href: '/contact', label: 'Contact Us' },
];

export default function MainNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [portalEntry, setPortalEntry] = useState<{ href: string; label: string }>({
    href: '/login',
    label: 'Member Portal',
  });

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
    setActiveDropdown(null);
    document.body.classList.remove('mobile-nav-open');
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.pageYOffset > 60);
    const onResize = () => { if (window.innerWidth > 900) closeMobile(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMobile(); };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    document.addEventListener('keydown', onKey, { capture: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('keydown', onKey, { capture: true });
    };
  }, [closeMobile]);

  useEffect(() => {
    let cancelled = false;

    const refreshPortalHref = () => {
      void (async () => {
        try {
          const res = await fetch('/api/auth/me', { credentials: 'include' });
          const data = (await res.json()) as {
            role: string | null;
            partner: { partnerId: string } | null;
            employer: { employerId: string; companyName: string } | null;
            superAdmin: boolean;
          };
          if (cancelled) return;
          if (!data.role) {
            setPortalEntry({ href: '/login', label: 'Member Portal' });
            return;
          }
          if (data.employer) {
            setPortalEntry({ href: '/employer', label: 'Employer Portal' });
            return;
          }
          if (data.partner && !data.superAdmin) {
            setPortalEntry({ href: '/partner', label: 'Partner Portal' });
            return;
          }
          setPortalEntry({ href: '/dashboard', label: 'Member Portal' });
        } catch {
          if (!cancelled) setPortalEntry({ href: '/login', label: 'Member Portal' });
        }
      })();
    };

    refreshPortalHref();
    window.addEventListener('focus', refreshPortalHref);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', refreshPortalHref);
    };
  }, []);

  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  const toggleMobile = () => {
    if (mobileOpen) {
      closeMobile();
    } else {
      setMobileOpen(true);
      document.body.classList.add('mobile-nav-open');
    }
  };

  const isActive = (href: string) => pathname === href;
  const isParentActive = (children: { href: string }[]) =>
    children.some((c) => pathname === c.href);

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
          type="button"
          className="mobile-nav-toggle"
          aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileOpen}
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
        <ul className={`nav-menu${mobileOpen ? ' mobile-open' : ''}`}>
          {mobileOpen && (
            <li className="mobile-nav-close">
              <button type="button" onClick={closeMobile} aria-label="Close navigation">&times;</button>
            </li>
          )}
          {navItems.map((item) => {
            if ('children' in item && item.children) {
              const parentActive = isParentActive(item.children);
              return (
                <li
                  key={item.label}
                  className={`dropdown${activeDropdown === item.label ? ' active' : ''}`}
                >
                  <span
                    role="button"
                    tabIndex={0}
                    aria-expanded={activeDropdown === item.label}
                    aria-haspopup="true"
                    className={parentActive ? 'active' : undefined}
                    onClick={() =>
                      setActiveDropdown(activeDropdown === item.label ? null : item.label)
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveDropdown(activeDropdown === item.label ? null : item.label);
                      }
                    }}
                  >
                    {item.label}
                  </span>
                  <ul className="dropdown-menu">
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
                </li>
              );
            }
            const isPortalEntry = 'portalEntry' in item && item.portalEntry;
            const href = isPortalEntry ? portalEntry.href : item.href!;
            const portalEntryActive =
              isPortalEntry &&
              (pathname === '/login' ||
                pathname.startsWith('/dashboard') ||
                pathname.startsWith('/partner') ||
                pathname.startsWith('/employer'));
            const linkLabel = isPortalEntry ? portalEntry.label : item.label;

            return (
              <li key={item.href}>
                <Link
                  href={href}
                  className={`${item.cta ? 'nav-cta' : ''}${isActive(href) || portalEntryActive ? ' active' : ''}`}
                  onClick={closeMobile}
                >
                  {linkLabel}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
