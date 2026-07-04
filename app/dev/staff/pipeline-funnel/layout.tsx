import type { ReactNode } from 'react';
import '@/css/portal.css';

export const metadata = {
  title: 'Pipeline Funnel — Staff Showcase',
  robots: { index: false, follow: false },
};

export default function DevStaffPipelineFunnelLayout({ children }: { children: ReactNode }) {
  return <div style={{ background: 'var(--wa-bg)', minHeight: '100vh' }}>{children}</div>;
}
