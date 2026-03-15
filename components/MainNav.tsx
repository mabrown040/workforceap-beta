'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

const navItems = [
  { href: '/', label: 'Home' },
  {
    label: 'About Us',
    children: [
      { href: '/what-we-do', label: 'What We Do' },
      { href: '/leadership', label: 'Leadership Team' },
    ],
  },
  {
    label: 'Programs',
    children: [
      { href: '/programs', label: 'All Programs' },
      { href: '/program-comparison', label: 'Program Comparison' },
      { href: '/salary-guide', label: 'Salary Guide' },
    ],
  },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/faq', label: 'FAQ' },
  { href: '/apply', label: 'Apply Now', cta: true },
  { href: '/login', label: 'Member Portal' },
  { href: '/contact', label: 'Contact Us' },
];

export default function MainNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [memberPortalHref, setMemberPortalHref] = useState('/login');

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
    document.addEventListener('keydown', onKey);
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('keydown', onKey);
    };
  }, [closeMobile]);

  useEffect(() => {
    const updateMemberPortalHref = () => {
      const hasSupabaseAuthCookie = /(?:^|;\s*)sb-[^=]*-auth-token=/.test(document.cookie);
      setMemberPortalHref(hasSupabaseAuthCookie ? '/dashboard' : '/login');
    };

    updateMemberPortalHref();
    window.addEventListener('focus', updateMemberPortalHref);

    return () => {
      window.removeEventListener('focus', updateMemberPortalHref);
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
          {mobileOpen ? '\u2715' : '\u2630'}
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
            const href = item.href === '/login' ? memberPortalHref : item.href!;
            const memberPortalActive = item.href === '/login' && (pathname === '/login' || pathname === '/dashboard');

            return (
              <li key={item.href}>
                <Link
                  href={href}
                  className={`${item.cta ? 'nav-cta' : ''}${isActive(href) || memberPortalActive ? ' active' : ''}`}
                  onClick={closeMobile}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
