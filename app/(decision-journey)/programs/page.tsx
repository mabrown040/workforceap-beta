import type { Metadata } from 'next';
import LocalizedLink from '@/components/LocalizedLink';
import Image from 'next/image';
import { buildPageMetadataAsync } from '@/app/seo';
import ProgramsContent from './ProgramsContent';
import ProgramsMobileBrowseNav from '@/components/marketing/ProgramsMobileBrowseNav';
import { CTABand, JourneyStep, SplitHero } from '@/components/marketing/ui';
import { WORKFORCEAP_PROGRAM_CATALOG_SIZE } from '@/lib/content/programs';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Career Training Programs — Nationwide Certificates',
  description: `Explore ${WORKFORCEAP_PROGRAM_CATALOG_SIZE} career training programs offered at no cost to members, with industry certifications from IBM, Google, AWS, Microsoft, and CompTIA. Nationwide pathways supported by grants and partnerships.`,
  path: '/programs',
});
}

export default async function ProgramsPage() {
  const t = await getTranslations('marketing.programs');

  return (
    <div className="inner-page programs-page marketing-stack marketing-stack--enter">
      {/* ══════════════════════════════════════════════
          MOBILE LAYOUT ≤640px — Stitch-aligned
          ══════════════════════════════════════════════ */}
      {/* ── Hero Section ── */}
      <section className="content-section" style={{ paddingBottom: 0 }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <SplitHero
            eyebrow={t("heroTitle")}
            headline={
              <>
                {t("headlineMain")}{" "}
                <span style={{ color: "var(--color-accent)", fontStyle: "italic" }}>{t("headlineAccent")}</span>
              </>
            }
            subheadline={
              <>
                <p style={{ fontSize: "1.125rem", color: "var(--color-on-surface-variant)", marginBottom: "1.25rem", lineHeight: 1.65 }}>
                  {t("heroDesc")}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
                  <LocalizedLink href="#program-catalog" className="btn btn-primary">
                    {t("heroCta1")}
                  </LocalizedLink>
                  <LocalizedLink href="/find-your-path" className="btn btn-outline">
                    {t("heroCta2")}
                  </LocalizedLink>
                </div>
              </>
            }
            sidebar={
              <div className="programs-hero-right" style={{ gridColumn: "8 / -1", position: "relative" }}>
                <div
                  style={{
                    borderRadius: "var(--radius-xl)",
                    overflow: "hidden",
                    position: "relative",
                    aspectRatio: "4 / 3",
                  }}
                >
                  <Image
                    src="/images/hero-people.webp"
                    alt="WorkforceAP members collaborating on training"
                    fill
                    sizes="(min-width: 1024px) 500px, 100vw"
                    style={{ objectFit: "cover" }}
                    priority
                  />
                </div>
              </div>
            }
          />
        </div>
      </section>

      <section style={{ padding: '2rem 0 0' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div
            style={{
              background: 'var(--surface-container-low)',
              borderRadius: 'var(--radius-xl)',
              padding: '1.5rem',
              border: '1px solid var(--outline-variant)',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <p className="text-label-upper" style={{ color: 'var(--color-accent)', margin: '0 0 0.5rem' }}>
                  {t('quickStart')}
                </p>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-on-surface)', margin: 0 }}>
                  {t('quickStartBody')}
                </h2>
              </div>
              <LocalizedLink href="/find-your-path" style={{ color: 'var(--color-accent)', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: '4px' }}>
                {t('notSure')}
              </LocalizedLink>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1rem',
              }}
            >
              {[
                {
                  eyebrow: t('quickStartCard1Eyebrow'),
                  title: t('quickStartCard1Title'),
                  desc: t('quickStartCard1Desc'),
                  href: '/programs/digital-literacy-empowerment-class',
                  cta: t('quickStartCard1Cta'),
                },
                {
                  eyebrow: t('quickStartCard2Eyebrow'),
                  title: t('quickStartCard2Title'),
                  desc: t('quickStartCard2Desc'),
                  href: '/programs/it-support-professional-certificate-ibm',
                  cta: t('quickStartCard2Cta'),
                },
                {
                  eyebrow: t('quickStartCard3Eyebrow'),
                  title: t('quickStartCard3Title'),
                  desc: t('quickStartCard3Desc'),
                  href: '#subgroup-programming',
                  cta: t('quickStartCard3Cta'),
                },
              ].map((item) => (
                <LocalizedLink
                  key={item.title}
                  href={item.href}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    padding: '1rem',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--surface-container-high)',
                    border: '1px solid var(--outline-variant)',
                    textDecoration: 'none',
                    color: 'inherit',
                    minHeight: '100%',
                  }}
                >
                  <div>
                    <p className="text-label-upper" style={{ color: 'var(--color-accent)', margin: '0 0 0.5rem' }}>{item.eyebrow}</p>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-on-surface)', margin: '0 0 0.5rem' }}>{item.title}</h3>
                    <p style={{ fontSize: '0.9rem', lineHeight: 1.55, color: 'var(--color-on-surface-variant)', margin: 0 }}>{item.desc}</p>
                  </div>
                  <span style={{ marginTop: 'auto', color: 'var(--color-accent)', fontWeight: 700 }}>
                    {item.cta} →
                  </span>
                </LocalizedLink>
              ))}
            </div>
          </div>
        </div>
      </section>

      <ProgramsMobileBrowseNav />

      {/* ══════════════════════════════════════════════
          HOW TO CHOOSE + TOOL ROUTING — desktop only
          ══════════════════════════════════════════════ */}
      <div>

      {/* ── Tool Routing ── */}
      <section style={{ padding: '3rem 0 0' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
            <LocalizedLink
              href="/find-your-path"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.875rem 1.5rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-accent)',
                color: 'var(--color-white, #fff)',
                fontWeight: 700,
                fontSize: '0.9375rem',
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }} aria-hidden="true">psychology</span>
              {t('notSure')}
            </LocalizedLink>
            <LocalizedLink
              href="/program-comparison"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.875rem 1.5rem',
                borderRadius: 'var(--radius-md)',
                border: '2px solid var(--color-accent)',
                color: 'var(--color-accent)',
                fontWeight: 700,
                fontSize: '0.9375rem',
                textDecoration: 'none',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }} aria-hidden="true">compare_arrows</span>
              {t('toolChipCompare')}
            </LocalizedLink>
            <LocalizedLink
              href="/salary-guide"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.875rem 1.5rem',
                borderRadius: 'var(--radius-md)',
                border: '2px solid var(--outline-variant)',
                color: 'var(--color-on-surface)',
                fontWeight: 600,
                fontSize: '0.9375rem',
                textDecoration: 'none',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }} aria-hidden="true">payments</span>
              {t('toolChipSalary')}
            </LocalizedLink>
          </div>
        </div>
      </section>

      {/* ── How to Choose ── */}
      <section style={{ padding: '3rem 0 0' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div
            style={{
              background: 'var(--surface-container-low)',
              borderRadius: 'var(--radius-xl)',
              padding: '2.5rem 3rem',
            }}
          >
            <h2
              style={{
                fontSize: '1.375rem',
                fontWeight: 800,
                color: 'var(--color-on-surface)',
                marginBottom: '0.5rem',
              }}
            >
              {t('howToChoose')}
            </h2>
            <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.75rem', maxWidth: '44rem' }}>
              {t('howToChooseDesc')}
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '1.25rem',
              }}
            >
              {[
                { icon: 'interests', label: t('howToChooseFactor1Label'), desc: t('howToChooseFactor1Desc') },
                { icon: 'devices', label: t('howToChooseFactor2Label'), desc: t('howToChooseFactor2Desc') },
                { icon: 'schedule', label: t('howToChooseFactor3Label'), desc: t('howToChooseFactor3Desc') },
                { icon: 'work', label: t('howToChooseFactor4Label'), desc: t('howToChooseFactor4Desc') },
                { icon: 'trending_up', label: t('howToChooseFactor5Label'), desc: t('howToChooseFactor5Desc') },
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                  <span
                    className="material-symbols-outlined"
                    style={{ color: 'var(--color-accent)', fontSize: '1.5rem', flexShrink: 0, marginTop: '0.125rem' }}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-on-surface)', margin: '0 0 0.25rem' }}>{item.label}</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', margin: 0, lineHeight: 1.5 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ marginTop: '1.75rem', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>
              {t('howToChooseFootnotePrefix')}{' '}
              <LocalizedLink href="/find-your-path" style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                {t('howToChooseFootnoteLink')}
              </LocalizedLink>
            </p>
          </div>
        </div>
      </section>

      </div>{/* end how-to-choose */}

      {/* Full catalog — one anchor `#program-catalog` for mobile + desktop + deep links */}
      <div id="program-catalog" className="programs-page-catalog-anchor">
        <ProgramsContent sectionId={null} />
      </div>

      <div>

      {/* ── Journey Section — 4-step flow ── */}
      <section className="bg-surface-container-low" style={{ padding: '6rem 0' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 className="text-display-sm" style={{ color: 'var(--color-on-surface)', marginBottom: '1rem' }}>
              {t('fromEnrollment')}
            </h2>
            <p style={{ color: 'var(--color-on-surface-variant)', maxWidth: '32rem', margin: '0 auto' }}>
              {t('journeyIntro')}
            </p>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '2rem',
              position: 'relative',
            }}
            className="programs-journey-grid"
          >
            {[
              { num: '01', icon: 'assessment', title: t('journeyStep1Title'), desc: t('journeyStep1Desc') },
              { num: '02', icon: 'workspace_premium', title: t('journeyStep2Title'), desc: t('journeyStep2Desc') },
              { num: '03', icon: 'trending_up', title: t('journeyStep3Title'), desc: t('journeyStep3Desc') },
              { num: '04', icon: 'handshake', title: t('journeyStep4Title'), desc: t('journeyStep4Desc') },
            ].map((step) => (
              <JourneyStep
                key={step.num}
                number={step.num}
                icon={step.icon}
                title={step.title}
                description={step.desc}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <CTABand
        variant="dark"
        headline={t('ctaHeadline')}
        subheadline={t('ctaSubheadline')}
        primaryAction={
          <LocalizedLink
            href="/apply"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--color-white)',
              color: 'var(--color-accent)',
              padding: '1rem 2rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            {t('ctaPrimary')}
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }} aria-hidden="true">arrow_forward</span>
          </LocalizedLink>
        }
        secondaryAction={
          <LocalizedLink
            href="/find-your-path"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--color-white)',
              padding: '1rem 2rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              textDecoration: 'none',
              border: '2px solid var(--color-white)',
            }}
          >
            {t('ctaSecondary')}
          </LocalizedLink>
        }
      />

      {/* Responsive styles (layout toggle lives at top of page) */}
      <style>{`
        @media (max-width: 1023px) {
          .programs-hero-left { grid-column: 1 / -1 !important; }
          .programs-hero-right { grid-column: 1 / -1 !important; }
          .programs-hero-right > div { aspect-ratio: 16 / 9 !important; max-height: 320px; }
          .programs-journey-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 767px) {
          .programs-journey-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      </div>{/* end responsive wrapper */}

    </div>
  );
}
