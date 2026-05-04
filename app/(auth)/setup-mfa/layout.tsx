import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';

export async function generateMetadata(): Promise<Metadata> {
  const base = await buildPageMetadataAsync({
    title: 'Set up multi-factor authentication',
    description: 'Secure your WorkforceAP account with multi-factor authentication.',
    path: '/setup-mfa',
  });
  return { ...base, robots: { index: false, follow: false } };
}

export default function SetupMfaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
