import type { Metadata } from 'next';
import Image from 'next/image';
import { buildPageMetadataAsync } from '@/app/seo';
import LocalizedLink from '@/components/LocalizedLink';
import { redirect } from 'next/navigation';
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import EmployerContactForm from './EmployerContactForm';
import { CTABand, CohortStatCard, HeroSection, PageSection, PricingTierCard, ProcessStep, StatBand, ValueCard } from '@/components/marketing/ui';
import { WORKFORCEAP_PROGRAM_CATALOG_SIZE } from '@/lib/content/programs';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { getTranslations } from 'next-intl/server';
import {
  marketingGhostButtonClasses,
  marketingPrimaryButtonClasses,
  marketingSecondaryButtonClasses,
} from '@/lib/marketing/buttonClasses';
import { MARKETING_FULL_BLEED_HERO_SIZES } from '@/lib/marketing/heroImage';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('marketing.employers');
  // TODO(design): designer needs to produce `/public/images/og/employers.webp`
  // (1200x630). Referenced here so social shares of /employers don't fall
  // back to the generic homepage OG; until the asset lands, social cards
  // will 404 the image and degrade to no preview.
  return buildPageMetadataAsync({
    title: t('title'),
    description: t('description'),
    path: '/employers',
    image: '/images/og/employers.webp',
  });
}

const PARTNER_LOGOS = ['Google', 'IBM', 'AWS', 'CompTIA', 'Microsoft'];

