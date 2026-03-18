import type { Metadata } from 'next';
import { Suspense } from 'react';
import { buildPageMetadata } from '@/app/seo';
import LoginForm from './LoginForm';

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: 'Log in',
    description: 'Log in to your WorkforceAP member account.',
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
