import Image from 'next/image';
import LocalizedLinkServer from '@/components/LocalizedLinkServer';
import { MARKETING_JOURNEY_STEPS, type MarketingJourneyStep } from '@/lib/content/marketingJourneySteps';
import { WORKFORCEAP_PROGRAM_CATALOG_SIZE } from '@/lib/content/programs';
import { getTranslations } from 'next-intl/server';

export type HomeProgramShowcaseCard = {
  slug: string;
  name?: string | null;
  category?: string | null;
  duration?: string | null;
  static?: { title?: string | null; duration?: string | null } | null;
};

function getHomepageProgramCardImage(program: HomeProgramShowcaseCard, index: number) {
  const images = [
    '/images/AdobeStock_78118914.webp',
    '/images/austin-skyline.webp',
    '/images/hero-people.webp',
    '/images/image-asset.webp',
  ];
  return images[index % images.length];
}

export default async function HomePageBelowFold({
  homeProgramShowcase,
  programCount,
}: {
  homeProgramShowcase: HomeProgramShowcaseCard[];
  programCount: number;
}) {
  const t = await getTranslations('marketing.home');

  const journeyPhaseLabel = (phase: MarketingJourneyStep['homePhase']) => {
    if (phase === 1) return t('journeyPhaseGetStarted');
    if (phase === 2) return t('journeyPhaseTrain');
    return t('journeyPhaseLaunch');
  };

  return (
    <>
      {/* Competitor contrast — factual positioning (directly below hero; streamed with below-fold bundle) */}
      <section
        className="home-contrast"
        aria-labelledby="home-contrast-heading"
        style={{
          background: 'var(--surface-container-low)',
          padding: 'clamp(1.75rem, 4vw, 2.75rem) 0',
          borderTop: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 clamp(1rem, 4vw, 2rem)' }}>
          <h2
            id="home-contrast-heading"
            className="text-label-upper"
            style={{
              textAlign: 'center',
              color: 'var(--color-on-surface-variant)',
              marginBottom: '1.25rem',
              letterSpacing: '0.12em',
              fontSize: '0.625rem',
            }}
          >
            {t('contrastEyebrow')}
          </h2>
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
              gap: '0.75rem',
            }}
          >
            {(
              [
                { key: 'contrast1' as const, icon: 'work_outline' as const },
                { key: 'contrast2' as const, icon: 'account_balance' as const },
                { key: 'contrast3' as const, icon: 'schedule' as const },
              ] as const
            ).map((row) => (
              <li key={row.key}>
                <div
                  className="portal-card portal-card--flat"
                  style={{
                    background: 'var(--surface-container-lowest)',
                    padding: '1rem 1.1rem',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.65rem',
                    border: '1px solid rgba(0,0,0,0.06)',
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: '1.25rem',
                      color: 'var(--color-accent)',
                      flexShrink: 0,
                      marginTop: '0.05rem',
                    }}
                    aria-hidden="true"
                  >
                    {row.icon}
                  </span>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 'clamp(0.875rem, 0.35vw + 0.82rem, 0.95rem)',
                      lineHeight: 1.55,
                      color: 'var(--color-on-surface)',
                      fontWeight: 600,
                    }}
                  >
                    {t(row.key)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ===== Social Proof / Credibility Bar ===== */}
      <section
        className="home-credibility-bar"
        aria-label="Partner logos"
        style={{ padding: '2rem 0', background: 'var(--surface-container-lowest)' }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 clamp(1rem, 4vw, 2rem)' }}>
          <p
            className="text-label-upper"
            style={{
              textAlign: 'center',
              color: 'var(--color-on-surface-variant)',
              opacity: 0.7,
              marginBottom: '1.5rem',
              fontSize: '0.625rem',
              letterSpacing: '0.2em',
            }}
          >
            {t('credBarLabel')}
          </p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '3rem',
              opacity: 0.65,
            }}
          >
            <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>Google</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>AT&T</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>Coursera</span>
            <Image className="home-cred-logo" src="/images/microsoft-logo.svg" alt="Microsoft" width={100} height={24} loading="lazy" />
            <Image className="home-cred-logo" src="/images/ibm-logo.svg" alt="IBM" width={60} height={24} loading="lazy" />
          </div>
        </div>
      </section>

      {/* ===== A Network Built for Success — Stakeholder Cards (Partnerships) ===== */}
      <section aria-label="Partnerships" style={{ background: 'var(--surface-container-low)', padding: 'clamp(3rem, 6vw, 6rem) 0' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 clamp(1rem, 4vw, 2rem)' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span className="text-label-upper" style={{ color: 'var(--color-accent)', marginBottom: '0.75rem', display: 'inline-block' }}>
              {t('partnershipsEyebrow')}
            </span>
            <h2 className="text-display-sm">{t('networkTitle')}</h2>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
              gap: '2rem',
              alignItems: 'start',
            }}
          >
            <div
              className="portal-card portal-card--flat home-employer-elevated"
              style={{
                background: 'var(--surface-container-lowest)',
                padding: '2rem',
                border: '2px solid var(--color-accent)',
                transform: 'translateY(-1rem)',
                boxShadow: '0 8px 32px rgba(173,44,77,0.15)',
              }}
            >
              <div
                style={{
                  width: '3rem',
                  height: '3rem',
                  background: 'rgba(173,44,77,0.2)',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-accent)',
                  marginBottom: '1.5rem',
                }}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  person
                </span>
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>{t('memberCardTitle')}</h3>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-accent)' }} aria-hidden="true">
                    check_circle
                  </span>
                  {t('memberCardNoCost')}
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-accent)' }} aria-hidden="true">
                    check_circle
                  </span>
                  {WORKFORCEAP_PROGRAM_CATALOG_SIZE} {t('statTracks')}
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-accent)' }} aria-hidden="true">
                    check_circle
                  </span>
                  {t('memberCardResume')}
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-accent)' }} aria-hidden="true">
                    check_circle
                  </span>
                  {t('memberCardJobs')}
                </li>
              </ul>
              <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                <LocalizedLinkServer href="/apply" className="btn btn-primary btn-small">
                  {t('memberCardCta')}
                </LocalizedLinkServer>
                <LocalizedLinkServer href="/wioa-qualification" className="btn btn-secondary btn-small">
                  {t('memberCardCta2')}
                </LocalizedLinkServer>
              </div>
            </div>

            <div className="portal-card portal-card--flat" style={{ background: 'var(--surface-container-lowest)', padding: '2rem' }}>
              <div
                style={{
                  width: '3rem',
                  height: '3rem',
                  background: 'rgba(43,123,185,0.12)',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-blue, #2b7bb9)',
                  marginBottom: '1.5rem',
                }}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  handshake
                </span>
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>{t('partnerCardTitle')}</h3>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-blue, #2b7bb9)' }} aria-hidden="true">
                    check_circle
                  </span>
                  {t('partnerCardSharing')}
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-blue, #2b7bb9)' }} aria-hidden="true">
                    check_circle
                  </span>
                  {t('partnerCardRefer')}
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-blue, #2b7bb9)' }} aria-hidden="true">
                    check_circle
                  </span>
                  {t('partnerCardImpact')}
                </li>
              </ul>
              <div style={{ marginTop: '1.5rem' }}>
                <LocalizedLinkServer href="/partners" className="btn btn-primary btn-small">
                  {t('partnerCardCta')}
                </LocalizedLinkServer>
              </div>
            </div>

            <div className="portal-card portal-card--flat" style={{ background: 'var(--surface-container-lowest)', padding: '2rem' }}>
              <div
                className="marketing-chip-text--gold"
                style={{
                  width: '3rem',
                  height: '3rem',
                  background: 'rgba(255,187,0,0.165)',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.5rem',
                }}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  business
                </span>
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>{t('employerCardTitle')}</h3>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined marketing-chip-text--gold" style={{ fontSize: '1rem' }} aria-hidden="true">
                    check_circle
                  </span>
                  {t('employerCardCandidates')}
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined marketing-chip-text--gold" style={{ fontSize: '1rem' }} aria-hidden="true">
                    check_circle
                  </span>
                  {t('employerCardTraining')}
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined marketing-chip-text--gold" style={{ fontSize: '1rem' }} aria-hidden="true">
                    check_circle
                  </span>
                  {t('employerCardGrads')}
                </li>
              </ul>
              <div style={{ marginTop: '1.5rem' }}>
                <LocalizedLinkServer href="/employers" className="btn btn-primary btn-small">
                  {t('employerCardCta')}
                </LocalizedLinkServer>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Built on Workforce Experience — Bento ===== */}
      <section aria-label="Impact statistics" style={{ padding: 'clamp(3rem, 6vw, 6rem) clamp(1rem, 4vw, 2rem)', maxWidth: '1400px', margin: '0 auto' }}>
        <div id="impact" className="home-impact-bento">
          <div>
            <span className="text-label-upper" style={{ color: 'var(--color-accent)', marginBottom: '1rem', display: 'inline-block' }}>
              {t('aboutEyebrow')}
            </span>
            <h2 className="text-display-sm" style={{ marginBottom: '1.5rem' }}>
              {t('aboutTitle')}
            </h2>
            <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.8, marginBottom: '1.5rem', maxWidth: '680px' }}>
              {t('aboutBody1')}
            </p>
            <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.8, maxWidth: '680px' }}>
              {t('aboutBody2')}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="portal-card portal-card--flat" style={{ background: 'var(--surface-container-high)', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <span className="marketing-chip-text--gold" style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1 }}>
                2,000+
              </span>
              <span
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--color-on-surface-variant)',
                  marginTop: '0.5rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {t('statLearners')}
              </span>
            </div>
            <div className="portal-card portal-card--flat" style={{ background: 'var(--surface-container-high)', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--color-accent)', lineHeight: 1 }}>{programCount}</span>
              <span
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--color-on-surface-variant)',
                  marginTop: '0.5rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {t('statPrograms')}
              </span>
            </div>
            <div className="portal-card portal-card--flat" style={{ gridColumn: '1 / -1', background: 'var(--color-accent)', color: 'white', padding: '1.5rem', textAlign: 'center' }}>
              <span style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>$0</span>
              <span style={{ display: 'block', fontSize: '0.8rem', marginTop: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>
                {t('statMemberCost')}
              </span>
              <span style={{ display: 'block', fontSize: '0.7rem', marginTop: '0.35rem', opacity: 0.75, fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>
                For qualifying members
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Milestone Journey ===== */}
      <section aria-label="Career journey" style={{ background: 'var(--surface-container-low)', padding: 'clamp(3rem, 6vw, 6rem) 0' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 clamp(1rem, 4vw, 2rem)' }}>
          <h2 className="text-display-sm" style={{ marginBottom: '1rem', textAlign: 'center' }}>
            {t('journeyTitle')}
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--color-on-surface-variant)', marginBottom: '1rem', maxWidth: '640px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.65 }}>
            {t('journeySubtitle')}
          </p>
          <p
            style={{
              textAlign: 'center',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: 'var(--color-accent)',
              marginBottom: '0.75rem',
              letterSpacing: '0.02em',
            }}
          >
            {t('journeyPhasesRibbon')}
          </p>
          <p
            style={{
              textAlign: 'center',
              color: 'var(--color-on-surface)',
              marginBottom: '2.5rem',
              maxWidth: '520px',
              marginLeft: 'auto',
              marginRight: 'auto',
              fontWeight: 600,
              lineHeight: 1.55,
            }}
          >
            {t('journeySupportLine')}
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            gap: '1.25rem',
            overflowX: 'auto',
            padding: `0 clamp(1rem, 4vw, 2rem) 1.5rem`,
            paddingRight: 'max(clamp(1rem, 4vw, 2rem), env(safe-area-inset-right, 0px))',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {MARKETING_JOURNEY_STEPS.map((step) => (
            <div
              key={step.num}
              className="home-milestone-card"
              style={{
                flex: '0 0 260px',
                scrollSnapAlign: 'start',
                background: 'var(--surface-container)',
                borderRadius: 'var(--radius-xl)',
                padding: '2rem 1.5rem',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ position: 'relative', zIndex: 1 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)', letterSpacing: '0.02em' }}>
                  {journeyPhaseLabel(step.homePhase)}
                </span>
                <h3 style={{ fontWeight: 700, marginTop: '0.5rem', marginBottom: '0.5rem', fontSize: '1.125rem' }}>{step.title}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>{step.shortDesc}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <LocalizedLinkServer href="/how-it-works" className="btn btn-secondary">
            {t('journeyCta')}
          </LocalizedLinkServer>
        </div>
      </section>

      {/* ===== Available Programs ===== */}
      <section aria-label="Available programs" style={{ padding: 'clamp(3rem, 6vw, 6rem) clamp(1rem, 4vw, 2rem)', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '3rem' }}>
          <span className="text-label-upper" style={{ color: 'var(--color-accent)', marginBottom: '0.75rem', display: 'inline-block' }}>
            {t('programsEyebrow')}
          </span>
          <h2 className="text-display-sm" style={{ marginBottom: '1rem' }}>
            {t('programsTitle', { count: programCount })}
          </h2>
          <p style={{ color: 'var(--color-on-surface-variant)', maxWidth: '600px' }}>{t('programsSubtitle')}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.5rem' }}>
          {homeProgramShowcase.map((p, index) => (
            <LocalizedLinkServer
              key={p.slug}
              href={`/programs/${p.slug}`}
              className="portal-card portal-card--flat"
              style={{
                background: 'var(--surface-container-high)',
                color: 'var(--color-on-surface)',
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                borderRadius: 'var(--radius-xl)',
              }}
            >
              <div style={{ position: 'relative', height: '180px', background: 'var(--surface-container-highest)', overflow: 'hidden' }}>
                <Image
                  src={getHomepageProgramCardImage(p, index)}
                  alt={p.static?.title ?? p.name ?? ''}
                  fill
                  loading="lazy"
                  sizes="(max-width: 768px) 100vw, 33vw"
                  style={{ objectFit: 'cover', opacity: 0.7 }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: '0.75rem',
                    left: '0.75rem',
                    padding: '0.25rem 0.75rem',
                    borderRadius: 'var(--radius-full, 50px)',
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    color: 'white',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {p.category}
                </span>
              </div>
              <div style={{ padding: '1.25rem 1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h3 style={{ fontWeight: 700, fontSize: '1.125rem', lineHeight: 1.3 }}>{p.static?.title ?? p.name}</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: 'auto' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.2rem 0.6rem',
                      borderRadius: 'var(--radius-full, 50px)',
                      background: 'var(--surface-container-lowest)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }} aria-hidden="true">
                      schedule
                    </span>
                    {p.duration ?? p.static?.duration ?? '3-5 months'}
                  </span>
                  <span className="marketing-cert-badge">
                    <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }} aria-hidden="true">
                      verified
                    </span>
                    {t('programsCertBadge')}
                  </span>
                </div>
              </div>
            </LocalizedLinkServer>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <LocalizedLinkServer href="/programs" className="btn btn-secondary">
            {t('programsCta', { count: programCount })}
          </LocalizedLinkServer>
        </div>
      </section>

      {/* ===== AI-Powered Career Support ===== */}
      <section aria-label="AI career support" style={{ padding: 'clamp(3rem, 6vw, 5rem) clamp(1rem, 4vw, 2rem)', maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
        <span className="text-label-upper" style={{ color: 'var(--color-accent)', marginBottom: '0.75rem', display: 'inline-block' }}>
          {t('aiEyebrow')}
        </span>
        <h2 className="text-display-sm" style={{ marginBottom: '1rem' }}>
          {t('aiTitle')}
        </h2>
        <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.7, marginBottom: '1.25rem' }}>
          {t('aiCopy')}
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', opacity: 0.7, marginBottom: '2rem' }}>
          {t('aiVoice')}
        </p>
        <LocalizedLinkServer href="/apply" className="btn btn-primary">
          {t('aiCta')}
        </LocalizedLinkServer>
      </section>

      {/* ===== Final CTA ===== */}
      <section
        className="footer-cta"
        aria-label="Get started"
        style={{ background: 'var(--color-accent)', padding: 'clamp(3rem, 6vw, 4rem) clamp(1rem, 4vw, 2rem)', textAlign: 'center' }}
      >
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: 900, letterSpacing: '-0.02em', color: 'white', marginBottom: '1rem' }}>
            {t('ctaTitle')}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: '2rem', fontSize: '1.125rem' }}>{t('ctaCopy')}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center', alignItems: 'center' }}>
            <LocalizedLinkServer href="/apply" className="btn btn-large" style={{ background: 'white', color: 'var(--color-accent)', fontWeight: 700 }}>
              {t('ctaApply')}
            </LocalizedLinkServer>
            <LocalizedLinkServer href="/find-your-path" className="btn btn-large" style={{ background: 'transparent', color: 'white', border: '2px solid white', fontWeight: 700 }}>
              {t('ctaFind')}
            </LocalizedLinkServer>
            <LocalizedLinkServer href="/programs" className="btn btn-large" style={{ background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.55)', fontWeight: 600 }}>
              {t('ctaViewPrograms')}
            </LocalizedLinkServer>
          </div>
        </div>
      </section>
    </>
  );
}
