'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, HelpCircle, GraduationCap, FileText } from 'lucide-react';

const items = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/find-your-path', label: 'Quiz', icon: HelpCircle },
  { href: '/programs', label: 'Programs', icon: GraduationCap },
  { href: '/apply', label: 'Apply', icon: FileText },
];

export default function StitchMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:wa-hidden wa-fixed wa-bottom-0 wa-left-0 wa-right-0 wa-z-50 wa-bg-m3d-surface-container-low/80 wa-backdrop-blur-2xl wa-border-t wa-border-m3d-outline-variant/20">
      <div className="wa-flex wa-items-center wa-justify-around wa-py-2">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`wa-flex wa-flex-col wa-items-center wa-gap-0.5 wa-px-3 wa-py-1.5 wa-rounded-xl wa-transition-colors ${
                isActive
                  ? 'wa-text-m3d-primary-container wa-bg-m3d-primary-container/10'
                  : 'wa-text-m3d-on-surface-variant'
              }`}
            >
              <Icon size={20} />
              <span className="wa-text-[10px] wa-uppercase wa-tracking-widest wa-font-medium">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