export default async function EmployersPage() {
  const t = await getTranslations('marketing.employers');
  const user = await getUser();
  if (user) {
    const employerCtx = await getEmployerForUser(user.id);
    if (employerCtx) redirect('/employer');
  }

  return (
    <div className="inner-page">
      {/* ── Hiring partner banner ── */}
      <section
        aria-label="Hiring partner invitation"
        style={{
          background: 'var(--surface-container-high)',
          borderBottom: '1px solid var(--outline-variant)',
          padding: '1.5rem clamp(1rem, 4vw, 2rem)',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>
              {t('waitlistEyebrow')}
            </p>
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.95rem', color: 'var(--color-on-surface)', lineHeight: 1.5 }}>
              {t('waitlistCopy')}
            </p>
          </div>
          <a
            href="#employer-contact-form"
            className={marketingPrimaryButtonClasses({ radius: 'sm' })}
            style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            {t('waitlistCta')}
          </a>
        </div>
      </section>

      {/* ── Hero ── */}
      <section
        style={{
          position: 'relative',
          minHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <Image
          src="/images/hero-people.webp"
          alt=""
          fill
          priority
          fetchPriority="high"
          sizes={MARKETING_FULL_BLEED_HERO_SIZES}
          style={{ objectFit: 'cover', objectPosition: 'center 35%' }}
          aria-hidden="true"
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(135deg, rgba(18,20,22,0.94) 0%, rgba(18,20,22,0.78) 50%, rgba(173,44,77,0.2) 100%)',
            zIndex: 1,
          }}
        />

        <div className="container" style={{ position: 'relative', zIndex: 2, maxWidth: 'var(--max-width)', padding: '6rem 1.5rem 3rem' }}>
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
              marginBottom: '1.5rem',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '0.875rem', verticalAlign: '-2px', marginRight: '0.35rem' }}>
              rocket_launch
            </span>
            {t('heroEyebrow')}
          </span>

          <h1
            style={{
              fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
              fontWeight: 800,
              lineHeight: 0.95,
              letterSpacing: '-0.03em',
              color: 'var(--color-white)',
              maxWidth: '48rem',
              marginBottom: '2rem',
            }}
          >
            {t('heroHeadline')}{' '}
            <span style={{ color: 'var(--color-accent)' }}>{t('heroHeadlineAccent')}</span>
          </h1>

          <p
            style={{
              fontSize: '1.25rem',
              color: 'rgba(255,255,255,0.75)',
              maxWidth: '36rem',
              lineHeight: 1.6,
              marginBottom: '2.5rem',
            }}
          >
            {t('heroCopy')}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            <LocalizedLink
              href="/employer/jobs/post"
              className={marketingSecondaryButtonClasses({
                radius: 'lg',
                large: true,
                onDarkSecondary: true,
              })}
            >
              {t('postJobCta')}
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }} aria-hidden="true">post_add</span>
            </LocalizedLink>
            <LocalizedLink
              href="#employer-contact-form"
              className={marketingPrimaryButtonClasses({ radius: 'lg', large: true })}
            >
              {t('heroCta')}
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }} aria-hidden="true">arrow_forward</span>
            </LocalizedLink>
            {!user && (
              <LocalizedLink
                href="/employers/signup"
                className={marketingSecondaryButtonClasses({
                  radius: 'lg',
                  large: true,
                  onDarkSecondary: true,
                })}
              >
                Create Employer Account
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }} aria-hidden="true">business</span>
              </LocalizedLink>
            )}
            {!user && (
              <LocalizedLink
                href="/login?redirectTo=/employer"
                className={marketingGhostButtonClasses({ radius: 'lg', large: true, onDarkGhost: true })}
              >
                {t('heroSignIn')}
              </LocalizedLink>
            )}
          </div>
        </div>

        {/* Partner logos bar */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            padding: '1.5rem 0',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            marginTop: 'auto',
          }}
        >
          <div className="container" style={{ maxWidth: 'var(--max-width)' }}>
            <div
              className="trust-logos"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2.5rem',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                {t('credLabel')}
              </span>
              {PARTNER_LOGOS.map((logo) => (
                <span key={logo} style={{ fontSize: '0.875rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
                  {logo}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== Employer Stats ===== */}
      <PageSection padding="md">
        <StatBand
          stats={[
            { value: String(WORKFORCEAP_PROGRAM_CATALOG_SIZE), label: t('statTracks') },
            { value: '1:1', label: t('statMatching') },
            { value: 'Ready', label: t('statReady') },
          ]}
        />
      </PageSection>

      {/* ===== How It Works for Employers ===== */}
      <PageSection padding="md">
        <h2 className="text-display-sm" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>{t('processTitle')}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
          {[
            { step: '1', icon: 'work', title: t('introStep1Title'), desc: t('introStep1Desc') },
            { step: '2', icon: 'groups', title: t('introStep2Title'), desc: t('introStep2Desc') },
            { step: '3', icon: 'handshake', title: t('introStep3Title'), desc: t('introStep3Desc') },
          ].map((item) => (
            <ProcessStep
              key={item.step}
              step={item.step}
              title={item.title}
              description={item.desc}
            />
          ))}
        </div>
      </PageSection>

      {/* ── The WorkforceAP Difference — Sticky sidebar + value cards ── */}
      <section style={{ padding: '6rem 0', background: 'var(--surface-container-low)' }}>
        <div className="container" style={{ maxWidth: 'var(--max-width)' }}>
          <div
            className="emp-diff-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gap: '3rem',
            }}
          >
            {/* Sticky sidebar */}
            <div style={{ gridColumn: 'span 4' }} className="emp-diff-sidebar">
              <div style={{ position: 'sticky', top: 'calc(var(--main-nav-layout-height) + 1rem)' }}>
                <h2
                  style={{
                    fontSize: 'clamp(2rem, 3vw, 2.75rem)',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    color: 'var(--color-on-surface)',
                    lineHeight: 1.1,
                    marginBottom: '1.25rem',
                  }}
                >
                  {t('valueTitle')}
                </h2>
                <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                  {t('valueIntro')}
                </p>
                <div
                  style={{
                    padding: '1.25rem',
                    background: 'var(--surface-container)',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', '--ms-fill': 1 }}>
                    psychology
                  </span>
                  <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.8rem', margin: 0, lineHeight: 1.5 }}>
                    <strong>{t('valueGuidedTitle')}</strong> {t('valueGuidedBody')}
                  </p>
                </div>
              </div>
            </div>

            {/* Value cards */}
            <div style={{ gridColumn: 'span 8', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="emp-diff-cards">
              <ValueCard
                icon={<span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'var(--color-accent)', '--ms-fill': 1 }}>verified</span>}
                title={t('valueCard1Title')}
                description={t('valueCard1Desc')}
              />
              <ValueCard
                icon={<span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'var(--color-accent)', '--ms-fill': 1 }}>diversity_3</span>}
                title={t('valueCard2Title')}
                description={t('valueCard2Desc')}
              />
              <ValueCard
                icon={<span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'var(--color-accent)', '--ms-fill': 1 }}>support_agent</span>}
                title={t('valueCard3Title')}
                description={t('valueCard3Desc')}
              />
              <ValueCard
                icon={<span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'var(--color-accent)', '--ms-fill': 1 }}>auto_fix_high</span>}
                title={t('valueCard4Title')}
                description={t('valueCard4Desc')}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Talent Cohort Bento Grid ── */}
      <section style={{ padding: '6rem 0' }}>
        <div className="container" style={{ maxWidth: 'var(--max-width)' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2
              style={{
                fontSize: 'clamp(2rem, 3.5vw, 3rem)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--color-on-surface)',
                marginBottom: '0.75rem',
              }}
            >
              {t('cohortsTitle')} <span style={{ color: 'var(--color-accent)' }}>{t('cohortsEyebrow')}</span>
            </h2>
            <p style={{ color: 'var(--color-on-surface-variant)', maxWidth: '40rem', margin: '0 auto' }}>
              Graduate profiles by program and certification. Ranges match our published program outcomes.
              See <LocalizedLink href="/programs" style={{ color: 'var(--color-accent)' }}>program pages</LocalizedLink> and the{' '}
              <LocalizedLink href="/salary-guide" style={{ color: 'var(--color-accent)' }}>salary guide</LocalizedLink> for detail.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gap: '1.5rem',
            }}
          >
            {/* IT Support */}
            <CohortStatCard
              variant="accent"
              span={8}
              icon={<span className="material-symbols-outlined" style={{ '--ms-fill': 1 }}>computer</span>}
              title={t('cohortItTitle')}
              subtitle={t('cohortItSubtitle')}
              level={<>{t('cohortLevel')} {t('cohortLevelEntry')}</>}
              salaryRange={<>{t('cohortSalary')} $55K-$72K</>}
            />
            {/* Cybersecurity */}
            <CohortStatCard
              variant="default"
              span={8}
              icon={<span className="material-symbols-outlined" style={{ '--ms-fill': 1 }}>security</span>}
              title={t('cohortCyberTitle')}
              subtitle={t('cohortCyberSubtitle')}
              level={<>{t('cohortLevel')} {t('cohortLevelEntryToMid')}</>}
              salaryRange={<>{t('cohortSalary')} $75K-$112K</>}
            />
            {/* AWS Cloud */}
            <CohortStatCard
              variant="default"
              span={4}
              icon={<span className="material-symbols-outlined" style={{ '--ms-fill': 1 }}>cloud_queue</span>}
              title={t('cohortAwsTitle')}
              subtitle={t('cohortAwsSubtitle')}
              level={<>{t('cohortLevel')} {t('cohortLevelEntryToMid')}</>}
              salaryRange={<>{t('cohortSalary')} $95K-$145K</>}
            />
            {/* Data Analytics */}
            <CohortStatCard
              variant="default"
              span={4}
              icon={<span className="material-symbols-outlined" style={{ '--ms-fill': 1 }}>analytics</span>}
              title={t('cohortDataTitle')}
              subtitle={t('cohortDataSubtitle')}
              level={<>{t('cohortLevel')} {t('cohortLevelEntry')}</>}
              salaryRange={<>{t('cohortSalary')} $72K-$102K</>}
            />
          </div>
        </div>
      </section>

      {/* ── How Hiring Works — 4-step process ── */}
      <section style={{ padding: '6rem 0', background: 'var(--surface-container-low)' }}>
        <div className="container" style={{ maxWidth: 'var(--max-width)' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2
              style={{
                fontSize: 'clamp(2rem, 3.5vw, 3rem)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--color-on-surface)',
                marginBottom: '0.75rem',
              }}
            >
              {t('hiringSectionTitle')}{' '}
              <span style={{ color: 'var(--color-accent)' }}>{t('hiringSectionTitleAccent')}</span>
            </h2>
            <p style={{ color: 'var(--color-on-surface-variant)' }}>{t('hiringSectionSubtitle')}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0', position: 'relative' }} className="emp-process-grid">
            {/* Timeline connector */}
            <div
              style={{
                position: 'absolute',
                top: '2.25rem',
                left: '12.5%',
                right: '12.5%',
                height: '2px',
                background: 'linear-gradient(90deg, var(--color-accent), var(--color-gold))',
                zIndex: 0,
              }}
              className="emp-timeline-bar"
            />

            {/* Step 1 */}
            <ProcessStep
              step="1"
              icon="description"
              title={t('processStep1Title')}
              description={t('processStep1Desc')}
              centered
            />
            {/* Step 2 */}
            <ProcessStep
              step="2"
              icon="person_search"
              title={t('processStep2Title')}
              description={t('processStep2Desc')}
              centered
            />
            {/* Step 3 */}
            <ProcessStep
              step="3"
              icon="how_to_reg"
              title={t('processStep3Title')}
              description={t('processStep3Desc')}
              centered
            />
            {/* Step 4 */}
            <ProcessStep
              step="4"
              icon="handshake"
              title={t('processStep4Title')}
              description={t('processStep4Desc')}
              centered
            />
          </div>
        </div>
      </section>

      {/* ── Partnership Tiers ── */}
      <section style={{ padding: '6rem 0' }}>
        <div className="container" style={{ maxWidth: 'var(--max-width)' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2
              style={{
                fontSize: 'clamp(2rem, 3.5vw, 3rem)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--color-on-surface)',
                marginBottom: '0.75rem',
              }}
            >
              {t('tiersTitle')}
            </h2>
            <p style={{ color: 'var(--color-on-surface-variant)' }}>{t('tiersSubtitle')}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }} className="emp-tiers-grid">
            {/* Standard */}
            <PricingTierCard
              title={t('tierStandard')}
              features={[t('tierStandardF1'), t('tierStandardF2'), t('tierStandardF3')]}
              ctaText={t('tierCta')}
              ctaHref="#employer-contact-form"
            />
            {/* Strategic Partner */}
            <PricingTierCard
              variant="featured"
              badge={t('tierMostPopular')}
              title={t('tierStrategic')}
              features={[t('tierStrategicF1'), t('tierStrategicF2'), t('tierStrategicF3'), t('tierStrategicF4')]}
              ctaText={t('tierCta')}
              ctaHref="#employer-contact-form"
            />
            {/* Team Training */}
            <PricingTierCard
              title={t('tierTeam')}
              features={[t('tierTeamF1'), t('tierTeamF2'), t('tierTeamF3'), t('tierTeamF4')]}
              ctaText={t('tierCta')}
              ctaHref="#employer-contact-form"
            />
          </div>
        </div>
      </section>

      {/* ── Contact Form Section ── */}
      <section style={{ padding: '6rem 0', background: 'var(--surface-container-low)' }}>
        <div className="container" style={{ maxWidth: 'var(--max-width)' }}>
          <div
            style={{
              background: 'var(--color-accent)',
              borderRadius: 'var(--radius-xl)',
              padding: '4rem 3rem',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '3rem',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at 0% 50%, rgba(255,187,0,0.12) 0%, transparent 50%)',
                pointerEvents: 'none',
              }}
            />

            <div style={{ flex: '1 1 400px', position: 'relative', zIndex: 1 }}>
              <h2
                style={{
                  fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
                  fontWeight: 800,
                  color: '#fff',
                  marginBottom: '1.5rem',
                  letterSpacing: '-0.02em',
                }}
              >
                {t('formTitle')}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.125rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                {t('formSubtitle')}
              </p>
              <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '1.1rem', marginTop: '0.15rem' }}>schedule</span>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.88)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                    {t('formResponseTime')}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '1.1rem', marginTop: '0.15rem' }}>groups</span>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.88)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                    {t('formAudience')}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '1.1rem', marginTop: '0.15rem' }}>fact_check</span>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.88)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                    {t('formReview')}
                  </p>
                </div>
              </div>
              <div
                style={{
                  marginTop: '1.5rem',
                  padding: '1.5rem',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#fff' }}>{t('formDirectContact')}</p>
                <p style={{ marginBottom: '0.25rem', color: 'rgba(255,255,255,0.9)' }}>
                  <strong>Michael Brown</strong>
                </p>
                <p style={{ marginBottom: '0.25rem' }}>
                  <a href="mailto:michael.brown@workforceap.org" style={{ color: '#fff' }}>
                    michael.brown@workforceap.org
                  </a>
                </p>
                <p>
                  <a href="tel:+15127771808" style={{ color: '#fff' }}>
                    (512) 777-1808
                  </a>
                </p>
              </div>
            </div>
            <div style={{ flex: '1 1 400px', position: 'relative', zIndex: 1 }}>
              <EmployerContactForm />
            </div>
          </div>
        </div>
      </section>

      {/* ===== Employer CTA ===== */}
      <CTABand
        variant="light"
        headline={t('ctaTitle')}
        subheadline={t('ctaCopy')}
        primaryAction={
          <a href="/employer/jobs/post" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.875rem 2rem' }}>
            {t('postJobCta')}
          </a>
        }
        secondaryAction={
          <>
            <a href="#employer-contact-form" className="btn btn-outline" style={{ fontSize: '1rem', padding: '0.875rem 2rem' }}>
              {t('ctaCta')}
            </a>
            {!user ? (
              <LocalizedLink href="/login?redirectTo=/employer" className="btn btn-outline" style={{ fontSize: '1rem', padding: '0.875rem 2rem' }}>
                {t('heroSignIn')}
              </LocalizedLink>
            ) : null}
          </>
        }
      />

      <style>{`
        @media (max-width: 1023px) {
          .emp-diff-grid { gap: 2rem !important; }
          .emp-diff-sidebar { grid-column: span 12 !important; }
          .emp-diff-cards { grid-column: span 12 !important; }
          .emp-tiers-grid { grid-template-columns: 1fr !important; max-width: 480px; margin: 0 auto; }
          .emp-cohort-card { grid-column: span 12 !important; }
        }
        @media (max-width: 767px) {
          .emp-process-grid { grid-template-columns: 1fr 1fr !important; gap: 2rem !important; }
          .emp-timeline-bar { display: none !important; }
          .emp-diff-cards { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .emp-stats-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 0.75rem !important; }
          .emp-stats-grid > div { padding: 1rem !important; }
          .emp-stats-grid h3 { font-size: 1.5rem !important; }
        }
      `}</style>

      <MobileBottomNav />
      <Footer />
      {/* Spacer for mobile bottom nav — ensures footer content is not hidden */}
      <div className="mobile-bottom-nav-spacer" aria-hidden="true" />
    </div>
  );
}
