import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: 'Reset password',
    description: 'Forgot your password? Enter your email and we\'ll send a secure reset link to your inbox.',
    path: '/forgot-password',
  }),
  robots: { index: false, follow: false },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
