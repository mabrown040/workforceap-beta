import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { LinkedInAboutKit } from '@/components/portal/kit/pages/member/LinkedInAboutKit';
import { isReadOnlyPortalAuditHeader } from '@/lib/audit/readOnlyPortalAudit';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
    title: t('linkedinAboutMetaTitle'),
    description: t('linkedinAboutMetaDesc'),
    path: '/dashboard/ai-tools/linkedin-about',
  });
}

export default async function LinkedInAboutPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/linkedin-about');
  const readOnlyAudit = isReadOnlyPortalAuditHeader(await headers());

  return (
    <>
      {readOnlyAudit && (
        <span hidden data-portal-audit-suppressed="linkedin-about-resume-storage-provider" />
      )}
      <LinkedInAboutKit userId={user.id} />
    </>
  );
}
