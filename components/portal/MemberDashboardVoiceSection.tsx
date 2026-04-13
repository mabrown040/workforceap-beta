'use client';

import VoiceCoachLauncherCard from '@/components/portal/VoiceCoachLauncherCard';
import { mockInterviewVoiceSurface, readinessVoiceSurface, resumeCoachVoiceSurface } from '@/lib/portal/voice';

/** Member home (`/dashboard`) — show all three voice options in a tighter horizontal row on desktop. */
export default function MemberDashboardVoiceSection() {
  return (
    <section aria-label="Voice assistants">
      <h2
        className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-[0.1em]"
        style={{ color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}
      >
        Voice assistants
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          alignItems: 'start',
        }}
      >
        <VoiceCoachLauncherCard
          {...readinessVoiceSurface}
          title="Career Readiness"
          description="Open your full readiness flow to talk through your next milestone, interview prep, and certifications."
          href="/dashboard/readiness"
          ctaLabel="Open readiness coach"
        />
        <VoiceCoachLauncherCard
          {...resumeCoachVoiceSurface}
          title="Resume & Experience"
          description="Open the dedicated resume coach to practice your pitch and refine your resume inside a synced workspace."
          href="/dashboard/ai-tools/resume-coach"
          ctaLabel="Open resume coach"
        />
        <VoiceCoachLauncherCard
          {...mockInterviewVoiceSurface}
          title="Voice Interviewer"
          description="Launch the full mock interview experience with setup guidance and optional recording."
          href="/dashboard/ai-tools/voice-interview"
          ctaLabel="Start mock interview"
        />
      </div>
    </section>
  );
}
