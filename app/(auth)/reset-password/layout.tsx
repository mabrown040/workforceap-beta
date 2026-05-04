import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';

export async function generateMetadata(): Promise<Metadata> {
  const base = await buildPageMetadataAsync({
    title: 'Set new password',
    description: 'Choose a new password for your WorkforceAP account.',
    path: '/reset-password',
  });
  return { ...base, robots: { index: false, follow: false } };
}

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
