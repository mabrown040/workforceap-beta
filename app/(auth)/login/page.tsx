import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { sanitizeRedirectPath } from '@/lib/auth/safeRedirectPath';
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

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const sp = await searchParams;
  const rawRedirect = typeof sp?.redirectTo === 'string' ? sp.redirectTo : undefined;
  const normalizedRedirect = sanitizeRedirectPath(rawRedirect, '/dashboard');

  if (rawRedirect && rawRedirect !== normalizedRedirect) {
    redirect(`/login?redirectTo=${encodeURIComponent(normalizedRedirect)}`);
  }

  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-container-lowest)' }}>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
