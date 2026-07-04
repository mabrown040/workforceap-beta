import type { ReactNode } from 'react';
// Match the real portal's stylesheet chain (app/(portal)/layout.tsx) so the
// showcase renders the kit exactly as production does. portal.css @imports
// portal-kit.css, where the wa-kit-* classes live — without this the member
// kits render essentially unstyled.
import '@/css/portal.css';
import '@/css/portal-a11y.css';
import '@/css/dark-mode.css';
import '@/css/counselor.css';
import '@/css/language-toggle.css';
import '@/css/mobile-dashboard-fixes.css';

export const metadata = { robots: { index: false, follow: false } };

export default function DevMemberLayout({ children }: { children: ReactNode }) {
  return children;
}
