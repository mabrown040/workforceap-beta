import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { VoiceStudioKit } from '@/components/portal/kit/pages/VoiceStudioKit';

/**
 * Voice + Career Studio — the unified voice-AI + career-tools workspace.
 * Four internal tabs (Voice Coaches / Live Session / Resume Studio / AI Toolkit),
 * deep-linkable via ?tab=. Ported from docs/mockups/workforceap-voice-studio.html.
 */
const STUDIO_TABS = ['coaches', 'session', 'studio', 'toolkit'] as const;
type StudioTab = (typeof STUDIO_TABS)[number];

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Voice + Career Studio',
    description:
      'Voice coaching, live mock interviews, the Resume Studio, and the full AI career toolkit — all in one place.',
    path: '/dashboard/ai-tools/studio',
  });
}

export default async function VoiceStudioPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/studio');

  const params = await searchParams;
  const requestedTab = typeof params?.tab === 'string' ? params.tab : '';
  const initialTab: StudioTab | undefined = (STUDIO_TABS as readonly string[]).includes(
    requestedTab,
  )
    ? (requestedTab as StudioTab)
    : undefined;

  return <VoiceStudioKit initialTab={initialTab} />;
}
