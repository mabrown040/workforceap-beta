'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { href: '/find-your-path', label: 'Career Quiz (2 min)' },
  { href: '/programs', label: 'Programs' },
  { href: '/employers', label: 'Employers' },
  { href: '/what-we-do', label: 'About' },
];

export default function StitchNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="wa-fixed wa-top-0 wa-left-0 wa-right-0 wa-z-50 wa-bg-m3d-surface/60 wa-backdrop-blur-xl shadow-[0_8px_32px_rgba(173,44,77,0.08)]">
      <div className="wa-mx-auto wa-max-w-7xl wa-flex wa-items-center wa-justify-between wa-px-4 wa-py-3">
        {/* Wordmark */}
        <Link href="/" className="wa-text-xl wa-font-bold wa-tracking-tighter wa-text-m3d-on-surface">
          WorkforceAP
        </Link>

        {/* Desktop nav links */}
        <div className="wa-hidden md:wa-flex wa-items-center wa-gap-8">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`wa-text-sm wa-font-medium wa-transition-colors ${
                  isActive
                    ? 'wa-text-m3d-primary wa-border-b-2 wa-border-m3d-primary-container wa-pb-1'
                    : 'wa-text-m3d-on-surface-variant hover:wa-text-m3d-on-surface'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="wa-flex wa-items-center wa-gap-3">
          <Link
            href="/apply"
            className="wa-bg-m3d-primary-container wa-text-white wa-px-6 wa-py-2 wa-rounded-lg wa-font-bold wa-text-sm wa-transition-opacity hover:wa-opacity-90"
          >
            Apply Now
          </Link>

          {/* Mobile hamburger */}
          <button
            className="md:wa-hidden wa-p-2 wa-text-m3d-on-surface"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:wa-hidden wa-bg-m3d-surface-container wa-border-t wa-border-m3d-outline-variant/20 wa-px-4 wa-pb-4">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`wa-block wa-py-3 wa-text-sm wa-font-medium wa-border-b wa-border-m3d-outline-variant/10 ${
                  isActive
                    ? 'wa-text-m3d-primary'
                    : 'wa-text-m3d-on-surface-variant'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
