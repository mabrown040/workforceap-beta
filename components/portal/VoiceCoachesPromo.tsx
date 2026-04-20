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
          Recommended First
        </h2>
        <span style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)', marginLeft: '0.25rem' }}>Start with these 4 tools</span>
      </div>

      {/* 4-column compact grid on desktop, 1-column on mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
        <VoiceCoachLauncherCard
          badge="Talking points"
          icon="🎤"
          glowColor="#7c3aed"
          gradient="linear-gradient(135deg, #5b21b6, #7c3aed, #c4b5fd)"
          title="Build Elevator Speech"
          description="AI writes your 10-20 second elevator statement — then rehearse it on camera."
          href="/dashboard/ai-tools/elevator-pitch"
          ctaLabel="Build elevator speech"
        />

        <VoiceCoachLauncherCard
          {...readinessVoiceSurface}
          title="Career Readiness Coach"
          description="Talk through interviews, certifications, and next steps with a dedicated AI coach."
          href="/dashboard/ai-tools/readiness-coach"
          ctaLabel="Open readiness coach"
        />

        <VoiceCoachLauncherCard
          {...resumeCoachVoiceSurface}
          title="Resume & Experience"
          description="Practice your story out loud and get voice feedback on bullets and framing."
          href="/dashboard/ai-tools/resume-coach"
          ctaLabel="Open resume coach"
        />

        <VoiceCoachLauncherCard
          {...mockInterviewVoiceSurface}
          title="Voice Job Interviewer"
          description="Launch a dedicated mock interview with setup guidance and live coaching feedback."
          href="/dashboard/ai-tools/voice-interview"
          ctaLabel="Start mock interview"
        />
      </div>

      {/* 5th priority tool — Career and Business Coach */}
      <div style={{ marginTop: '0.75rem' }}>
        <VoiceCoachLauncherCard
          badge="Business & career"
          icon="💼"
          glowColor="#2563eb"
          gradient="linear-gradient(135deg, #1e40af, #2563eb, #60a5fa)"
          title="Career and Business Coach"
          description="Project management, sales, marketing, and broader career questions without strict gates."
          href="/dashboard/ai-tools/career-business-coach"
          ctaLabel="Open business coach"
        />
      </div>
    </section>
  );
}
