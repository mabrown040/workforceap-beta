'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_TABS = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/find-your-path', label: 'Quiz', icon: 'quiz' },
  { href: '/programs', label: 'Programs', icon: 'school' },
  { href: '/apply', label: 'Apply', icon: 'assignment_turned_in' },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 w-full md:hidden z-50 flex justify-around items-center px-2 pb-safe pt-2"
      style={{
        background: 'rgba(252, 249, 248, 0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(222, 191, 194, 0.3)',
      }}
    >
      {NAV_TABS.map(({ href, label, icon }) => {
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl min-w-[56px] transition-all duration-150 active:scale-95"
            style={
              isActive
                ? { background: 'linear-gradient(135deg, #8c0f37, #ad2c4d)', color: '#fff' }
                : { color: '#584144' }
            }
          >
            <span
              className="material-symbols-outlined text-[22px] leading-none"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {icon}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest leading-none">
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
