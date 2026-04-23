import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: 'Set new password',
    description: 'Choose a new password for your WorkforceAP account.',
    path: '/reset-password',
  }),
  robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
