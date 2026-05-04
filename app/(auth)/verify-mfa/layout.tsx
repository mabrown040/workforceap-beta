import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';

export async function generateMetadata(): Promise<Metadata> {
  const base = await buildPageMetadataAsync({
    title: 'Verify multi-factor authentication',
    description: 'Enter your verification code to access your WorkforceAP account.',
    path: '/verify-mfa',
  });
  return { ...base, robots: { index: false, follow: false } };
}

export default function VerifyMfaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
