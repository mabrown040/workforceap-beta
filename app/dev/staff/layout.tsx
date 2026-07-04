import type { ReactNode } from 'react';
// Full portal stylesheet chain so staff-side kits (incl. the counselor roster,
// which needs counselor.css) render exactly as production does.
import '@/css/portal.css';
import '@/css/portal-a11y.css';
import '@/css/dark-mode.css';
import '@/css/counselor.css';
import '@/css/language-toggle.css';
import '@/css/mobile-dashboard-fixes.css';

export const metadata = { robots: { index: false, follow: false } };

export default function DevStaffLayout({ children }: { children: ReactNode }) {
  return children;
}
