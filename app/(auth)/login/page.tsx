import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { normalizePostLoginRedirect } from '@/lib/auth/postLoginRedirect';
import { getUser } from '@/lib/auth/server';
import LoginForm from './LoginForm';

export async function generateMetadata(): Promise<Metadata> {
  const base = await buildPageMetadataAsync({
    title: 'Sign In',
    description:
      'Sign in to your WorkforceAP account — member, partner, or employer portal. Same account; choose your destination before you log in.',
    path: '/login',
  });
  return { ...base, robots: { index: false, follow: false } };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const [user, sp] = await Promise.all([getUser(), searchParams]);
  const rawRedirect = typeof sp?.redirectTo === 'string' ? sp.redirectTo : undefined;
  const normalizedRedirect = normalizePostLoginRedirect(rawRedirect, '/dashboard');

  if (user) {
    redirect(normalizedRedirect);
  }

  if (rawRedirect && rawRedirect !== normalizedRedirect) {
    redirect(`/login?redirectTo=${encodeURIComponent(normalizedRedirect)}`);
  }

  return <LoginForm initialRedirectTo={normalizedRedirect} />;
}
