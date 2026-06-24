import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import VoiceCoachesPromo from '@/components/portal/VoiceCoachesPromo';
import PortalBreadcrumb from '@/components/portal/PortalBreadcrumb';
import PortalCard from '@/components/portal/ui/PortalCard';
import QueryToast from '@/components/portal/QueryToast';
import { AI_TOOLKIT_EXTRA_SECTIONS } from '@/lib/portal/aiToolsHub';
import JourneyStageGuide from '@/components/portal/JourneyStageGuide';
import { FeatureTile, DesignSurface } from '@/components/portal/kit';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
  title: t('aiToolkit'),
  description: t('aiToolkitDescription'),
  path: '/dashboard/ai-tools',
});
}

export default async function AIToolsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools');
  const tBlog = await getTranslations('marketing.blog');
  const tCommon = await getTranslations('marketing.common');

  return (
    <div style={{ background: 'var(--surface-container-lowest)', minHeight: '100vh' }}>
      <QueryToast />
      <div className="wa-pb-24 md:wa-pb-0">
        <div className="wa-hidden md:wa-block" style={{ padding: '1.5rem 1.5rem 0', maxWidth: '1100px', margin: '0 auto' }}>
          <PortalBreadcrumb items={[
            { label: 'Member Portal', href: '/dashboard' },
            { label: 'Career Toolkit' },
          ]} />
        </div>
        <section
          style={{
            padding: 'clamp(1.5rem, 3vw, 2.25rem) 1.5rem 1.25rem',
            textAlign: 'center',
            background: 'linear-gradient(180deg, var(--surface-container-low) 0%, var(--surface-container-lowest) 100%)',
          }}
        >
          <p
            className="wa-block md:wa-hidden"
            style={{
              fontSize: '0.625rem',
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--color-accent)',
              marginBottom: '0.5rem',
            }}
          >
            {tBlog('includedForMembers')}
          </p>
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.65rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              padding: '0.3rem 0.75rem',
              borderRadius: '999px',
              background: 'rgba(173,44,77,0.12)',
              color: 'var(--color-accent)',
              marginBottom: '1rem',
            }}
          >
            {tBlog('betaAccess')}
          </span>
          <h1 className="text-display-sm" style={{ margin: '0 0 0.5rem' }}>
            {tBlog('careerToolkit')}
          </h1>
          <p
            style={{
              color: 'var(--color-on-surface-variant)',
              maxWidth: '520px',
              margin: '0 auto 1.5rem',
              fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
              lineHeight: 1.6,
            }}
          >
            {tCommon('startWithToolCards')}
          </p>
          <Link
            href="/dashboard/ai-tools/history"
            className="btn btn-outline"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
              history
            </span>
            {tCommon('viewMyPastResults')}
          </Link>
          <Link
            href="/dashboard/ai-tools/interview-prep"
            className="btn btn-outline"
            style={{ marginLeft: '0.5rem' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
              library_books
            </span>
            {tCommon('prepBundle')}
          </Link>
        </section>
      </div>

      {/* Journey-first guided layer (beta) — additive; full grid below unchanged */}
      <JourneyStageGuide />

      <section style={{ maxWidth: '1100px', margin: '0 auto 1.25rem', padding: '0 clamp(1rem, 4vw, 1.5rem)' }}>
        <PortalCard className="portal-card--flat">
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>
                {tCommon('startHere')}
              </p>
              <h2 style={{ margin: '0.25rem 0 0', fontSize: '1.05rem', fontWeight: 800 }}>{tCommon('pathToCertification')}</h2>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', maxWidth: '36rem', lineHeight: 1.55 }}>
                {tCommon('pathToCertificationDescription')}
              </p>
            </div>
            <Link href="/dashboard/program/start" className="btn btn-primary">
              {tCommon('openEnrollmentGuide')}
            </Link>
          </div>
        </PortalCard>
      </section>

      {/* Voice coaches */}
      <div style={{ marginBottom: '1.5rem' }}>
        <VoiceCoachesPromo />
      </div>

      {/* Guided job search steps */}
      <section style={{ maxWidth: '1100px', margin: '0 auto 2rem', padding: '0 clamp(1rem, 4vw, 1.5rem)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>apps</span>
          <h2 style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', margin: 0 }}>
            {tCommon('guidedJobSearch')}
          </h2>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <PortalCard className="portal-card--flat">
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.55 }}>
              {tCommon('applicationTrackerMoved')}
            </p>
            <div style={{ marginTop: '0.875rem' }}>
              <Link href="/dashboard/job-applications" className="btn btn-outline">
                {tCommon('openTracker')}
              </Link>
            </div>
          </PortalCard>
        </div>

        <DesignSurface surface="warm">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {AI_TOOLKIT_EXTRA_SECTIONS.map((section) => (
              <div key={section.title}>
                <div style={{ marginBottom: '0.875rem' }}>
                  <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
                    {section.title}
                  </h3>
                </div>
                <div className="wa-grid wa-grid-cols-1 sm:wa-grid-cols-2 lg:wa-grid-cols-3 wa-gap-4">
                  {section.tools.map((tool, idx) => (
                    <FeatureTile
                      key={tool.href}
                      href={tool.href}
                      title={tool.label}
                      tone={idx % 2 === 0 ? 'crimson' : 'gold'}
                      icon={
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: '1.4rem', fontVariationSettings: "'FILL' 1" }}
                        >
                          {tool.icon}
                        </span>
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DesignSurface>
      </section>

      <div className="wa-block md:wa-hidden">      </div>
    </div>
  );
}
