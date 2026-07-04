import type { ReactNode } from 'react';
import '@/css/portal.css';

export const metadata = {
  title: 'Partner Overview — Staff Showcase',
  robots: { index: false, follow: false },
};

export default function DevStaffPartnerLayout({ children }: { children: ReactNode }) {
  return <div style={{ background: 'var(--wa-bg)', minHeight: '100vh' }}>{children}</div>;
}
