import Image from 'next/image';
import type { Metadata } from 'next';
import { UsersRound, GraduationCap, Building2, Heart, Bot, BarChart3, ShieldCheck } from 'lucide-react';
import { buildPageMetadataAsync } from '@/app/seo';
import Link from 'next/link';
import Footer from '@/components/Footer';
import { CTABand, HeroSection, PageSection, PartnershipCard, SectionHeader, ValueCard } from '@/components/marketing/ui';
import { getRequestLocale } from '@/lib/i18n/server';
import { withLocalePrefix } from '@/lib/i18n/config';
import { getTranslations } from 'next-intl/server';
import PartnerSignupForm from '@/components/partner/PartnerSignupForm';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('marketing.partners');
  return buildPageMetadataAsync({
    title: t('title'),
    description: t('description'),
    path: '/partners',
  });
}

export default async function PartnersPage() {
  const t = await getTranslations('marketing.partners');
  const locale = await getRequestLocale();
  const partnershipContactHref = `${withLocalePrefix('/contact', locale)}?topic=partnership`;
  const employersMarketingHref = withLocalePrefix('/employers', locale);
  const partnerSignupHref = `${withLocalePrefix('/partners', locale)}#partner-signup`;

  return (
    <div className="inner-page">
      {/* ── Hero ── */}
      <HeroSection
        backgroundImage="/images/hero-people.webp"
        overlayGradient="linear-gradient(135deg, rgba(18,20,22,0.92) 0%, rgba(18,20,22,0.75) 50%, rgba(173,44,77,0.25) 100%)"
        eyebrow={
          <span
            style={{
              display: 'inline-block',
              padding: '0.375rem 1rem',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'var(--glass-blur)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'var(--color-gold)',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '0.875rem', verticalAlign: '-2px', marginRight: '0.35rem' }} aria-hidden="true">
              handshake
            </span>
            {t('eyebrow')}
          </span>
        }
        headline={
          <h1
            style={{
              fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
              fontWeight: 800,
              lineHeight: 0.95,
              letterSpacing: '-0.03em',
              color: 'var(--color-white)',
              maxWidth: '48rem',
            }}
          >
            {t('heroHeadline')} {' '}
            <span
              style={{
                background: 'linear-gradient(135deg, var(--color-accent-light), var(--color-gold))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {t('heroHeadlineAccent')}
            </span>
          </h1>
        }
        subheadline={
          <p style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.75)', maxWidth: '36rem', lineHeight: 1.6 }}>
            {t('heroCopy')}
          </p>
        }
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginTop: '2.5rem' }}>
          <Link
            href={partnerSignupHref}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--color-accent)',
              color: '#fff',
              padding: '1rem 2rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            {t('heroCta')}
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }} aria-hidden="true">arrow_forward</span>
          </Link>
          <Link
            href="#partner-types"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: 'rgba(255,255,255,0.9)',
              padding: '0.75rem 1rem',
              fontWeight: 600,
              textDecoration: 'underline',
              textUnderlineOffset: '4px',
            }}
          >
            {t('heroSecondary')}
          </Link>
        </div>
      </HeroSection>

      {/* ── Partnership Types Bento Grid ── */}
      <section id="partner-types" style={{ padding: '6rem 0' }}>
        <div className="container" style={{ maxWidth: 'var(--max-width)' }}>
          <SectionHeader title={t('pathwaysTitle')} accent={t('pathwaysTitleAccent')} />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gap: '1.5rem',
            }}
          >
            {/* Referral Partners */}
            <div
              className="portal-card portal-card--flat"
              style={{
                gridColumn: 'span 8',
                padding: '2.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                background: 'var(--surface-container)',
                borderRadius: 'var(--radius-xl)',
                transition: 'var(--transition-base)',
              }}
            >
              <span
                style={{
                  width: '2rem',
                  height: '2rem',
                  color: 'var(--color-accent)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-hidden="true"
              >
                <UsersRound size={28} strokeWidth={2} />
              </span>
              <h3
                style={{
                  fontSize: '1.375rem',
                  fontWeight: 700,
                  color: 'var(--color-on-surface)',
                  letterSpacing: '-0.01em',
                }}
              >
                {t('referralType')}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
                <strong>{t('typeYouAre')}</strong> {t('referralWho')}
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.7, flex: 1 }}>
                {t('referralWhy')}
              </p>
              <Link
                href={partnerSignupHref}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: 'var(--color-accent)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                  marginTop: '0.5rem',
                }}
              >
                {t('referralCta')}
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden="true">arrow_forward</span>
              </Link>
            </div>

            {/* Training Centers */}
            <PartnershipCard
              span={4}
              icon={<GraduationCap size={28} strokeWidth={2} />}
              title={t('trainingType')}
              who={<><strong>{t('typeYouAre')}</strong> {t('trainingWho')}</>}
              why={t('trainingWhy')}
              cta={t('trainingCta')}
              ctaHref={partnershipContactHref}
            />
            {/* Public Agencies */}
            <PartnershipCard
              span={5}
              icon={<Building2 size={28} strokeWidth={2} />}
              title={t('agencyType')}
              who={<><strong>{t('typeYouAre')}</strong> {t('agencyWho')}</>}
              why={t('agencyWhy')}
              cta={t('agencyCta')}
              ctaHref={partnershipContactHref}
            />
            {/* Philanthropic Funders */}
            <PartnershipCard
              span={7}
              icon={<Heart size={28} strokeWidth={2} />}
              title={t('funderType')}
              who={<><strong>{t('typeYouAre')}</strong> {t('funderWho')}</>}
              why={t('funderWhy')}
              cta={t('funderCta')}
              ctaHref={partnershipContactHref}
            />
          </div>
        </div>
      </section>

      {/* ── Referral partner self-service signup (single path) ── */}
      <section
        id="partner-signup"
        style={{ padding: '4rem 0', scrollMarginTop: '5rem', background: 'var(--surface-container-low)' }}
      >
        <div className="container" style={{ maxWidth: '560px' }}>
          <p
            className="wa-text-[11px] wa-uppercase wa-tracking-[0.15em] wa-font-bold wa-mb-2"
            style={{ color: 'var(--color-accent)' }}
          >
            {t('signupEyebrow')}
          </p>
          <h2
            style={{
              fontSize: 'clamp(1.5rem, 3vw, 2rem)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--color-on-surface)',
              margin: '0 0 0.75rem',
            }}
          >
            {t('signupTitle')}
          </h2>
          <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.65, margin: '0 0 1.5rem' }}>
            {t('signupSubtitle')}
          </p>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', marginBottom: '1.25rem' }}>
            {t('signupAlready')}{' '}
            <Link href={`${withLocalePrefix('/login', locale)}?redirectTo=/partner`} style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
              {t('signupSignIn')}
            </Link>
          </p>
          <PartnerSignupForm />
          <p style={{ marginTop: '1.5rem', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
            {t('signupOtherPaths')}{' '}
            <Link href={partnershipContactHref} style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
              {t('signupContactTeam')}
            </Link>
          </p>
        </div>
      </section>

      {/* ── Digital Integration, Human Impact ── */}
      <section className="partners-platform-section" style={{ padding: '6rem 0', background: 'var(--surface-container-low)' }}>
        <div className="container" style={{ maxWidth: 'var(--max-width)' }}>
          <div
            className="partners-platform-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gap: '3rem',
              alignItems: 'center',
            }}
          >
            <div style={{ gridColumn: 'span 6' }} className="partners-platform-text">
  <SectionHeader align="left" title={t('platformTitle')} accent={t('platformTitleAccent')} marginBottom="2rem" />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Smart Intake */}
                <div
                  style={{
                    display: 'flex',
                    gap: '1rem',
                    padding: '1.5rem',
                    background: 'var(--surface-container)',
                    borderRadius: 'var(--radius-lg)',
                  }}
                >
                  <span
                    style={{
                      width: '1.75rem',
                      height: '1.75rem',
                      color: 'var(--color-accent)',
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    aria-hidden="true"
                  >
                    <Bot size={24} strokeWidth={2} />
                  </span>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '0.35rem' }}>
                      {t('platformFeature1Title')}
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
                      {t('platformFeature1Desc')}
                    </p>
                  </div>
                </div>

                {/* Real-Time Dashboards */}
                <div
                  style={{
                    display: 'flex',
                    gap: '1rem',
                    padding: '1.5rem',
                    background: 'var(--surface-container)',
                    borderRadius: 'var(--radius-lg)',
                  }}
                >
                  <span
                    style={{
                      width: '1.75rem',
                      height: '1.75rem',
                      color: 'var(--color-accent)',
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    aria-hidden="true"
                  >
                    <BarChart3 size={24} strokeWidth={2} />
                  </span>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '0.35rem' }}>
                      {t('platformFeature2Title')}
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
                      {t('platformFeature2Desc')}
                    </p>
                  </div>
                </div>

                {/* Verification & Reporting */}
                <div
                  style={{
                    display: 'flex',
                    gap: '1rem',
                    padding: '1.5rem',
                    background: 'var(--surface-container)',
                    borderRadius: 'var(--radius-lg)',
                  }}
                >
                  <span
                    style={{
                      width: '1.75rem',
                      height: '1.75rem',
                      color: 'var(--color-accent)',
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    aria-hidden="true"
                  >
                    <ShieldCheck size={24} strokeWidth={2} />
                  </span>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '0.35rem' }}>
                      {t('platformFeature3Title')}
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
                      {t('platformFeature3Desc')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ gridColumn: 'span 6' }} className="partners-platform-img">
              <figure
                style={{
                  margin: 0,
                  borderRadius: 'var(--radius-xl)',
                  overflow: 'hidden',
                  aspectRatio: '4 / 3',
                  background: 'var(--surface-container)',
                  position: 'relative',
                }}
              >
                <Image
                  src="/images/hero-people.webp"
                  alt=""
                  fill
                  aria-hidden="true"
                  style={{ objectFit: 'cover', objectPosition: 'center 40%' }}
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </figure>
            </div>
          </div>
        </div>
      </section>

      {/* ── Partner FAQ Accordion ── */}
      <section className="partners-faq-section" style={{ padding: '6rem 0' }}>
        <div className="container" style={{ maxWidth: '720px' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'var(--color-accent)', marginBottom: '0.5rem', display: 'block' }} aria-hidden="true">
              help
            </span>
            <h2
              style={{
                fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--color-on-surface)',
              }}
            >
              {t('faqTitle')}
            </h2>
          </div>

          <div className="faq-list">
            <details className="faq-item" style={{ marginBottom: '0.75rem' }}>
              <summary style={{ fontWeight: 600 }}>{t('faq1q')}</summary>
              <p>{t('faq1a')}</p>
            </details>
            <details className="faq-item" style={{ marginBottom: '0.75rem' }}>
              <summary style={{ fontWeight: 600 }}>{t('faq2q')}</summary>
              <p>{t('faq2a')}</p>
            </details>
            <details className="faq-item" style={{ marginBottom: '0.75rem' }}>
              <summary style={{ fontWeight: 600 }}>{t('faq3q')}</summary>
              <p>{t('faq3a')}</p>
            </details>
            <details className="faq-item" style={{ marginBottom: '0.75rem' }}>
              <summary style={{ fontWeight: 600 }}>{t('faq4q')}</summary>
              <p>{t('faq4a')}</p>
            </details>
            <details className="faq-item" style={{ marginBottom: '0.75rem' }}>
              <summary style={{ fontWeight: 600 }}>{t('faq5q')}</summary>
              <p>{t('faq5a')}</p>
            </details>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '0 0 6rem' }}>
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
                background: 'radial-gradient(circle at 70% 50%, rgba(255,187,0,0.12) 0%, transparent 60%)',
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
              {t('ctaCopy')}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem', position: 'relative' }}>
              <Link
                href={partnerSignupHref}
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
                {t('ctaCta')}
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }} aria-hidden="true">arrow_forward</span>
              </Link>
              <Link
                href={employersMarketingHref}
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
                {t('ctaCta2')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 1023px) {
          .partners-narrative-grid { gap: 2rem !important; }
          .partners-platform-grid { gap: 2rem !important; }
          .partners-narrative-portrait { grid-column: span 12 !important; max-width: 400px; margin: 0 auto; }
          .partners-narrative-text { grid-column: span 12 !important; }
          .partners-platform-text { grid-column: span 12 !important; }
          .partners-platform-img { grid-column: span 12 !important; }
          #partner-types .portal-card.portal-card--flat { grid-column: span 12 !important; }
        }
        @media (max-width: 767px) {
          .partners-platform-section { padding-bottom: 3rem !important; }
          .partners-faq-section { padding-top: 3rem !important; }
        }
      `}</style>

      <Footer />
    </div>
  );
}
