import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: 'Verify multi-factor authentication',
    description: 'Enter your verification code to access your WorkforceAP account.',
    path: '/verify-mfa',
  }),
  robots: { index: false, follow: false },
};

export default function VerifyMfaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
