import { Briefcase } from 'lucide-react';
import PortalVoiceSessionLazy from '@/components/portal/PortalVoiceSessionLazy';
import VoiceAgentSurface from '@/components/portal/VoiceAgentSurface';
import { ToolkitToolChrome } from './ToolkitToolChrome';

/**
 * Member Portal — career and business coach (voice session).
 * PageOpener chrome around VoiceAgentSurface.
 *
 * Target route: app/(portal)/dashboard/ai-tools/career-business-coach
 * Proof: /dev/member/career-business-coach
 * Surface: warm (member-facing).
 */

export function CareerBusinessCoachKit({
  backHref = '/dashboard/ai-tools',
}: {
  backHref?: string;
} = {}) {
  return (
    <ToolkitToolChrome
      title="Career and business coach"
      lede="Talk through project management, sales, marketing, or career growth."
      icon={<Briefcase size={13} aria-hidden="true" />}
      backHref={backHref}
      maxWidth={980}
    >
      <VoiceAgentSurface
        badge="Career & Business Coach"
        headline="Talk through any career or business challenge"
        subtext="Project management, sales, marketing, communication — get guidance tailored to your situation."
        icon={<Briefcase size={22} aria-hidden="true" />}
        glowColor="#ad2c4d"
        gradient="linear-gradient(135deg, #ad2c4d 0%, #8c0f37 100%)"
      >
        <PortalVoiceSessionLazy
          sessionEndpoint="/api/member/career-business-coach/voice-session"
          completionEndpoint="/api/member/career-business-coach/completion"
          title="Career and Business Coach"
          description="Share your challenge — project management, sales, marketing, or career growth."
          accent="#ad2c4d"
          accentDark="#8c0f37"
          speakingLabel="Coach is speaking…"
          listeningLabel="Listening…"
        />
      </VoiceAgentSurface>
    </ToolkitToolChrome>
  );
}
