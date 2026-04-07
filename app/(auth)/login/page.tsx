import type { Metadata } from 'next';
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

  return <LoginForm initialRedirectTo={normalizedRedirect} />;
}
