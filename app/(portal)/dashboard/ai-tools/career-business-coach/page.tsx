import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Briefcase, CheckCircle2 } from 'lucide-react';
import { buildPageMetadataAsync } from '@/app/seo';
import MobileBottomNav from '@/components/MobileBottomNav';
import PageHeader from '@/components/portal/PageHeader';
import PortalVoiceSessionLazy from '@/components/portal/PortalVoiceSessionLazy';
import VoiceAgentSurface from '@/components/portal/VoiceAgentSurface';
import { getUser } from '@/lib/auth/server';
import { DesignSurface } from '@/components/portal/kit';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
    title: t('careerBusinessCoachMetaTitle'),
    description: t('careerBusinessCoachMetaDesc'),
    path: '/dashboard/ai-tools/career-business-coach',
  });
}

export default async function CareerBusinessCoachPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/career-business-coach');

  return (
    <DesignSurface surface="warm">
      <div style={{ background: 'var(--wa-bg)', minHeight: '100vh' }}>
        <div
          style={{
            padding: '1.25rem 2rem 1.5rem',
            borderBottom: '1px solid var(--wa-border)',
            background: 'var(--wa-surface)',
          }}
        >
          <PageHeader
            title="Career and Business Coach"
            subtitle="Ask about project management, sales strategy, guerrilla marketing, communication challenges, or any career and business topic."
            breadcrumbs={[
              { label: 'AI Career Toolkit', href: '/dashboard/ai-tools' },
              { label: 'Career and Business Coach' },
            ]}
          />
        </div>

        <div style={{ maxWidth: 980, margin: '0 auto', padding: '1rem 1rem 2rem' }}>
          <div className="wa-kit-card wa-kit-card--sm" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {[
                'Project management and team communication',
                'Sales strategy and marketing plans',
                'Career growth and professional skills',
                'Business problem-solving and advice',
              ].map((item) => (
                <div key={item} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', color: 'var(--wa-muted)', fontSize: '0.82rem', fontWeight: 600 }}>
                  <CheckCircle2 size={15} color="var(--wa-accent)" aria-hidden="true" />
                  {item}
                </div>
              ))}
            </div>
          </div>

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
        </div>

        <div className="wa-block md:wa-hidden">
          <MobileBottomNav variant="portal" />
        </div>
      </div>
    </DesignSurface>
  );
}
