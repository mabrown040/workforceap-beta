'use client';

import VoiceCoachLauncherCard from '@/components/portal/VoiceCoachLauncherCard';
import { mockInterviewVoiceSurface, readinessVoiceSurface, resumeCoachVoiceSurface } from '@/lib/portal/voice';

const AI_COACHES_BAND_STYLE = {
  padding: '1.25rem clamp(0.75rem, 3vw, 1.25rem) 1.5rem',
  borderRadius: '1rem',
  background:
    'linear-gradient(180deg, color-mix(in srgb, #2563eb 16%, var(--surface-container-low)) 0%, color-mix(in srgb, #60a5fa 12%, var(--surface-container-low)) 45%, color-mix(in srgb, #2563eb 14%, var(--surface-container-low)) 100%)',
  border: '1px solid color-mix(in srgb, #3b82f6 22%, var(--outline-variant))',
  boxShadow: 'inset 0 1px 0 color-mix(in srgb, #fff 35%, transparent)',
} as const;

/** Member home (`/dashboard`) — four voice tools in product order inside a soft blue band. */
export default function MemberDashboardVoiceSection() {
  return (
    <section aria-label="AI coaches">
      <div style={AI_COACHES_BAND_STYLE}>
        <h2
          className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-[0.1em]"
          style={{ color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}
        >
          AI coaches
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            alignItems: 'stretch',
          }}
        >
          <VoiceCoachLauncherCard
            badge="Introduction"
            icon="🎤"
            glowColor="#7c3aed"
            gradient="linear-gradient(135deg, #5b21b6, #7c3aed, #c4b5fd)"
            title="AI Elevator Introduction"
            description="Generate a clean 10 to 20 second intro, save it, and email it to yourself right away."
            href="/dashboard/ai-tools/elevator-pitch"
            ctaLabel="Start elevator introduction"
          />
          <VoiceCoachLauncherCard
            {...readinessVoiceSurface}
            title="AI Readiness Coach"
            description="Talk through your next milestone, interview prep, and certifications with the dashboard AI coach."
            href="/dashboard/readiness"
            ctaLabel="Start readiness coach"
          />
          <VoiceCoachLauncherCard
            {...resumeCoachVoiceSurface}
            badge="Resume enhancer"
            title="Resume & Experience Enhancer"
            description="Open the dedicated resume coach to practice your pitch and refine your resume inside a synced workspace."
            href="/dashboard/ai-tools/resume-studio?view=coach"
            ctaLabel="Start resume enhancer"
          />
          <VoiceCoachLauncherCard
            {...mockInterviewVoiceSurface}
            badge="Job / role interview"
            title="Voice Interview Practice"
            description="Launch the full mock interview experience with setup guidance and optional recording."
            href="/dashboard/ai-tools/voice-interview"
            ctaLabel="Start voice interviewer"
          />
        </div>
      </div>
    </section>
  );
}
