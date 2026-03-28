'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MobileBottomNav() {
  const pathname = usePathname();

  const tabs = [
    { href: '/', label: 'Home' },
    { href: '/find-your-path', label: 'Quiz' },
    { href: '/programs', label: 'Programs' },
    { href: '/apply', label: 'Apply' },
    { href: '/login', label: 'Sign In' },
  ];

  return (
    <nav className="wa-fixed wa-bottom-0 wa-left-0 wa-w-full wa-flex wa-justify-around wa-items-center wa-p-3 md:wa-hidden wa-z-50 wa-bg-white/80 dark:wa-bg-[rgba(28,27,27,0.8)] wa-backdrop-blur-xl wa-border-t wa-border-gray-200 dark:wa-border-[rgba(88,65,68,0.15)]">
      {tabs.map(({ href, label }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`wa-flex wa-flex-col wa-items-center wa-no-underline ${
              isActive
                ? 'wa-text-[#ad2c4d] wa-bg-[rgba(113,51,62,0.1)] dark:wa-bg-[rgba(113,51,62,0.2)] wa-rounded-xl wa-px-3 wa-py-1'
                : 'wa-text-gray-600 dark:wa-text-[#debfc2]'
            }`}
          >
            <span className="wa-text-[10px] wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-mt-1">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
