/**
 * /partners — Marketing landing page (Sprint G4, PLAN-2026-Q3.md §2.1)
 *
 * Cold partner traffic (referral orgs, workforce boards, nonprofits, conferences,
 * ads) lands here and self-serves into the partner channel. The portal already
 * works; this page is the marketing front door.
 *
 * Intentional TODOs left for follow-up before launch:
 *   - Logos band: placeholder text-logo cards. Swap in real partner logos at
 *     the `PARTNER_LOGO_PLACEHOLDERS` array below once written permission is in.
 *   - Stats band: placeholder numbers (450 / 83% / 340). Replace from the
 *     analytics dashboard before public launch.
 *   - Live demo embed: links to a TODO URL. Swap for the real 2-min walkthrough
 *     when video production lands (see plan G4 deliverables).
 */
import Image from 'next/image';
import type { Metadata } from 'next';
import { UsersRound, GraduationCap, Building2, Heart, Bot, BarChart3, ShieldCheck } from 'lucide-react';
import { buildPageMetadataAsync } from '@/app/seo';
import LocalizedLink from '@/components/LocalizedLink';
import Footer from '@/components/Footer';
import { HeroSection, PartnershipCard, ProcessStep, SectionHeader, ValueCard } from '@/components/marketing/ui';
import {
  marketingGhostButtonClasses,
  marketingPrimaryButtonClasses,
} from '@/lib/marketing/buttonClasses';
import { getRequestLocale } from '@/lib/i18n/server';
import { withLocalePrefix } from '@/lib/i18n/config';
import { getTranslations } from 'next-intl/server';
import PartnerSignupForm from '@/components/partner/PartnerSignupForm';

