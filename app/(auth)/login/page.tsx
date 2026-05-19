import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { normalizePostLoginRedirect, resolveRoleAwarePostLoginRedirect } from '@/lib/auth/postLoginRedirect';
import { getUser } from '@/lib/auth/server';
import { getProfileRole } from '@/lib/auth/roles';
import { getRequestLocale } from '@/lib/i18n/server';
import { withLocalePrefix } from '@/lib/i18n/config';
import LoginForm from './LoginForm';
import UtmCapture from '@/components/marketing/UtmCapture';
import { Suspense } from 'react';

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
  const [user, sp, locale] = await Promise.all([getUser(), searchParams, getRequestLocale()]);
  const rawRedirect = typeof sp?.redirectTo === 'string' ? sp.redirectTo : undefined;
  const normalizedRedirect = normalizePostLoginRedirect(rawRedirect, withLocalePrefix('/dashboard', locale));

  if (user) {
    const profileRole = await getProfileRole(user.id);
    redirect(resolveRoleAwarePostLoginRedirect(normalizedRedirect, profileRole));
  }

  if (rawRedirect && rawRedirect !== normalizedRedirect) {
    redirect(`${withLocalePrefix('/login', locale)}?redirectTo=${encodeURIComponent(normalizedRedirect)}`);
  }

  return (
    <>
      <Suspense fallback={null}>
        <UtmCapture />
      </Suspense>
      <LoginForm initialRedirectTo={normalizedRedirect} />
    </>
  );
}
