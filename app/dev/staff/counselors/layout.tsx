import type { ReactNode } from 'react';
import '@/css/portal.css';

export const metadata = {
  title: 'Counselors Roster — Staff Showcase',
  robots: { index: false, follow: false },
};

export default function DevStaffCounselorsLayout({ children }: { children: ReactNode }) {
  return <div style={{ background: 'var(--wa-bg)', minHeight: '100vh' }}>{children}</div>;
}
