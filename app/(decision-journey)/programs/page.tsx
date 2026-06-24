import '@/css/marketing-v3-programs.css';
import type { Metadata } from 'next';
import LocalizedLink from '@/components/LocalizedLink';
import Image from 'next/image';
import { buildPageMetadataAsync } from '@/app/seo';
import ProgramsContent from './ProgramsContent';
import ProgramsMobileBrowseNav from '@/components/marketing/ProgramsMobileBrowseNav';
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
    <div className="wa-v3 inner-page programs-page marketing-stack marketing-stack--enter">
      {/* ══════════════════════════════════════════════
          HERO — blend crimson→plum tile + photo
          ══════════════════════════════════════════════ */}
      <header className="wa-hero">
        <div className="wa-wrap">
          <div className="wa-prog-hero-grid">
            <div className="wa-tile wa-tile--hero">
              <span className="wa-ribbon">{t('heroTitle')}</span>
              <h1>
                {t('headlineMain')}{' '}
                <span className="wa-accent">{t('headlineAccent')}</span>
              </h1>
              <p>{t('heroDesc')}</p>
              <div className="wa-hero-actions">
                <LocalizedLink href="#programs-quick-start" className="wa-btn wa-btn--light">
                  {t('heroCta1')}
                </LocalizedLink>
                <LocalizedLink href="/find-your-path" className="wa-btn wa-btn--translucent">
                  {t('heroCta2')}
                </LocalizedLink>
              </div>
            </div>
            <div className="wa-prog-hero-photo programs-hero-right">
              <Image
                src="/images/hero-people.webp"
                alt="WorkforceAP members collaborating on training"
                fill
                sizes="(min-width: 1024px) 500px, 100vw"
                style={{ objectFit: 'cover' }}
                priority
              />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile: sticky category chips sit directly under the hero so members can
          jump to the catalog without scrolling past quick-start cards first. */}
      <ProgramsMobileBrowseNav />

      {/* ══════════════════════════════════════════════
          QUICK START — lanes that fit you best
          ══════════════════════════════════════════════ */}
      <section id="programs-quick-start" className="wa-band wa-band--surface programs-quick-start">
        <div className="wa-wrap">
          <div className="wa-sec-head wa-qs-head">
            <div>
              <span className="wa-eyebrow">{t('quickStart')}</span>
              <h2>{t('quickStartBody')}</h2>
            </div>
            <LocalizedLink href="/find-your-path" className="wa-qs-link">
              {t('notSure')}
            </LocalizedLink>
          </div>

          <div className="wa-qs">
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
                href: '/programs/project-management-professional-certificate-microsoft',
                cta: t('quickStartCard3Cta'),
              },
            ].map((item) => (
              <LocalizedLink key={item.title} href={item.href} className="wa-qcard">
                <span className="wa-eb">{item.eyebrow}</span>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
                <span className="wa-go">
                  {item.cta}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </LocalizedLink>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          HOW TO CHOOSE + TOOL ROUTING — desktop only
          ══════════════════════════════════════════════ */}
      <div className="programs-page-desktop-only">

        {/* ── Tool routing ── */}
        <section className="wa-band" style={{ paddingBottom: 0 }}>
          <div className="wa-wrap">
            <div className="wa-tools">
              <LocalizedLink href="/find-your-path" className="wa-btn wa-btn--primary">
                <svg className="wa-tool-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
                </svg>
                {t('notSure')}
              </LocalizedLink>
              <LocalizedLink href="/program-comparison" className="wa-btn wa-btn--ghost">
                <svg className="wa-tool-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M7 8l-4 4 4 4M17 8l4 4-4 4M14 4l-4 16" />
                </svg>
                {t('toolChipCompare')}
              </LocalizedLink>
              <LocalizedLink href="/salary-guide" className="wa-btn wa-btn--ghost">
                <svg className="wa-tool-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v10M9.5 9.2a2.2 2.2 0 0 1 2.5-1.2c1.2.2 1.8 1 1.8 1.8 0 1.8-3.6 1.3-3.6 3.1 0 .9.7 1.6 1.8 1.8a2.2 2.2 0 0 0 2.5-1.2" />
                </svg>
                {t('toolChipSalary')}
              </LocalizedLink>
            </div>
          </div>
        </section>

        {/* ── How to choose ── */}
        <section className="wa-band">
          <div className="wa-wrap">
            <div className="wa-sec-head">
              <span className="wa-eyebrow">{t('howToChoose')}</span>
              <h2>{t('howToChoose')}</h2>
              <p>{t('howToChooseDesc')}</p>
            </div>
            <div className="wa-choose">
              {[
                {
                  label: t('howToChooseFactor1Label'),
                  desc: t('howToChooseFactor1Desc'),
                  icon: (
                    <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" />
                  ),
                },
                {
                  label: t('howToChooseFactor2Label'),
                  desc: t('howToChooseFactor2Desc'),
                  icon: (
                    <>
                      <rect x="5" y="2" width="14" height="20" rx="2" />
                      <path d="M11 18h2" />
                    </>
                  ),
                },
                {
                  label: t('howToChooseFactor3Label'),
                  desc: t('howToChooseFactor3Desc'),
                  icon: (
                    <>
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </>
                  ),
                },
                {
                  label: t('howToChooseFactor4Label'),
                  desc: t('howToChooseFactor4Desc'),
                  icon: (
                    <path d="M12 2l2.4 7.4H22l-6 4.5 2.3 7.1L12 16.5 5.7 21l2.3-7.1-6-4.5h7.6z" />
                  ),
                },
                {
                  label: t('howToChooseFactor5Label'),
                  desc: t('howToChooseFactor5Desc'),
                  icon: (
                    <>
                      <path d="M3 17l6-6 4 4 7-8" />
                      <path d="M21 7v5h-5" />
                    </>
                  ),
                },
              ].map((item) => (
                <div key={item.label} className="wa-fcard">
                  <div className="wa-ic">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      {item.icon}
                    </svg>
                  </div>
                  <h3>{item.label}</h3>
                  <p>{item.desc}</p>
                </div>
              ))}
            </div>
            <p className="wa-choose-foot">
              {t('howToChooseFootnotePrefix')}{' '}
              <LocalizedLink href="/find-your-path">
                {t('howToChooseFootnoteLink')}
              </LocalizedLink>
            </p>
          </div>
        </section>

      </div>{/* end how-to-choose */}

      {/* Full catalog — one anchor `#program-catalog` for mobile + desktop + deep links */}
      <div id="program-catalog" className="programs-page-catalog-anchor">
        <ProgramsContent sectionId={null} />
      </div>

      <div>

        {/* ══════════════════════════════════════════════
            JOURNEY — 4-step flow (blend step cards)
            ══════════════════════════════════════════════ */}
        <section className="wa-band wa-band--surface">
          <div className="wa-wrap">
            <div className="wa-sec-head" style={{ maxWidth: '660px' }}>
              <span className="wa-eyebrow">{t('fromEnrollment')}</span>
              <h2>{t('fromEnrollment')}</h2>
              <p>{t('journeyIntro')}</p>
            </div>
            <div className="wa-prog-steps programs-journey-grid">
              {[
                { num: '1', title: t('journeyStep1Title'), desc: t('journeyStep1Desc') },
                { num: '2', title: t('journeyStep2Title'), desc: t('journeyStep2Desc') },
                { num: '3', title: t('journeyStep3Title'), desc: t('journeyStep3Desc') },
                { num: '4', title: t('journeyStep4Title'), desc: t('journeyStep4Desc') },
              ].map((step) => (
                <div key={step.num} className="wa-step">
                  <div className="wa-n">{step.num}</div>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            CTA — crimson→plum band
            ══════════════════════════════════════════════ */}
        <section className="wa-band" style={{ paddingTop: 0 }}>
          <div className="wa-wrap">
            <div className="wa-cta">
              <h2>{t('ctaHeadline')}</h2>
              <p>{t('ctaSubheadline')}</p>
              <div className="wa-acts">
                <LocalizedLink href="/apply" className="wa-btn wa-btn--light">
                  {t('ctaPrimary')}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </LocalizedLink>
                <LocalizedLink href="/find-your-path" className="wa-btn wa-btn--translucent">
                  {t('ctaSecondary')}
                </LocalizedLink>
              </div>
            </div>
          </div>
        </section>

        {/* Responsive styles (layout toggle lives at top of page) */}
        <style>{`
          @media (max-width: 1023px) {
            .programs-hero-left { grid-column: 1 / -1 !important; }
            .programs-hero-right { grid-column: 1 / -1 !important; }
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
