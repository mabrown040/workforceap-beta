'use client';

import VoiceCoachLauncherCard from '@/components/portal/VoiceCoachLauncherCard';
import { mockInterviewVoiceSurface, readinessVoiceSurface, resumeCoachVoiceSurface } from '@/lib/portal/voice';

/**
 * AI toolkit voice section — compact 5-column grid so all core coaches are
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
          AI Coaches
        </h2>
      </div>

      {/* 5-column compact grid on desktop, 1-column on mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
        <VoiceCoachLauncherCard
          {...readinessVoiceSurface}
          title="AI Readiness Coach"
          description="Talk through your next milestone, interview prep, and certifications with the dashboard AI coach."
          href="/dashboard/readiness"
          ctaLabel="Talk to AI coach"
        />

        <VoiceCoachLauncherCard
          badge="Quick intro"
          icon="🎤"
          glowColor="#7c3aed"
          gradient="linear-gradient(135deg, #5b21b6, #7c3aed, #c4b5fd)"
          title="AI Elevator Speech"
          description="Generate a clean 10 to 20 second intro, save it, and email it to yourself right away."
          href="/dashboard/ai-tools/elevator-pitch"
          ctaLabel="Build elevator speech"
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

        <VoiceCoachLauncherCard
          badge="Career & Business"
          icon="💼"
          glowColor="#0d9488"
          gradient="linear-gradient(135deg, #0f766e, #0d9488, #5eead4)"
          title="Career & Business Coach"
          description="Get broader career, project management, sales, marketing, and business guidance in one place."
          href="/dashboard/ai-tools/career-business-coach"
          ctaLabel="Open career coach"
        />
      </div>
    </section>
  );
}
