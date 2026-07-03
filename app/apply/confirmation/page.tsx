import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import LocalizedLink from '@/components/LocalizedLink';
import { Suspense } from 'react';
import { buildPageMetadataAsync } from '@/app/seo';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import ApplyConfirmationCta from '@/components/apply/ApplyConfirmationCta';
import ShareButtons from '@/components/apply/ShareButtons';
import ProgramCommitmentPanel from '@/components/portal/ProgramCommitmentPanel';
import { getUser } from '@/lib/auth/server';

import { getTranslations } from 'next-intl/server';
import '../apply-funnel-depth.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('apply');
  return buildPageMetadataAsync({
    title: t('confirmationMetaTitle'),
    description: t('confirmationMetaDescription'),
    path: '/apply/confirmation',
  });
}

export default async function ApplyConfirmationPage() {
  const user = await getUser();
  const isAuthenticated = !!user;
  const t = await getTranslations('apply');

  const nextSteps = [
    { num: '1', title: t('confirmationStep1Title'), desc: t('confirmationStep1Desc') },
    { num: '2', title: t('confirmationStep2Title'), desc: t('confirmationStep2Desc') },
    { num: '3', title: t('confirmationStep3Title'), desc: t('confirmationStep3Desc') },
    { num: '4', title: t('confirmationStep4Title'), desc: t('confirmationStep4Desc') },
  ] as const;

  const whatYouCanDoSignedIn = [
    {
      label: t('confirmationDoDashboardLabel'),
      href: '/dashboard',
      desc: t('confirmationDoDashboardDesc'),
    },
    {
      label: t('confirmationDoProgramsLabel'),
      href: '/programs',
      desc: t('confirmationDoProgramsDesc'),
    },
    {
      label: t('confirmationDoStatusLabel'),
      href: '/apply/status',
      desc: t('confirmationDoStatusDesc'),
    },
  ] as const;

  const whatYouCanDoGuest = [
    {
      label: t('confirmationGuestAccountLabel'),
      href: '/apply/create-account',
      desc: t('confirmationGuestAccountDesc'),
    },
    {
      label: t('confirmationGuestDashboardLabel'),
      href: '/login',
      desc: t('confirmationGuestDashboardDesc'),
    },
    {
      label: t('confirmationDoProgramsLabel'),
      href: '/programs',
      desc: t('confirmationDoProgramsDesc'),
    },
  ] as const;

  const trustSignals = [
    { icon: 'badge', title: t('confirmationTrust1Title'), desc: t('confirmationTrust1Desc') },
    { icon: 'volunteer_activism', title: t('confirmationTrust2Title'), desc: t('confirmationTrust2Desc') },
    { icon: 'support_agent', title: t('confirmationTrust3Title'), desc: t('confirmationTrust3Desc') },
  ] as const;

  const whatYouCanDoNow = isAuthenticated ? whatYouCanDoSignedIn : whatYouCanDoGuest;

  return (
    <div className="inner-page mdx afd-page">
      <section className="content-section" style={{ paddingTop: 'calc(var(--nav-height-default, 80px) + 1.5rem)', paddingBottom: '2rem' }}>
        <div className="container" style={{ maxWidth: 980 }}>
          <div className="apply-confirmation-shell" style={{ maxWidth: '720px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div
                style={{
                  width: '5.5rem',
                  height: '5.5rem',
                  borderRadius: '9999px',
                  background: 'linear-gradient(135deg, #8c0f37, #ad2c4d)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                  boxShadow: '0 20px 40px -12px rgba(140,15,55,0.35)',
                }}
              >
                <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '2.75rem', '--ms-wght': 600 } as CSSProperties}>
                  check
                </span>
              </div>
              <h1 className="text-display-sm" style={{ marginBottom: '0.5rem', color: 'var(--color-on-surface)' }}>
                {t('confirmationHeroTitle')}
              </h1>
              <p style={{ color: 'var(--color-on-surface)', fontSize: '1.05rem', lineHeight: 1.65, maxWidth: '36rem', margin: '0 auto 0.75rem', fontWeight: 600 }}>
                {t('confirmationHeroLead')}
              </p>
              <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '1rem', lineHeight: 1.7, maxWidth: '34rem', margin: '0 auto 1rem' }}>
                {t('confirmationHeroBody')}
              </p>
              <div style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '9999px', background: 'var(--surface-container-low)', color: 'var(--color-on-surface)', fontSize: '0.9rem', fontWeight: 600 }}>
                <span>{t('confirmationChipOnFile')}</span>
                <span aria-hidden="true" style={{ opacity: 0.45 }}>•</span>
                <span>{t('confirmationChipReview')}</span>
              </div>
            </div>

            {isAuthenticated ? (
              <div
                className="mdx-card"
                style={{
                  background: 'linear-gradient(135deg, rgba(173, 44, 77, 0.08), rgba(173, 44, 77, 0.02))',
                  border: '1px solid rgba(173, 44, 77, 0.25)',
                  marginBottom: '1.5rem',
                }}
              >
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>
                  {t('confirmationRecommendedEyebrow')}
                </p>
                <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem' }}>{t('confirmationSignedInTitle')}</h2>
                <p style={{ margin: '0 0 1rem', color: 'var(--color-on-surface)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                  {t('confirmationSignedInBody')}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                  <LocalizedLink href="/dashboard" className="btn btn-primary mdx-btn mdx-btn--primary">
                    {t('confirmationOpenDashboard')}
                  </LocalizedLink>
                  <LocalizedLink href="/apply/status" className="btn btn-outline mdx-btn mdx-btn--ghost">
                    {t('confirmationCheckStatusShort')}
                  </LocalizedLink>
                </div>
              </div>
            ) : (
              <Suspense
                fallback={
                  <div
                    aria-hidden="true"
                    style={{
                      display: 'grid',
                      gap: '0.75rem',
                      padding: '1rem 0',
                    }}
                  >
                    <div style={{ height: '2.75rem', borderRadius: '0.625rem', background: 'var(--surface-container-high)', opacity: 0.55 }} />
                    <div style={{ height: '2.75rem', borderRadius: '0.625rem', background: 'var(--surface-container-high)', opacity: 0.35 }} />
                    <span style={{ position: 'absolute', clip: 'rect(0 0 0 0)' }}>{t('confirmationLoadingNext')}</span>
                  </div>
                }
              >
                <ApplyConfirmationCta />
              </Suspense>
            )}

            <section className="mdx-card" style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-accent)', margin: '0 0 1.25rem' }}>
                {t('confirmationTimelineHeading')}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {nextSteps.map((step) => (
                  <div key={step.num} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{ flexShrink: 0, width: '2rem', height: '2rem', borderRadius: '9999px', background: 'var(--color-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem' }}>
                      {step.num}
                    </div>
                    <div>
                      <p style={{ color: 'var(--color-on-surface)', fontWeight: 700, margin: 0 }}>{step.title}</p>
                      <p style={{ color: 'var(--color-on-surface-variant)', margin: '0.35rem 0 0', lineHeight: 1.6 }}>{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mdx-card" style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-accent)', margin: '0 0 1rem' }}>
                {t('confirmationTrustHeading')}
              </h2>
              <div className="apply-confirmation-trust-grid" style={{ display: 'grid', gap: '1rem' }}>
                {trustSignals.map((item) => (
                  <div key={item.title} style={{ background: 'var(--surface-container-low)', borderRadius: '0.875rem', padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.625rem' }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '1.125rem' }}>
                        {item.icon}
                      </span>
                      <p style={{ margin: 0, color: 'var(--color-on-surface)', fontWeight: 700 }}>{item.title}</p>
                    </div>
                    <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', lineHeight: 1.6, fontSize: '0.9375rem' }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <div style={{ marginBottom: '1.5rem' }}>
              <ProgramCommitmentPanel variant="compact" />
            </div>

            <div className="apply-confirmation-info-grid" style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="mdx-card">
                <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: 'var(--color-on-surface)' }}>{t('confirmationWhatNowHeading')}</h2>
                <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', color: 'var(--color-on-surface-variant)', lineHeight: 1.7 }}>
                  {whatYouCanDoNow.map((item) => (
                    <li key={item.label} style={{ marginBottom: '0.75rem' }}>
                      <LocalizedLink href={item.href} style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                        {item.label}
                      </LocalizedLink>
                      <span style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.9375rem' }}>{item.desc}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mdx-card">
                <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: 'var(--color-on-surface)' }}>{t('confirmationHelpHeading')}</h2>
                <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.7 }}>
                  {t('confirmationHelpBody')}{' '}
                  <a href="tel:+15127771808" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>(512) 777-1808</a>
                  {' '}{t('confirmationHelpOr')}{' '}
                  <a href="mailto:info@workforceap.org" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>info@workforceap.org</a>
                  {t('confirmationHelpSuffix')}
                </p>
              </div>
            </div>

            <section style={{ marginBottom: '2rem', textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', margin: '0 0 1rem' }}>
                {t('confirmationSpreadWord')}
              </p>
              <ShareButtons />
            </section>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
              <LocalizedLink href="/apply/status" className="btn btn-primary mdx-btn mdx-btn--primary">
                {t('confirmationCtaStatus')}
              </LocalizedLink>
              <LocalizedLink href="/programs" className="btn btn-outline mdx-btn mdx-btn--ghost">
                {t('confirmationCtaPrograms')}
              </LocalizedLink>
              <LocalizedLink href="/" className="btn btn-muted mdx-btn mdx-btn--ghost">
                {t('confirmationCtaHome')}
              </LocalizedLink>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <MobileBottomNav />
      {/* Spacer for mobile bottom nav — ensures footer content is not hidden */}
      <div className="mobile-bottom-nav-spacer" aria-hidden="true" />

      <style>{`
        .apply-confirmation-trust-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .apply-confirmation-info-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        @media (max-width: 767px) {
          .apply-confirmation-trust-grid,
          .apply-confirmation-info-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
