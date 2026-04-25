import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: 'Set up multi-factor authentication',
    description: 'Secure your WorkforceAP account with multi-factor authentication.',
    path: '/setup-mfa',
  }),
  robots: { index: false, follow: false },
};

export default function SetupMfaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
