import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { sanitizeRedirectPath } from '@/lib/auth/safeRedirectPath';
import SignupForm from './SignupForm';

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: 'Member signup',
    description: 'Create your WorkforceAP member account to apply for programs and track your progress.',
    path: '/signup',
  }),
  robots: { index: false, follow: false },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const sp = await searchParams;
  const rawRedirect = typeof sp?.redirectTo === 'string' ? sp.redirectTo : undefined;
  const normalizedRedirect = sanitizeRedirectPath(rawRedirect, '/dashboard');

  if (rawRedirect && rawRedirect !== normalizedRedirect) {
    redirect(`/signup?redirectTo=${encodeURIComponent(normalizedRedirect)}`);
  }

  return <SignupForm initialRedirectTo={normalizedRedirect} />;
}
