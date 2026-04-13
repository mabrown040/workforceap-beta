'use client';

import VoiceCoachLauncherCard from '@/components/portal/VoiceCoachLauncherCard';
import { mockInterviewVoiceSurface, readinessVoiceSurface, resumeCoachVoiceSurface } from '@/lib/portal/voice';

/**
 * AI toolkit voice section — compact 3-column grid so all coaches are
 * immediately visible without scrolling.
 */
export default function VoiceCoachesPromo() {
  return (
    <section
      aria-label="Voice AI coaches"
      style={{
        maxWidth: '1100px',
        margin: '0 auto 1.5rem',
        padding: '0 clamp(1rem, 4vw, 1.5rem)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>mic</span>
        <h2 style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', margin: 0 }}>
          Voice AI Coaches
        </h2>
        <span style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)', marginLeft: '0.25rem' }}>Powered by ElevenLabs</span>
      </div>

      {/* 3-column compact grid on desktop, 1-column on mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
        <VoiceCoachLauncherCard
          {...readinessVoiceSurface}
          title="Career Readiness"
          description="Open your dedicated readiness flow to talk through interviews, certifications, and next steps with more room to focus."
          href="/dashboard/readiness"
          ctaLabel="Open readiness coach"
        />

        <VoiceCoachLauncherCard
          {...resumeCoachVoiceSurface}
          title="Resume & Experience"
          description="Open the full resume coach flow to practice your story out loud and approve edits inside a synced live draft."
          href="/dashboard/ai-tools/resume-coach"
          ctaLabel="Open resume coach"
        />

        <VoiceCoachLauncherCard
          {...mockInterviewVoiceSurface}
          title="Voice Interviewer"
          description="Launch the dedicated mock interview flow with setup guidance, optional recording, and live coaching feedback."
          href="/dashboard/ai-tools/voice-interview"
          ctaLabel="Start mock interview"
        />
      </div>
    </section>
  );
}
