import type { Metadata } from 'next';
import { Suspense } from 'react';
import { buildPageMetadata } from '@/app/seo';
import LoginForm from './LoginForm';

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: 'Sign in',
    description:
      'Sign in to WorkforceAP — member, partner, or employer portal. Same account; choose your destination before you log in.',
    path: '/login',
  }),
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="inner-page" style={{ padding: '4rem 2rem', textAlign: 'center' }}>Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
