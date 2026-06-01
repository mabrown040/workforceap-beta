import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';
import LocalizedLink from '@/components/LocalizedLink';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import { prisma } from '@/lib/db/prisma';
import { shouldSkipOptionalDbQueriesAtBuild } from '@/lib/db/optionalBuildDb';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';
import { toVideoEmbedUrl } from '@/lib/platform/videoEmbed';
import { MARKETING_JOURNEY_STEPS } from '@/lib/content/marketingJourneySteps';
import ProgramCommitmentPanel from '@/components/portal/ProgramCommitmentPanel';
import { getTranslations } from 'next-intl/server';
import { CTABand } from '@/components/marketing/ui';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('marketing.howItWorks');
  return buildPageMetadataAsync({
    title: t('title'),
    description: t('description'),
    path: '/how-it-works',
  });
}

const PHASES = (t: (key: string) => string) => [
  {
    id: 1,
    label: t('phase1Label'),
    title: t('phase1Title'),
    steps: MARKETING_JOURNEY_STEPS.filter((s) => s.num <= 5).map((s) => ({
      num: s.num,
      title: s.title,
      desc: s.longDesc,
      why: s.why,
    })),
  },
  {
    id: 2,
    label: t('phase2Label'),
    title: t('phase2Title'),
    steps: MARKETING_JOURNEY_STEPS.filter((s) => s.num >= 6 && s.num <= 8).map((s) => ({
      num: s.num,
      title: s.title,
      desc: s.longDesc,
      why: s.why,
    })),
  },
  {
    id: 3,
    label: t('phase3Label'),
    title: t('phase3Title'),
    steps: MARKETING_JOURNEY_STEPS.filter((s) => s.num >= 9).map((s) => ({
      num: s.num,
      title: s.title,
      desc: s.longDesc,
      why: s.why,
    })),
  },
];

