import type { ReactNode } from 'react';
import '@/css/portal.css';

export const metadata = {
  title: 'Voice Studio — Dev Proof',
  robots: { index: false, follow: false },
};

export default function DevVoiceStudioLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