// TODO(G4): replace with real partner logos once permissions are signed.
const PARTNER_LOGO_PLACEHOLDERS = [
  'logosPlaceholder1',
  'logosPlaceholder2',
  'logosPlaceholder3',
  'logosPlaceholder4',
  'logosPlaceholder5',
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('marketing.partners');
  // TODO(design): designer needs to produce `/public/images/og/partners.webp`
  // (1200x630). Referenced here so social shares of /partners don't fall
  // back to the generic homepage OG.
  return buildPageMetadataAsync({
    title: t('title'),
    description: t('description'),
    path: '/partners',
    image: '/images/og/partners.webp',
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
        priority
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
          <>
            <p style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.75)', maxWidth: '36rem', lineHeight: 1.6, margin: 0 }}>
              {t('heroSubtitle')}
            </p>
          </>
        }
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginTop: '2.5rem' }}>
          <LocalizedLink
            href={partnerSignupHref}
            className={marketingPrimaryButtonClasses({
              radius: 'lg',
              large: true,
            })}
            style={{ minHeight: '44px' }}
          >
            {t('heroCtaPrimary')}
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }} aria-hidden="true">arrow_forward</span>
          </LocalizedLink>
          <LocalizedLink
            href={`${withLocalePrefix('/login', locale)}?redirectTo=/partner`}
            className={marketingGhostButtonClasses({
              radius: 'md',
              large: true,
              onDarkGhost: true,
              className: 'marketing-inline-ghost-link',
            })}
            style={{ minHeight: '44px' }}
          >
            {t('heroCtaSecondary')}
          </LocalizedLink>
        </div>
      </HeroSection>

      {/* ── Partner logos band ──
          TODO(G4): swap PARTNER_LOGO_PLACEHOLDERS values for real partner logos
          (image components) once written marketing permissions are in. */}
      <section
        aria-label="Partner organizations"
        style={{
          padding: '2.5rem 0',
          background: 'var(--surface-container)',
          borderBottom: '1px solid var(--outline-variant)',
        }}
      >
        <div className="container" style={{ maxWidth: 'var(--max-width)' }}>
          <p
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--color-on-surface-variant)',
              textAlign: 'center',
              margin: '0 0 1.5rem',
            }}
          >
            {t('logosLabel')}
          </p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem 2.5rem',
            }}
          >
            {PARTNER_LOGO_PLACEHOLDERS.map((key) => (
              <span
                key={key}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.75rem 1.25rem',
                  background: 'var(--surface-container-low)',
                  border: '1px solid var(--outline-variant)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: 'var(--color-on-surface-variant)',
                  letterSpacing: '0.02em',
                }}
              >
                {t(key)}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats band removed pre-launch — placeholder figures (450 / 83% / 340)
          would misrepresent results before any real partner data exists. */}

      {/* ── How it works (3-step) ── */}
      <section style={{ padding: '5rem 0' }}>
        <div className="container" style={{ maxWidth: 'var(--max-width)' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2
              style={{
                fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--color-on-surface)',
                margin: '0 0 0.75rem',
              }}
            >
              {t('howTitle')}
            </h2>
            <p style={{ color: 'var(--color-on-surface-variant)', maxWidth: '36rem', margin: '0 auto' }}>
              {t('howSubtitle')}
            </p>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '2rem',
            }}
          >
            <ProcessStep
              step="1"
              icon="mail"
              title={t('howStep1Title')}
              description={t('howStep1Desc')}
              centered
            />
            <ProcessStep
              step="2"
              icon="key"
              title={t('howStep2Title')}
              description={t('howStep2Desc')}
              centered
            />
            <ProcessStep
              step="3"
              icon="rocket_launch"
              title={t('howStep3Title')}
              description={t('howStep3Desc')}
              centered
            />
          </div>
        </div>
      </section>

      {/* ── Why partners pick WorkforceAP ── */}
      <section style={{ padding: '5rem 0', background: 'var(--surface-container-low)' }}>
        <div className="container" style={{ maxWidth: 'var(--max-width)' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2
              style={{
                fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--color-on-surface)',
                margin: '0 0 0.75rem',
              }}
            >
              {t('whyTitle')}
            </h2>
            <p style={{ color: 'var(--color-on-surface-variant)', maxWidth: '36rem', margin: '0 auto' }}>
              {t('whySubtitle')}
            </p>
          </div>
          <div
            className="partners-why-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.5rem',
            }}
          >
            <ValueCard
              variant="elevated"
              icon={
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '2rem', color: 'var(--color-accent)' }}
                  aria-hidden="true"
                >
                  monitoring
                </span>
              }
              title={t('whyValue1Title')}
              description={t('whyValue1Desc')}
            />
            <ValueCard
              variant="elevated"
              icon={
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '2rem', color: 'var(--color-accent)' }}
                  aria-hidden="true"
                >
                  insert_chart
                </span>
              }
              title={t('whyValue2Title')}
              description={t('whyValue2Desc')}
            />
            <ValueCard
              variant="elevated"
              icon={
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '2rem', color: 'var(--color-accent)' }}
                  aria-hidden="true"
                >
                  lock
                </span>
              }
              title={t('whyValue3Title')}
              description={t('whyValue3Desc')}
            />
            <ValueCard
              variant="elevated"
              icon={
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '2rem', color: 'var(--color-accent)' }}
                  aria-hidden="true"
                >
                  payments
                </span>
              }
              title={t('whyValue4Title')}
              description={t('whyValue4Desc')}
            />
          </div>
        </div>
      </section>

      {/* ── Live demo embed (placeholder) ──
          TODO(G4): replace the href below with the production 2-min walkthrough
          URL (or swap for a real <iframe>/<video> embed) once it ships. */}
      <section style={{ padding: '4rem 0' }}>
        <div className="container" style={{ maxWidth: '760px' }}>
          <div
            style={{
              padding: 'clamp(1.5rem, 4vw, 2.5rem)',
              borderRadius: 'var(--radius-xl)',
              background: 'var(--surface-container)',
              border: '1px solid var(--outline-variant)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '1.5rem',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: '2.5rem',
                color: 'var(--color-accent)',
                background: 'var(--surface-container-low)',
                borderRadius: 'var(--radius-full)',
                padding: '0.85rem',
              }}
              aria-hidden="true"
            >
              play_circle
            </span>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <p
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--color-accent)',
                  margin: '0 0 0.4rem',
                }}
              >
                {t('demoEyebrow')}
              </p>
              <h2
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: 'var(--color-on-surface)',
                  margin: '0 0 0.4rem',
                }}
              >
                {t('demoTitle')}
              </h2>
              <p style={{ fontSize: '0.9375rem', color: 'var(--color-on-surface-variant)', margin: 0, lineHeight: 1.55 }}>
                {t('demoCopy')}
              </p>
            </div>
            <a
              href="#partner-demo-video-todo"
              className={marketingPrimaryButtonClasses({ radius: 'md' })}
              style={{ minHeight: '44px' }}
              aria-label={t('demoCta')}
            >
              {t('demoCta')}
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }} aria-hidden="true">
                arrow_forward
              </span>
            </a>
          </div>
        </div>
      </section>

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
              <LocalizedLink
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
              </LocalizedLink>
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
          <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.65, margin: '0 0 0.5rem' }}>
            {t('signupSubtitle')}
          </p>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', marginBottom: '1.25rem' }}>
            {t('signupAlready')}{' '}
            <LocalizedLink href={`${withLocalePrefix('/login', locale)}?redirectTo=/partner`} style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
              {t('signupSignIn')}
            </LocalizedLink>
          </p>
          <PartnerSignupForm />
          <p style={{ marginTop: '1.5rem', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
            {t('signupOtherPaths')}{' '}
            <LocalizedLink href={partnershipContactHref} style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
              {t('signupContactTeam')}
            </LocalizedLink>
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
                  loading="lazy"
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
              <summary style={{ fontWeight: 600 }}>{t('faqCobrandQ')}</summary>
              <p>{t('faqCobrandA')}</p>
            </details>
            <details className="faq-item" style={{ marginBottom: '0.75rem' }}>
              <summary style={{ fontWeight: 600 }}>{t('faqContactQ')}</summary>
              <p>{t('faqContactA')}</p>
            </details>
            <details className="faq-item" style={{ marginBottom: '0.75rem' }}>
              <summary style={{ fontWeight: 600 }}>{t('faqNotificationsQ')}</summary>
              <p>{t('faqNotificationsA')}</p>
            </details>
            <details className="faq-item" style={{ marginBottom: '0.75rem' }}>
              <summary style={{ fontWeight: 600 }}>{t('faqBulkQ')}</summary>
              <p>{t('faqBulkA')}</p>
            </details>
            <details className="faq-item" style={{ marginBottom: '0.75rem' }}>
              <summary style={{ fontWeight: 600 }}>{t('faqFeeQ')}</summary>
              <p>{t('faqFeeA')}</p>
            </details>
            <details className="faq-item" style={{ marginBottom: '0.75rem' }}>
              <summary style={{ fontWeight: 600 }}>{t('faqReportsQ')}</summary>
              <p>{t('faqReportsA')}</p>
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
              <LocalizedLink
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
              </LocalizedLink>
              <LocalizedLink
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
              </LocalizedLink>
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
