import type { ReactNode } from 'react';
import '@/css/portal.css';

export const metadata = { title: 'Member Dashboard — Redesign Preview', robots: { index: false, follow: false } };

export default function DevDashboardLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
