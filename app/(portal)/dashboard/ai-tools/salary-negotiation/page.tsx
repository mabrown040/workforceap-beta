import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { SalaryNegotiationKit } from '@/components/portal/kit/pages/member/SalaryNegotiationKit';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
    title: t('salaryNegotiationMetaTitle'),
    description: t('salaryNegotiationMetaDesc'),
    path: '/dashboard/ai-tools/salary-negotiation',
  });
}

export default async function SalaryNegotiationPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/salary-negotiation');

  return <SalaryNegotiationKit userId={user.id} />;
}
