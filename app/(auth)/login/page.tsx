import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import LoginForm from './LoginForm';

export const metadata: Metadata = buildPageMetadata({
  title: 'Log in',
  description: 'Log in to your WorkforceAP member account.',
  path: '/login',
});

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const user = await getUser();
  if (user) {
    const { redirectTo } = await searchParams;
    redirect(redirectTo ?? '/dashboard');
  }
  return (
    <Suspense fallback={<div className="inner-page" style={{ padding: '4rem 2rem', textAlign: 'center' }}>Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
