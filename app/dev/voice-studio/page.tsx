import { notFound } from 'next/navigation';
import {
  VoiceStudioKit,
  VOICE_STUDIO_AGENT_KEYS,
  type VoiceStudioAgentKey,
} from '@/components/portal/kit/pages/VoiceStudioKit';

const STUDIO_TABS = ['coaches', 'session', 'studio', 'toolkit'] as const;
type StudioTab = (typeof STUDIO_TABS)[number];

export const dynamic = 'force-static';

export default async function DevVoiceStudioPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; agent?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();

  const params = await searchParams;
  const tab = STUDIO_TABS.includes(params?.tab as StudioTab)
    ? (params?.tab as StudioTab)
    : 'session';
  const agent = VOICE_STUDIO_AGENT_KEYS.includes(params?.agent as VoiceStudioAgentKey)
    ? (params?.agent as VoiceStudioAgentKey)
    : 'readiness';

  return <VoiceStudioKit initialTab={tab} initialAgent={agent} />;
}
