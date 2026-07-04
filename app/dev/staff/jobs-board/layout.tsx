import type { ReactNode } from 'react';
import '@/css/portal.css';

export const metadata = {
  title: 'Jobs Board — Staff Showcase',
  robots: { index: false, follow: false },
};

export default function DevStaffJobsBoardLayout({ children }: { children: ReactNode }) {
  return <div style={{ background: 'var(--wa-bg)', minHeight: '100vh' }}>{children}</div>;
}