export default async function HowItWorksPage() {
  const t = await getTranslations('marketing.howItWorks');
  let overviewVideoEmbed: string | null = null;
  if (!shouldSkipOptionalDbQueriesAtBuild()) {
    try {
      const orgId = await getDefaultOrganizationId();
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { overviewVideoUrl: true },
      });
      if (org?.overviewVideoUrl) overviewVideoEmbed = toVideoEmbedUrl(org.overviewVideoUrl);
    } catch {
      overviewVideoEmbed = null;
    }
  }

  return (
    <div className="inner-page">
      {/* Hero Section */}
      <section className="content-section" style={{ paddingBottom: 0 }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div className="editorial-grid">
            <div style={{ gridColumn: 'span 12' }} className="hiw-hero-left">
              <span
                className="text-label-upper"
                style={{
                  display: 'inline-block',
                  padding: '0.25rem 0.75rem',
                  background: 'var(--color-gold)',
                  color: 'var(--color-on-surface)',
                  borderRadius: 'var(--radius-full)',
                  marginBottom: '1.5rem',
                }}
              >
                {t('heroEyebrow')}
              </span>
              <h1 className="text-display-lg" style={{ color: 'var(--color-on-surface)', marginBottom: '2rem', lineHeight: 0.95 }}>
                {t('heroHeadline')}{' '}
                <span style={{ color: 'var(--color-accent)' }}>{t('heroHeadlineAccent')}</span>
              </h1>
              <p style={{ fontSize: '1.125rem', color: 'var(--color-on-surface-variant)', maxWidth: '36rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                {t('heroCopy')}
              </p>
              <div style={{ marginBottom: '2.5rem', padding: '1.125rem 1.5rem', background: 'var(--surface-container)', borderRadius: 'var(--radius-lg)', borderLeft: '3px solid var(--color-accent)', maxWidth: '36rem' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '0.5rem' }}>{t('whoCanApplyTitle')}</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.65, margin: 0 }}>
                  {t('whoCanApplyBody')}{' '}
                  <LocalizedLink href="/apply" style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none' }}>
                    {t('wioaLink')}
                  </LocalizedLink>
                </p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                <LocalizedLink
                  href="/find-your-path"
                  style={{
                    display: 'inline-block',
                    background: 'var(--color-accent)',
                    color: '#fff',
                    padding: '1rem 2rem',
                    borderRadius: 'var(--radius-lg)',
                    fontWeight: 700,
                    fontSize: '1.15rem',
                    textDecoration: 'none',
                  }}
                >
                  {t('heroCta1')}
                </LocalizedLink>
                <LocalizedLink
                  href="/apply"
                  style={{
                    display: 'inline-block',
                    background: 'var(--surface-container-high)',
                    color: 'var(--color-on-surface)',
                    padding: '1rem 2rem',
                    borderRadius: 'var(--radius-lg)',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    textDecoration: 'none',
                  }}
                >
                  {t('heroCta2')}
                </LocalizedLink>
                <LocalizedLink
                  href="/programs"
                  style={{
                    display: 'inline-block',
                    background: 'transparent',
                    color: 'var(--color-accent)',
                    padding: '1rem 2rem',
                    borderRadius: 'var(--radius-lg)',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    textDecoration: 'none',
                    border: '2px solid var(--color-accent)',
                  }}
                >
                  {t('heroCta3')}
                </LocalizedLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Journey: member milestones (same steps as homepage) */}
      <section className="bg-surface-container-low" style={{ padding: '6rem 0', overflow: 'hidden' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ marginBottom: '4rem' }}>
            <h2 className="text-display-sm" style={{ color: 'var(--color-on-surface)', marginBottom: '1rem' }}>
              {t('journeyTitle')}
            </h2>
            <p style={{ color: 'var(--color-on-surface-variant)', maxWidth: '42rem' }}>
              {t('journeySubtitle')}
            </p>
          </div>

          {PHASES(t).map((phase, phaseIdx) => (
            <div key={phase.id} style={{ marginBottom: phaseIdx < PHASES(t).length - 1 ? '4rem' : 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '1px solid rgba(88,65,68,0.1)', paddingBottom: '1rem', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>{phase.title}</h3>
                <span className="text-label-upper" style={{ color: 'var(--color-accent)' }}>{phase.label}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))', gap: '1.5rem' }}>
                {phase.steps.map((step) => {
                  const isHighlight = step.num === 1 || step.num === 7 || step.num === 9 || step.num === 10;
                  return (
                    <div
                      key={step.num}
                      className="portal-card portal-card--flat"
                      style={{
                        padding: '1.5rem',
                        ...(isHighlight ? { borderLeft: `4px solid var(--color-accent)` } : {}),
                      }}
                    >
                      <h4 style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-on-surface)' }}>{step.title}</h4>
                      {step.num === 2 && overviewVideoEmbed ? (
                        <div style={{ margin: '1rem 0' }}>
                          <div
                            style={{
                              position: 'relative',
                              paddingBottom: '56.25%',
                              height: 0,
                              overflow: 'hidden',
                              borderRadius: 'var(--radius-md)',
                              background: '#111',
                            }}
                          >
                            <iframe
                              title="Overview — counselor introduction"
                              src={overviewVideoEmbed}
                              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                          <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', marginTop: '0.5rem' }}>
                            {t('videoCaption')}
                          </p>
                        </div>
                      ) : null}
                      <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>{step.desc}</p>
                      {step.why && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginTop: '0.75rem', fontStyle: 'italic', opacity: 0.8 }}>
                          {t('whyPrefix')} {step.why}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Post-timeline CTA — prevent dead-end after long scroll */}
          <div style={{ marginTop: '3rem', textAlign: 'center', padding: '2.5rem', background: 'var(--surface-container)', borderRadius: 'var(--radius-xl)' }}>
            <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.25rem', fontSize: '1rem' }}>
              {t('ctaBody')}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
              <LocalizedLink href="/apply" className="btn btn-primary">{t('ctaApply')}</LocalizedLink>
              <LocalizedLink href="/find-your-path" className="btn btn-muted">{t('heroCta1')}</LocalizedLink>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="content-section">
        <div className="container" style={{ maxWidth: 1200 }}>
          <div className="editorial-grid" style={{ gap: '1.5rem' }}>
            {/* Loaner Laptop */}
            <div style={{ gridColumn: 'span 12' }} className="hiw-benefit-wide">
              <div className="portal-card portal-card--elevated" style={{ padding: '3rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ maxWidth: 'min(42rem, 100%)' }}>
                  <h2 className="text-display-sm" style={{ color: 'var(--color-on-surface)', marginBottom: '1.5rem' }}>{t('laptopTitle')}</h2>
                  <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '2rem', lineHeight: 1.7 }}>
                    {t('laptopBody')}
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 500, color: 'var(--color-on-surface)' }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', '--ms-fill': 1 }}>check_circle</span>
                      {t('laptopItem1')}
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 500, color: 'var(--color-on-surface)' }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', '--ms-fill': 1 }}>check_circle</span>
                      {t('laptopItem2')}
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 500, color: 'var(--color-on-surface)' }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', '--ms-fill': 1 }}>check_circle</span>
                      {t('laptopItem3')}
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 150-Day Support */}
            <div style={{ gridColumn: 'span 12' }} className="hiw-benefit-accent">
              <div style={{ background: 'var(--color-accent)', borderRadius: 'var(--radius-xl)', padding: '3rem', color: '#fff', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div>
                  <div style={{ width: '4rem', height: '4rem', background: 'rgba(255,255,255,0.2)', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '2rem', '--ms-fill': 1 }}>calendar_today</span>
                  </div>
                  <h2 className="text-display-sm" style={{ marginBottom: '1rem' }}>{t('support150Title')}</h2>
                  <p style={{ color: 'rgba(255,203,209,0.9)', lineHeight: 1.7, maxWidth: '36rem' }}>
                    {t('support150Body')}
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <p className="text-label-upper" style={{ opacity: 0.7, marginBottom: '0.25rem', fontSize: '0.65rem' }}>{t('benefit01Label')}</p>
                    <p style={{ fontWeight: 500 }}>{t('benefit01Text')}</p>
                  </div>
                  <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <p className="text-label-upper" style={{ opacity: 0.7, marginBottom: '0.25rem', fontSize: '0.65rem' }}>{t('benefit02Label')}</p>
                    <p style={{ fontWeight: 500 }}>{t('benefit02Text')}</p>
                  </div>
                  <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <p className="text-label-upper" style={{ opacity: 0.7, marginBottom: '0.25rem', fontSize: '0.65rem' }}>{t('benefit03Label')}</p>
                    <p style={{ fontWeight: 500 }}>{t('benefit03Text')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Career Training Benefits */}
            <div style={{ gridColumn: 'span 12' }}>
              <div className="portal-card portal-card--flat" style={{ padding: '3rem' }}>
                <h2 className="text-display-sm" style={{ color: 'var(--color-on-surface)', marginBottom: '2rem' }}>{t('trainingTitle')}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ padding: '0.5rem', background: 'var(--color-gold)', borderRadius: 'var(--radius-lg)' }}>
                        <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface)', fontSize: '1.25rem', '--ms-fill': 1 }}>school</span>
                      </div>
                      <h4 style={{ fontWeight: 700, color: 'var(--color-on-surface)' }}>{t('training1Title')}</h4>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>{t('training1Desc')}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ padding: '0.5rem', background: 'var(--color-gold)', borderRadius: 'var(--radius-lg)' }}>
                        <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface)', fontSize: '1.25rem', '--ms-fill': 1 }}>groups</span>
                      </div>
                      <h4 style={{ fontWeight: 700, color: 'var(--color-on-surface)' }}>{t('training2Title')}</h4>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>{t('training2Desc')}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ padding: '0.5rem', background: 'var(--color-gold)', borderRadius: 'var(--radius-lg)' }}>
                        <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface)', fontSize: '1.25rem', '--ms-fill': 1 }}>work</span>
                      </div>
                      <h4 style={{ fontWeight: 700, color: 'var(--color-on-surface)' }}>{t('training3Title')}</h4>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>{t('training3Desc')}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ padding: '0.5rem', background: 'var(--color-gold)', borderRadius: 'var(--radius-lg)' }}>
                        <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface)', fontSize: '1.25rem', '--ms-fill': 1 }}>psychology</span>
                      </div>
                      <h4 style={{ fontWeight: 700, color: 'var(--color-on-surface)' }}>{t('training4Title')}</h4>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>{t('training4Desc')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="content-section" style={{ padding: '2rem 1rem 1rem' }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <ProgramCommitmentPanel />
        </div>
      </section>

      {/* Final CTA */}
      <CTABand
        variant="gradient"
        headline={t('ctaTitle')}
        subheadline={t('ctaBody')}
        primaryAction={
          <LocalizedLink
            href="/apply"
            style={{
              background: 'var(--color-gold)',
              color: 'var(--color-on-surface)',
              padding: '1.25rem 2.5rem',
              borderRadius: 'var(--radius-xl)',
              fontWeight: 900,
              fontSize: '1.125rem',
              textDecoration: 'none',
            }}
          >
            {t('ctaApply')}
          </LocalizedLink>
        }
        secondaryAction={
          <LocalizedLink
            href="/contact"
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              padding: '1.25rem 2.5rem',
              borderRadius: 'var(--radius-xl)',
              fontWeight: 700,
              border: '1px solid rgba(255,255,255,0.2)',
              textDecoration: 'none',
            }}
          >
            {t('ctaContact')}
          </LocalizedLink>
        }
      />

      <style>{`
        @media (min-width: 1024px) {
          .hiw-hero-left { grid-column: 1 / 8 !important; }
          .hiw-benefit-wide { grid-column: 1 / 9 !important; }
          .hiw-benefit-accent { grid-column: 9 / 13 !important; }
        }
      `}</style>

      <MobileBottomNav />
      <Footer />
      {/* Spacer for mobile bottom nav — ensures footer content is not hidden */}
      <div className="mobile-bottom-nav-spacer" aria-hidden="true" />
    </div>
  );
}
