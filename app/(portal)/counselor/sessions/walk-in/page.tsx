import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import WalkInSessionClient from '@/components/portal/sessions/WalkInSessionClient';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('counselor');
  return buildPageMetadataAsync({
    title: t('walkInSessionMetaTitle'),
    description: t('walkInSessionMetaDesc'),
    path: '/counselor/sessions/walk-in',
  });
}

export default async function WalkInSessionPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/counselor/sessions/walk-in');

  const [counselorRole, adminRole] = await Promise.all([isCounselor(user.id), isAdmin(user.id)]);
  // Admins who aren't counselors belong in admin chrome, not counselor chrome
  if (!counselorRole) {
    if (adminRole) redirect('/admin/sessions/walk-in');
    redirect('/dashboard');
  }

  const t = await getTranslations('counselor');

  return (
    <>
      <PageHeader
        title={t('walkInSessionTitle')}
        subtitle={t('walkInSessionSubtitle')}
        breadcrumbs={[
          { label: t('counselor'), href: '/counselor' },
          { label: t('inOfficeSessions'), href: '/counselor/sessions' },
          { label: t('walkInSession') },
        ]}
      />
      <WalkInSessionClient counselorName={user.email ?? 'your counselor'} />
    </>
  );
}
