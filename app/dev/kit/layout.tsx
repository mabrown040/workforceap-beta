import type { ReactNode } from 'react';
// Pull in the portal token + kit CSS so the proof page styles resolve outside
// the (portal)/admin layouts.
import '@/css/portal.css';

export const metadata = { title: 'Design Kit — Dev Proof', robots: { index: false, follow: false } };

export default function DevKitLayout({ children }: { children: ReactNode }) {
  return <div style={{ background: 'var(--wa-bg)', minHeight: '100vh' }}>{children}</div>;
}
