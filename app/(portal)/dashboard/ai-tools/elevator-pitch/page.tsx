import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prefillElevatorPitch } from '@/lib/ai/prefillFromMemberState';
import { ElevatorPitchKit } from '@/components/portal/kit/pages/member/ElevatorPitchKit';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
    title: t('elevatorPitchMetaTitle'),
    description: t('elevatorPitchMetaDesc'),
    path: '/dashboard/ai-tools/elevator-pitch',
  });
}

type SearchParams = Promise<{ prefill?: string }>;

export default async function ElevatorPitchPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/elevator-pitch');

  const sp = await searchParams;
  const shouldPrefill = sp.prefill === 'true';
  let initialData: Awaited<ReturnType<typeof prefillElevatorPitch>> | null = null;
  if (shouldPrefill) {
    try {
      initialData = await prefillElevatorPitch(user.id);
    } catch (err) {
      console.error('[elevator-pitch page] prefill failed', err);
    }
  }

  return <ElevatorPitchKit userId={user.id} initialData={initialData} />;
}
