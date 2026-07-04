import type { ReactNode } from 'react';
import '@/css/portal.css';

export const metadata = {
  title: 'Cron Monitor — Staff Showcase',
  robots: { index: false, follow: false },
};

export default function DevStaffCronsMonitorLayout({ children }: { children: ReactNode }) {
  return <div style={{ background: 'var(--wa-bg)', minHeight: '100vh' }}>{children}</div>;
}
