import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Reset password',
  description: 'Reset your WorkforceAP member account password.',
  path: '/forgot-password',
});

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
