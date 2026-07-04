import type { ReactNode } from 'react';
import '@/css/portal.css';

export const metadata = {
  title: 'Placements — Staff Showcase',
  robots: { index: false, follow: false },
};

export default function DevStaffPlacementsLayout({ children }: { children: ReactNode }) {
  return <div style={{ background: 'var(--wa-bg)', minHeight: '100vh' }}>{children}</div>;
}
