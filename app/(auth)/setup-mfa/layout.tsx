import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { buildPageMetadataAsync } from '@/app/seo';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  const base = await buildPageMetadataAsync({
    title: t('mfaSetup.metaTitle'),
    description: t('mfaSetup.metaDescription'),
    path: '/setup-mfa',
  });
  return { ...base, robots: { index: false, follow: false } };
}

export default function SetupMfaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
