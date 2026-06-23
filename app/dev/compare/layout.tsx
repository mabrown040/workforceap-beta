import type { ReactNode } from 'react';

export const metadata = {
  title: 'Portal UI Decision Board — Dev',
  robots: { index: false, follow: false },
};

export default function DevCompareLayout({ children }: { children: ReactNode }) {
  return <div style={{ background: '#fff', minHeight: '100vh' }}>{children}</div>;
}
