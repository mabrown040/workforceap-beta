import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { buildPageMetadataAsync } from '@/app/seo';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  const base = await buildPageMetadataAsync({
    title: t('mfaVerify.metaTitle'),
    description: t('mfaVerify.metaDescription'),
    path: '/verify-mfa',
  });
  return { ...base, robots: { index: false, follow: false } };
}

export default function VerifyMfaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
