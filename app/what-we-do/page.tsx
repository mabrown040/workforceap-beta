import Image from 'next/image';
import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';
import LocalizedLink from '@/components/LocalizedLink';
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import { getTranslations } from 'next-intl/server';
import { SectionHeader } from '@/components/marketing/ui';
import { MARKETING_FULL_BLEED_HERO_SIZES } from '@/lib/marketing/heroImage';
import { marketingButtonPresets } from '@/lib/marketing/buttonClasses';
import { prisma } from '@/lib/db/prisma';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('marketing.whatWeDo');
  // TODO(design): designer needs to produce `/public/images/og/what-we-do.webp`
  // (1200x630). Referenced here so social shares of /what-we-do don't fall
  // back to the generic homepage OG.
  return buildPageMetadataAsync({
    title: t('title'),
    description: t('description'),
    path: '/what-we-do',
    image: '/images/og/what-we-do.webp',
  });
}


export default async function WhatWeDoPage() {
  const t = await getTranslations('marketing.whatWeDo');

  let pipelineEmployers: { id: string; companyName: string; logoUrl: string | null; industry: string | null }[] = [];
  try {
    pipelineEmployers = await prisma.employer.findMany({
      where: { hiringPipelineActive: true, status: 'active' },
      select: { id: true, companyName: true, logoUrl: true, industry: true },
      take: 12,
      orderBy: { updatedAt: 'desc' },
    });
  } catch {
    // Column may not exist yet if migration hasn't been applied — section renders empty until then
  }


  return (
    <div className="inner-page">
      {/* ΓöÇΓöÇ Hero ΓöÇΓöÇ */}
      <section
        className="wwd-photo-hero"
        style={{
          position: 'relative',
          minHeight: '90vh',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Background image + gradient overlay */}
        <Image
          src="/images/austin-skyline.webp"
          alt=""
          fill
          priority
          fetchPriority="high"
          sizes={MARKETING_FULL_BLEED_HERO_SIZES}
          style={{ objectFit: 'cover', objectPosition: 'center' }}
          aria-hidden="true"
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(135deg, rgba(18,20,22,0.94) 0%, rgba(18,20,22,0.72) 45%, rgba(173,44,77,0.28) 100%)',
            zIndex: 1,
          }}
        />
        {/* Extra bottom scrim so body copy stays readable on bright areas of the photo */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 42%)',
            pointerEvents: 'none',
          }}
          aria-hidden={true}
        />

        <div className="container" style={{ position: 'relative', zIndex: 2, maxWidth: 'var(--max-width)', padding: '6rem 1.5rem' }}>
          <span
            className="wwd-photo-hero__eyebrow"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.375rem 1rem',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'var(--glass-blur)',
              border: '1px solid rgba(255,255,255,0.18)',
              color: '#ffe082',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '1.5rem',
              textShadow: '0 1px 3px rgba(0,0,0,0.65)',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '0.875rem', marginRight: '0.35rem', color: 'inherit' }}
              aria-hidden
            >
              history_edu
            </span>
            {t('heroEyebrow')}
          </span>

          <h1
            className="wwd-photo-hero__title"
            style={{
              fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
              fontWeight: 800,
              lineHeight: 0.95,
              letterSpacing: '-0.03em',
              color: '#ffffff',
              maxWidth: '48rem',
              marginBottom: '2rem',
              textShadow: '0 2px 32px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.6)',
            }}
          >
            {t('heroHeadline')}{' '}
            <span style={{ color: '#ffb2bc' }}>{t('heroHeadlineAccent')}</span>
          </h1>

          <p
            className="wwd-photo-hero__lede"
            style={{
              fontSize: '1.25rem',
              color: 'rgba(255,255,255,0.94)',
              maxWidth: '36rem',
              lineHeight: 1.6,
              marginBottom: '2.5rem',
              textShadow: '0 1px 18px rgba(0,0,0,0.5)',
            }}
          >
            {t('heroCopy')}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            <LocalizedLink href="/programs" className={marketingButtonPresets.heroPrimary('wwd-photo-hero__cta-primary')}>
              {t('heroCta1')}
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'inherit' }} aria-hidden>
                arrow_forward
              </span>
            </LocalizedLink>
            <LocalizedLink href="/contact?topic=partnership" className={marketingButtonPresets.heroSecondaryOnDark('wwd-photo-hero__cta-secondary')}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'inherit' }} aria-hidden>
                handshake
              </span>
              {t('heroCta2')}
            </LocalizedLink>
          </div>
        </div>
      </section>

      {/* Find Your Path CTA */}
      <section style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'var(--color-light)' }}>
        <p style={{ fontSize: '1.1rem', color: 'var(--color-on-surface-variant)', marginBottom: '1rem' }}>{t('findPathPrompt')}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.75rem' }}>
          <a href="/find-your-path" className="btn btn-accent btn-lg" style={{ fontSize: '1.1rem', padding: '0.875rem 2rem' }}>
            {t('findPathCta')}
          </a>
          <LocalizedLink href="/apply" className="btn btn-muted btn-lg" style={{ fontSize: '1.1rem', padding: '0.875rem 2rem' }}>
            Check WIOA Options
          </LocalizedLink>
        </div>
      </section>

      {/* ΓöÇΓöÇ Legacy Section ΓöÇΓöÇ */}
      <section style={{ padding: '6rem 0', background: 'var(--surface-container-low)' }}>
        <div className="container" style={{ maxWidth: 'var(--max-width)' }}>
          <div
            className="wwd-legacy-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gap: '3rem',
              alignItems: 'center',
            }}
          >
            {/* Leader portrait with overlay card */}
            <div style={{ gridColumn: 'span 5', position: 'relative' }} className="wwd-legacy-portrait">
              <div
                style={{
                  borderRadius: 'var(--radius-xl)',
                  overflow: 'hidden',
                  aspectRatio: '3 / 4',
                  background: 'var(--surface-container)',
                  position: 'relative',
                }}
              >
              <Image
                  src="/images/hero-people.webp"
                  alt="Diverse team collaborating on workforce development"
                  fill
                  loading="lazy"
                  style={{ objectFit: 'cover', objectPosition: 'center' }}
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <div
                style={{
                  position: 'absolute',
                  bottom: '-1.5rem',
                  right: '-1.5rem',
                  background: 'var(--color-accent)',
                  color: '#fff',
                  padding: '1.5rem 2rem',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-glow-accent)',
                }}
              >
                <div style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1 }}>25+</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.9 }}>
                  Years Experience
                </div>
              </div>
            </div>

            {/* Text content */}
            <div style={{ gridColumn: 'span 7' }} className="wwd-legacy-text">
              <h2
                style={{
                  fontSize: 'clamp(2rem, 3.5vw, 3rem)',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: 'var(--color-on-surface)',
                  lineHeight: 1.1,
                  marginBottom: '1.5rem',
                }}
              >
                Investing in the Future{' '}
                <span style={{ color: 'var(--color-accent)' }}>Workforce</span>
              </h2>

              <blockquote
                style={{
                  borderLeft: '3px solid var(--color-accent)',
                  paddingLeft: '1.5rem',
                  margin: '0 0 2rem',
                  color: 'var(--color-on-surface-variant)',
                  fontSize: '1.125rem',
                  fontStyle: 'italic',
                  lineHeight: 1.7,
                }}
              >
                Built on 25+ years of workforce development leadership across Goodwill, Austin Area Urban League,
                and state and local initiatives. We know what works. Employers help shape talent pipelines.
                Grants and partnerships fund access. We don&rsquo;t charge members.
              </blockquote>

              <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.7, marginBottom: '2rem' }}>
                Some programs may align with <strong>WIOA (Workforce Innovation and Opportunity Act)</strong> eligibility guidelines
                criteria, including low-income individuals, dislocated workers, adult learners, and veterans seeking
                career advancement.
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1.5rem',
                }}
              >
                <div
                  style={{
                    padding: '1.5rem',
                    background: 'var(--surface-container)',
                    borderRadius: 'var(--radius-lg)',
                    borderLeft: '3px solid var(--color-gold)',
                  }}
                >
                  <div className="marketing-chip-text--gold" style={{ fontSize: '1.125rem', fontWeight: 800, lineHeight: 1.3 }}>
                    Nonprofit &amp; 501(c)(3)
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginTop: '0.5rem', fontWeight: 600 }}>
                    WorkforceAP is a national nonprofit and 501(c)(3) organization serving communities nationwide.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Making an impact — Bento Grid */}
      <section style={{ padding: '6rem 0' }}>
        <div className="container" style={{ maxWidth: 'var(--max-width)' }}>
          <SectionHeader
            eyebrow={t('valuesEyebrow')}
            title={t('valuesTitle')}
            align="center"
          />

          <div
            className="wwd-bento-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gridAutoRows: 'minmax(180px, auto)',
              gap: '1.5rem',
            }}
          >
            <div
              className="portal-card portal-card--flat"
              style={{
                gridColumn: 'span 4',
                gridRow: 'span 2',
                padding: '2.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                gap: '1rem',
                background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-dark))',
                borderRadius: 'var(--radius-xl)',
                position: 'relative',
                overflow: 'hidden',
                transition: 'var(--transition-base)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'rgba(255,255,255,0.9)', '--ms-fill': 1 }} aria-hidden="true">school</span>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>{t('bento1Title')}</h3>
              <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7 }}>{t('bento1Desc')}</p>
            </div>
            <div
              className="portal-card portal-card--flat"
              style={{
                gridColumn: 'span 8',
                gridRow: 'span 1',
                padding: '2.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                gap: '1rem',
                background: 'var(--surface-container)',
                borderRadius: 'var(--radius-xl)',
                position: 'relative',
                overflow: 'hidden',
                transition: 'var(--transition-base)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--color-accent)', '--ms-fill': 1 }} aria-hidden="true">lock_open</span>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-on-surface)', letterSpacing: '-0.01em' }}>{t('bento2Title')}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.7 }}>{t('bento2Desc')}</p>
            </div>
            <div
              className="portal-card portal-card--flat"
              style={{
                gridColumn: 'span 4',
                gridRow: 'span 1',
                padding: '2.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                gap: '1rem',
                background: 'var(--surface-container)',
                borderRadius: 'var(--radius-xl)',
                position: 'relative',
                overflow: 'hidden',
                transition: 'var(--transition-base)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--color-accent)', '--ms-fill': 1 }} aria-hidden="true">verified</span>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-on-surface)', letterSpacing: '-0.01em' }}>{t('bento3Title')}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.7 }}>{t('bento3Desc')}</p>
            </div>
            <div
              className="portal-card portal-card--flat"
              style={{
                gridColumn: 'span 4',
                gridRow: 'span 1',
                padding: '2.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                gap: '1rem',
                background: 'var(--surface-container)',
                borderRadius: 'var(--radius-xl)',
                position: 'relative',
                overflow: 'hidden',
                transition: 'var(--transition-base)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--color-accent)', '--ms-fill': 1 }} aria-hidden="true">hub</span>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-on-surface)', letterSpacing: '-0.01em' }}>{t('bento4Title')}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.7 }}>{t('bento4Desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section style={{ padding: '6rem 0', background: 'var(--surface-container-low)' }}>
        <div className="container" style={{ maxWidth: 'var(--max-width)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }} className="wwd-values-grid">
            {[
              { num: '01', titleKey: 'value1Title', descKey: 'value1Desc' },
              { num: '02', titleKey: 'value2Title', descKey: 'value2Desc' },
              { num: '03', titleKey: 'value3Title', descKey: 'value3Desc' },
            ].map((v) => (
              <div
                key={v.num}
                style={{
                  padding: '2.5rem',
                  background: 'var(--surface-container)',
                  borderRadius: 'var(--radius-xl)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'var(--transition-base)',
                }}
              >
                {/* Large hover number */}
                <div
                  style={{
                    position: 'absolute',
                    top: '-0.5rem',
                    right: '1rem',
                    fontSize: '8rem',
                    fontWeight: 900,
                    color: 'var(--color-accent)',
                    opacity: 0.06,
                    lineHeight: 1,
                    pointerEvents: 'none',
                    transition: 'var(--transition-base)',
                  }}
                >
                  {v.num}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--color-accent)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: '1rem',
                  }}
                >
                  {v.num}
                </div>
                <h3
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: 'var(--color-on-surface)',
                    marginBottom: '0.75rem',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {t(v.titleKey as Parameters<typeof t>[0])}
                </h3>
                <p
                  style={{
                    color: 'var(--color-on-surface-variant)',
                    lineHeight: 1.7,
                    fontSize: '0.9rem',
                  }}
                >
                  {t(v.descKey as Parameters<typeof t>[0])}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '6rem 0' }}>
        <div className="container" style={{ maxWidth: 'var(--max-width)' }}>
          <div
            style={{
              textAlign: 'center',
              padding: '5rem 3rem',
              background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-dark))',
              borderRadius: 'var(--radius-xl)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at 30% 50%, rgba(255,187,0,0.12) 0%, transparent 60%)',
                pointerEvents: 'none',
              }}
            />
            <h2
              style={{
                fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                fontWeight: 800,
                color: '#fff',
                letterSpacing: '-0.02em',
                marginBottom: '1rem',
                position: 'relative',
              }}
            >
              {t('ctaTitle')}
            </h2>
            <p
              style={{
                color: 'rgba(255,255,255,0.8)',
                fontSize: '1.125rem',
                maxWidth: '32rem',
                margin: '0 auto 2.5rem',
                position: 'relative',
              }}
            >
              {t('ctaBody')}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem', position: 'relative' }}>
              <LocalizedLink
                href="/apply"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: '#fff',
                  color: 'var(--color-accent)',
                  padding: '1rem 2.5rem',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                {t('ctaApply')}
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }} aria-hidden="true">arrow_forward</span>
              </LocalizedLink>
              <LocalizedLink
                href="/programs"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  color: '#fff',
                  padding: '1rem 2.5rem',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                {t('ctaPrograms')}
              </LocalizedLink>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 1023px) {
          .wwd-legacy-grid { gap: 2rem !important; }
          .wwd-legacy-portrait { grid-column: span 12 !important; max-width: 400px; margin: 0 auto; }
          .wwd-legacy-text { grid-column: span 12 !important; }
          .wwd-values-grid { grid-template-columns: 1fr !important; }
          .wwd-bento-grid > div { grid-column: span 12 !important; grid-row: span 1 !important; }
        }
        @media (max-width: 767px) {
          .wwd-legacy-portrait { max-width: 100%; }
        }
      `}</style>

      <MobileBottomNav />
      <Footer />
      {/* Spacer for mobile bottom nav ΓÇö ensures footer content is not hidden */}
      <div className="mobile-bottom-nav-spacer" aria-hidden="true" />
    </div>
  );
}
