import '@/css/marketing-v3-how-it-works.css';
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

// Inline SVG icons (no emoji, no icon font) — presentation only.
function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function StepDot() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function LaptopIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

const TRAINING_ICONS = [
  // Program cost coverage (gold)
  (
    <svg key="t1" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c0 1 2 2 6 2s6-1 6-2v-5" />
    </svg>
  ),
  // Peer networks (accent)
  (
    <svg key="t2" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="9" cy="7" r="3" />
      <path d="M2 21c0-3 3-5 7-5M16 5a3 3 0 0 1 0 6M22 21c0-2-1-3-3-4" />
    </svg>
  ),
  // Direct pipeline (info)
  (
    <svg key="t3" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  // Soft-skill coaching (gold)
  (
    <svg key="t4" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 2a5 5 0 0 0-5 5c0 2 1 3 2 4l-1 6h8l-1-6c1-1 2-2 2-4a5 5 0 0 0-5-5z" />
    </svg>
  ),
];

const TRAINING_IC_CLASS = ['wa-ic--gold', 'wa-ic--accent', 'wa-ic--info', 'wa-ic--gold'];

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

  const trainingCards = [
    { title: t('training1Title'), desc: t('training1Desc') },
    { title: t('training2Title'), desc: t('training2Desc') },
    { title: t('training3Title'), desc: t('training3Desc') },
    { title: t('training4Title'), desc: t('training4Desc') },
  ];

  return (
    <div className="wa-v3">
      {/* Hero / intro */}
      <header className="hiw-hero">
        <div className="wa-wrap">
          <span className="wa-eyebrow">{t('heroEyebrow')}</span>
          <h1>
            {t('heroHeadline')} <span className="wa-accent">{t('heroHeadlineAccent')}</span>
          </h1>
          <p className="hiw-lede">{t('heroCopy')}</p>
          <div className="hiw-hero-actions">
            <LocalizedLink href="/find-your-path" className="wa-btn wa-btn--primary">
              {t('heroCta1')}
            </LocalizedLink>
            <LocalizedLink href="/apply" className="wa-btn wa-btn--ghost">
              {t('heroCta2')}
            </LocalizedLink>
            <LocalizedLink href="/programs" className="wa-btn wa-btn--ghost">
              {t('heroCta3')}
            </LocalizedLink>
          </div>

          {/* Who can apply */}
          <div className="hiw-applybox">
            <div>
              <span className="wa-eyebrow">{t('heroEyebrow')}</span>
              <h2>{t('whoCanApplyTitle')}</h2>
              <p>{t('whoCanApplyBody')}</p>
              <LocalizedLink href="/apply" className="hiw-wioa">
                {t('wioaLink')}
                <ArrowIcon />
              </LocalizedLink>
            </div>
            <div className="hiw-badge" aria-hidden="true">
              <PeopleIcon />
            </div>
          </div>
        </div>
      </header>

      {/* The Journey: member milestones (same steps as homepage) */}
      <section className="wa-band wa-band--surface" id="journey">
        <div className="wa-wrap">
          <div className="wa-sec-head">
            <span className="wa-eyebrow">{t('heroEyebrow')}</span>
            <h2>{t('journeyTitle')}</h2>
            <p>{t('journeySubtitle')}</p>
          </div>

          {PHASES(t).map((phase) => (
            <div key={phase.id} className={`hiw-phase hiw-p${phase.id}`}>
              <div className="hiw-rail">
                <div className="hiw-pnum">{phase.id}</div>
                <div className="hiw-line" aria-hidden="true" />
              </div>
              <div className="hiw-body">
                <div className="hiw-plabel">{phase.label}</div>
                <h3 className="hiw-ptitle">{phase.title}</h3>
                <div className="hiw-steps">
                  {phase.steps.map((step) => (
                    <div key={step.num} className="hiw-si">
                      <span className="hiw-dot">
                        <StepDot />
                      </span>
                      <div>
                        <div className="hiw-st">{step.title}</div>
                        {step.num === 2 && overviewVideoEmbed ? (
                          <div className="hiw-video">
                            <div className="hiw-video-frame">
                              <iframe
                                title="Overview — counselor introduction"
                                src={overviewVideoEmbed}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                            <p className="hiw-video-cap">{t('videoCaption')}</p>
                          </div>
                        ) : null}
                        <div className="hiw-sdesc">{step.desc}</div>
                        {step.why && (
                          <div className="hiw-swhy">
                            <b>{t('whyPrefix')}</b> {step.why}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Post-timeline CTA — prevent dead-end after long scroll */}
          <div className="hiw-midcta">
            <p>{t('ctaBody')}</p>
            <div className="hiw-midcta-acts">
              <LocalizedLink href="/apply" className="wa-btn wa-btn--primary">
                {t('ctaApply')}
              </LocalizedLink>
              <LocalizedLink href="/find-your-path" className="wa-btn wa-btn--ghost">
                {t('heroCta1')}
              </LocalizedLink>
            </div>
          </div>
        </div>
      </section>

      {/* Career Training Benefits */}
      <section className="wa-band">
        <div className="wa-wrap">
          <div className="wa-sec-head">
            <span className="wa-eyebrow">{t('trainingTitle')}</span>
            <h2>{t('trainingTitle')}</h2>
          </div>
          <div className="wa-pgrid">
            {trainingCards.map((card, i) => (
              <div key={i} className="wa-pcard">
                <div className={`wa-ic ${TRAINING_IC_CLASS[i]}`}>{TRAINING_ICONS[i]}</div>
                <h3>{card.title}</h3>
                <p className="wa-area">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Support features: Loaner laptop + 150-day */}
      <section className="wa-band wa-band--surface">
        <div className="wa-wrap">
          <div className="hiw-feat">
            <div className="hiw-fcard">
              <div className="wa-ic wa-ic--info">
                <LaptopIcon />
              </div>
              <h3>{t('laptopTitle')}</h3>
              <p>{t('laptopBody')}</p>
              <ul>
                <li>
                  <CheckIcon />
                  {t('laptopItem1')}
                </li>
                <li>
                  <CheckIcon />
                  {t('laptopItem2')}
                </li>
                <li>
                  <CheckIcon />
                  {t('laptopItem3')}
                </li>
              </ul>
            </div>
            <div className="hiw-fcard">
              <div className="wa-ic wa-ic--accent">
                <CalendarIcon />
              </div>
              <h3>{t('support150Title')}</h3>
              <p>{t('support150Body')}</p>
              <div className="hiw-bgrid">
                <div className="hiw-b">
                  <div className="hiw-lab">{t('benefit01Label')}</div>
                  <div className="hiw-v">{t('benefit01Text')}</div>
                </div>
                <div className="hiw-b">
                  <div className="hiw-lab">{t('benefit02Label')}</div>
                  <div className="hiw-v">{t('benefit02Text')}</div>
                </div>
                <div className="hiw-b">
                  <div className="hiw-lab">{t('benefit03Label')}</div>
                  <div className="hiw-v">{t('benefit03Text')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Program commitment panel (behavior preserved) */}
      <section className="hiw-commitment">
        <div className="wa-wrap">
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
              // --wa-gold (#a47f38) gave white-on-gold only 3.7:1; --wa-gold-dark
              // (#7d5f26) clears WCAG AA 4.5:1 (5.94:1) for this 18px button label.
              background: 'var(--wa-gold-dark)',
              color: '#fff',
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

      <MobileBottomNav />
      <Footer />
      {/* Spacer for mobile bottom nav — ensures footer content is not hidden */}
      <div className="mobile-bottom-nav-spacer" aria-hidden="true" />
    </div>
  );
}
