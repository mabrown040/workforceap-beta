'use client';

import VoiceCoachLauncherCard from '@/components/portal/VoiceCoachLauncherCard';
import { mockInterviewVoiceSurface, readinessVoiceSurface, resumeCoachVoiceSurface, studentCounselorVoiceSurface } from '@/lib/portal/voice';

const AI_COACHES_BAND_STYLE = {
  padding: '1.25rem clamp(0.75rem, 3vw, 1.25rem) 1.5rem',
  borderRadius: '1rem',
  background: 'var(--surface-container-low)',
  border: '1px solid var(--outline-variant)',
  boxShadow: 'none',
} as const;

/**
 * AI toolkit voice section — 4 primary cards stacked first, then 2 secondary cards side by side.
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
      <div style={AI_COACHES_BAND_STYLE}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>mic</span>
          <h2 style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', margin: 0 }}>
            AI Coaches
          </h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '0.75rem',
            marginBottom: '0.75rem',
          }}
        >
          <VoiceCoachLauncherCard
            badge="Introduction"
            icon="🎤"
            glowColor="#7c3aed"
            gradient="linear-gradient(135deg, #5b21b6, #7c3aed, #c4b5fd)"
            title="AI Elevator Introduction"
            description="Generate a clean 10 to 20 second intro, save it, and email it to yourself right away."
            href="/dashboard/ai-tools/elevator-pitch?prefill=true"
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
          <VoiceCoachLauncherCard
            {...studentCounselorVoiceSurface}
            title="AI Career Coach"
            description="Private voice session that ends with a personalized 3-step action plan."
            href="/dashboard/counselor"
            ctaLabel="Start career coach"
          />
          <VoiceCoachLauncherCard
            badge="Career Coach"
            icon="💼"
            glowColor="#0d9488"
            gradient="linear-gradient(135deg, #0f766e, #0d9488, #5eead4)"
            title="Career & Business Coach"
            description="Get broader career, project management, sales, marketing, and business guidance in one place."
            href="/dashboard/ai-tools/career-business-coach"
            ctaLabel="Start career & business coach"
          />
        </div>
      </div>
    </section>
  );
}
