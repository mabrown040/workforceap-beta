'use client';

import VoiceCoachLauncherCard from '@/components/portal/VoiceCoachLauncherCard';
import { Mic, Zap } from 'lucide-react';
import {
  careerBusinessVoiceSurface,
  mockInterviewVoiceSurface,
  readinessVoiceSurface,
  resumeCoachVoiceSurface,
  studentCounselorVoiceSurface,
} from '@/lib/portal/voice';

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
            badge="10–20 SEC"
            icon={<Zap size={22} aria-hidden />}
            glowColor="#a47f38"
            gradient="linear-gradient(135deg, #a47f38, #7d5f26)"
            title="Elevator Introduction"
            description="Generate a clean 10 to 20 second intro, save it, and email it to yourself right away."
            href="/dashboard/ai-tools/elevator-pitch?prefill=true"
            ctaLabel="Build intro"
          />

          <VoiceCoachLauncherCard
            {...readinessVoiceSurface}
            title="Readiness Coach"
            description="Interviews, certifications, and next steps — talked through out loud."
            href="/dashboard/ai-tools/studio?tab=session&agent=readiness"
            ctaLabel="Start voice session"
          />

          <VoiceCoachLauncherCard
            {...resumeCoachVoiceSurface}
            badge="RESUME"
            title="Resume & Experience Enhancer"
            description="Open the dedicated resume coach to practice your pitch and refine your resume inside a synced workspace."
            href="/dashboard/ai-tools/studio?tab=session&agent=resume"
            ctaLabel="Start voice session"
          />

          <VoiceCoachLauncherCard
            {...mockInterviewVoiceSurface}
            badge="PRACTICE"
            title="Voice Interview Practice"
            description="Launch the full mock interview experience with setup guidance and optional recording."
            href="/dashboard/ai-tools/studio?tab=session&agent=mock"
            ctaLabel="Start practice"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
          <VoiceCoachLauncherCard
            {...studentCounselorVoiceSurface}
            title="Lilley Career Coach"
            description="Talk through training, your job search, or your next step, then leave with a personalized action plan."
            href="/dashboard/ai-tools/studio?tab=session&agent=counselor"
            ctaLabel="Start session"
          />
          <VoiceCoachLauncherCard
            {...careerBusinessVoiceSurface}
            icon={careerBusinessVoiceSurface.icon ?? <Mic size={22} aria-hidden />}
            title="Career & Business Coach"
            description="Get broader career, project management, sales, marketing, and business guidance in one place."
            href="/dashboard/ai-tools/studio?tab=session&agent=business"
            ctaLabel="Start session"
          />
        </div>
      </div>
    </section>
  );
}
