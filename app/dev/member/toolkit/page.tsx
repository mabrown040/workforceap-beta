import { notFound } from 'next/navigation';
import {
  VoiceStudioKit,
  type VoiceStudioAgentKey,
} from '@/components/portal/kit/pages/VoiceStudioKit';

/**
 * Credential-free proof for the live Career Studio hub
 * (`/dashboard/ai-tools` → VoiceStudioKit). Voice coaches, live practice,
 * Resume Studio, and the AI toolkit stay in one place — do not swap this
 * for a destination tool list.
 */
export const dynamic = 'force-dynamic';

const STUDIO_TABS = ['coaches', 'session', 'studio', 'toolkit'] as const;
type StudioTab = (typeof STUDIO_TABS)[number];
const STUDIO_AGENTS: VoiceStudioAgentKey[] = ['readiness', 'resume', 'mock', 'counselor', 'business'];

export default async function DevMemberToolkitPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; agent?: string }>;
}) {
  if (process.env.VERCEL_ENV === 'production') notFound();

  const params = await searchParams;
  const requestedTab = typeof params?.tab === 'string' ? params.tab : '';
  const requestedAgent = typeof params?.agent === 'string' ? params.agent : '';
  const initialTab: StudioTab = (STUDIO_TABS as readonly string[]).includes(requestedTab)
    ? (requestedTab as StudioTab)
    : 'coaches';
  const initialAgent: VoiceStudioAgentKey | undefined = STUDIO_AGENTS.includes(
    requestedAgent as VoiceStudioAgentKey,
  )
    ? (requestedAgent as VoiceStudioAgentKey)
    : undefined;

  return <VoiceStudioKit initialTab={initialTab} initialAgent={initialAgent} />;
}
