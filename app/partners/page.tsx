/**
 * /partners — Marketing landing page (Sprint G4, PLAN-2026-Q3.md §2.1)
 *
 * Cold partner traffic (referral orgs, workforce boards, nonprofits, conferences,
 * ads) lands here and self-serves into the partner channel. The portal already
 * works; this page is the marketing front door.
 *
 * Presentation reskinned to the approved "blend" design (docs/mockups/
 * wa-v3-partners.html) using the shared .wa-v3 system (css/marketing-v3.css) plus
 * page-unique css/marketing-v3-partners.css. Behavior, data fetching, the partner
 * signup form, SEO, locale handling, links, and every i18n key are preserved.
 */
import '@/css/marketing-v3-partners.css';
import Image from 'next/image';
import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';
import LocalizedLink from '@/components/LocalizedLink';
import Footer from '@/components/Footer';
import { getRequestLocale } from '@/lib/i18n/server';
import { withLocalePrefix } from '@/lib/i18n/config';
import { getTranslations } from 'next-intl/server';
import PartnerSignupForm from '@/components/partner/PartnerSignupForm';
import { prisma } from '@/lib/db/prisma';
import { getOutcomesSocialProof } from '@/lib/outcomes/socialProof';
import { getSiteUrl } from '@/lib/seo/siteEnvironment';

const PARTNER_LANES = ['partnerLane1', 'partnerLane2', 'partnerLane3', 'partnerLane4', 'partnerLane5'] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('marketing.partners');
  return buildPageMetadataAsync({
    title: t('title'),
    description: t('description'),
    path: '/partners',
    image: '/og-image.png',
  });
}

export default async function PartnersPage() {
  const t = await getTranslations('marketing.partners');
  const locale = await getRequestLocale();
  const socialProof = await getOutcomesSocialProof(prisma, { baseUrl: getSiteUrl() });
  const partnershipContactHref = `${withLocalePrefix('/contact', locale)}?topic=partnership`;
  const employersMarketingHref = withLocalePrefix('/employers', locale);
  const partnerSignupHref = `${withLocalePrefix('/partners', locale)}#partner-signup`;
  const partnerLoginHref = `${withLocalePrefix('/login', locale)}?redirectTo=/partner`;

  return (
    <div className="wa-v3">
      {/* ===== Hero: next/image photo behind crimson→plum blend gradient ===== */}
      <header className="wa-hero wa-p-hero">
        <div className="wa-wrap">
          <div className="wa-tile wa-tile--hero">
            <div className="wa-hero-photo" aria-hidden="true">
              <Image
                src="/images/hero-people.webp"
                alt=""
                fill
                priority
                fetchPriority="high"
                sizes="100vw"
                style={{ objectFit: 'cover', objectPosition: 'center' }}
              />
            </div>

            <span className="wa-ribbon">
              <span aria-hidden="true" style={{ marginRight: '0.4rem' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px' }}>
                  <path d="m11 17 2 2a1 1 0 1 0 3-3" />
                  <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" />
                  <path d="m21 3 1 11h-2" />
                  <path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" />
                  <path d="M3 4h8" />
                </svg>
              </span>
              {t('eyebrow')}
            </span>
            <h1>
              {t('heroHeadline')} <span className="wa-accent">{t('heroHeadlineAccent')}</span>
            </h1>
            <p>{t('heroCopy')}</p>

            <div className="wa-hero-actions">
              <LocalizedLink href={partnerSignupHref} className="wa-btn wa-btn--gold">
                {t('heroCtaPrimary')}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </LocalizedLink>
              <LocalizedLink href={partnerLoginHref} className="wa-btn wa-btn--translucent">
                {t('heroCtaSecondary')}
              </LocalizedLink>
            </div>
          </div>
        </div>
      </header>

      {/* ===== Partnership lanes ===== */}
      <div className="wa-creds" aria-label="Partnership lanes">
        <div className="wa-wrap">
          <div className="wa-lab">{t('logosLabel')}</div>
          <div className="wa-row">
            {PARTNER_LANES.map((key) => (
              <span key={key}>{t(key)}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Stats band removed pre-launch — placeholder figures (450 / 83% / 340)
          would misrepresent results before any real partner data exists. */}

      {socialProof.enabled && socialProof.partnerSnapshot ? (
        <section className="wa-band" aria-labelledby="partner-outcome-snapshot">
          <div className="wa-wrap">
            <div className="wa-snapshot">
              <span className="wa-eyebrow">Live partner outcomes</span>
              <h2 id="partner-outcome-snapshot">Referral snapshot from verified records</h2>
              <p className="wa-snapshot-lede">
                These counts come from the live partner referral and placement tables. Rates stay hidden until the denominator meets the outcomes methodology threshold.
              </p>
              <div className="wa-snapshot-grid">
                <div className="wa-stat">
                  <div className="wa-k">{socialProof.partnerSnapshot.referrals}</div>
                  <div className="wa-s">partner referrals</div>
                </div>
                <div className="wa-stat">
                  <div className="wa-k">{socialProof.partnerSnapshot.placements}</div>
                  <div className="wa-s">verified placements</div>
                </div>
                <div className="wa-stat">
                  <div className="wa-k">{socialProof.partnerSnapshot.placementRate.label}</div>
                  <div className="wa-s">
                    {socialProof.partnerSnapshot.placementRate.suppressed ? 'rate suppressed' : 'placement rate'}
                  </div>
                </div>
              </div>
              <p className="wa-snapshot-note">{socialProof.methodologyNote}</p>
            </div>
          </div>
        </section>
      ) : null}

      {/* ===== How it works (3-step) ===== */}
      <section className="wa-band">
        <div className="wa-wrap">
          <div className="wa-sec-head" style={{ margin: '0 auto 42px', textAlign: 'center' }}>
            <span className="wa-eyebrow wa-eyebrow--gold">{t('howTitle')}</span>
            <h2>{t('howTitle')}</h2>
            <p style={{ marginLeft: 'auto', marginRight: 'auto' }}>{t('howSubtitle')}</p>
          </div>
          <div className="wa-steps wa-steps--centered">
            <div className="wa-step">
              <div className="wa-n wa-n--gold">1</div>
              <h3>{t('howStep1Title')}</h3>
              <p>{t('howStep1Desc')}</p>
            </div>
            <div className="wa-step">
              <div className="wa-n wa-n--gold">2</div>
              <h3>{t('howStep2Title')}</h3>
              <p>{t('howStep2Desc')}</p>
            </div>
            <div className="wa-step">
              <div className="wa-n wa-n--gold">3</div>
              <h3>{t('howStep3Title')}</h3>
              <p>{t('howStep3Desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Why partners pick WorkforceAP ===== */}
      <section className="wa-band wa-band--surface">
        <div className="wa-wrap">
          <div className="wa-sec-head" style={{ margin: '0 auto 42px', textAlign: 'center' }}>
            <span className="wa-eyebrow wa-eyebrow--gold">{t('whyTitle')}</span>
            <h2>{t('whyTitle')}</h2>
            <p style={{ marginLeft: 'auto', marginRight: 'auto' }}>{t('whySubtitle')}</p>
          </div>
          <div className="wa-vgrid">
            <div className="wa-vcard">
              <div className="wa-ic" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M3 12h4l3 7 4-14 3 7h4" />
                </svg>
              </div>
              <div>
                <h3>{t('whyValue1Title')}</h3>
                <p>{t('whyValue1Desc')}</p>
              </div>
            </div>
            <div className="wa-vcard">
              <div className="wa-ic" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M14 3v5h5" />
                  <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M8 13h8M8 17h6" />
                </svg>
              </div>
              <div>
                <h3>{t('whyValue2Title')}</h3>
                <p>{t('whyValue2Desc')}</p>
              </div>
            </div>
            <div className="wa-vcard">
              <div className="wa-ic" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
              </div>
              <div>
                <h3>{t('whyValue3Title')}</h3>
                <p>{t('whyValue3Desc')}</p>
              </div>
            </div>
            <div className="wa-vcard">
              <div className="wa-ic" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v10M9.5 9.5c0-1 1-1.7 2.5-1.7s2.5.8 2.5 1.8-1 1.5-2.5 1.7-2.5.7-2.5 1.7 1 1.8 2.5 1.8 2.5-.7 2.5-1.7" />
                </svg>
              </div>
              <div>
                <h3>{t('whyValue4Title')}</h3>
                <p>{t('whyValue4Desc')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Partner walkthrough CTA ===== */}
      <section className="wa-band">
        <div className="wa-wrap" style={{ maxWidth: '760px' }}>
          <div className="wa-demo">
            <div className="wa-demo-ic" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <div className="wa-demo-body">
              <span className="wa-eyebrow wa-eyebrow--gold">{t('demoEyebrow')}</span>
              <h2>{t('demoTitle')}</h2>
              <p>{t('demoCopy')}</p>
            </div>
            <LocalizedLink href={partnershipContactHref} className="wa-btn wa-btn--primary">
              {t('demoCta')}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </LocalizedLink>
          </div>
        </div>
      </section>

      {/* ===== Partnership Pathways ===== */}
      <section id="partner-types" className="wa-band wa-band--surface">
        <div className="wa-wrap">
          <div className="wa-sec-head">
            <span className="wa-eyebrow wa-eyebrow--gold">{t('pathwaysTitle')}</span>
            <h2>
              {t('pathwaysTitle')} <span className="wa-accent">{t('pathwaysTitleAccent')}</span>
            </h2>
          </div>

          <div className="wa-pgrid wa-pgrid--two">
            {/* Referral Partners */}
            <div className="wa-pcard">
              <div className="wa-ic wa-ic--gold" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="9" cy="8" r="3.5" />
                  <path d="M2 20c0-3.3 3.1-5 7-5s7 1.7 7 5" />
                  <path d="M17.5 7.5l2 2 3-3.5" />
                </svg>
              </div>
              <span className="wa-typetag">{t('typeYouAre')}</span>
              <h3>{t('referralType')}</h3>
              <div className="wa-who">{t('referralWho')}</div>
              <p className="wa-why">{t('referralWhy')}</p>
              <LocalizedLink href={partnerSignupHref} className="wa-go wa-go--gold">
                {t('referralCta')}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </LocalizedLink>
            </div>

            {/* Training Centers */}
            <div className="wa-pcard">
              <div className="wa-ic wa-ic--info" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M3 7l9-4 9 4-9 4-9-4z" />
                  <path d="M7 10v5c0 1.5 2.2 2.5 5 2.5s5-1 5-2.5v-5" />
                </svg>
              </div>
              <span className="wa-typetag">{t('typeYouAre')}</span>
              <h3>{t('trainingType')}</h3>
              <div className="wa-who">{t('trainingWho')}</div>
              <p className="wa-why">{t('trainingWhy')}</p>
              <LocalizedLink href={partnershipContactHref} className="wa-go wa-go--gold">
                {t('trainingCta')}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </LocalizedLink>
            </div>

            {/* Public Agencies */}
            <div className="wa-pcard">
              <div className="wa-ic wa-ic--accent" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M3 21h18M5 21V8l7-4 7 4v13" />
                  <path d="M9 21v-5h6v5" />
                </svg>
              </div>
              <span className="wa-typetag">{t('typeYouAre')}</span>
              <h3>{t('agencyType')}</h3>
              <div className="wa-who">{t('agencyWho')}</div>
              <p className="wa-why">{t('agencyWhy')}</p>
              <LocalizedLink href={partnershipContactHref} className="wa-go wa-go--gold">
                {t('agencyCta')}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </LocalizedLink>
            </div>

            {/* Philanthropic Funders */}
            <div className="wa-pcard">
              <div className="wa-ic wa-ic--gold" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
                </svg>
              </div>
              <span className="wa-typetag">{t('typeYouAre')}</span>
              <h3>{t('funderType')}</h3>
              <div className="wa-who">{t('funderWho')}</div>
              <p className="wa-why">{t('funderWhy')}</p>
              <LocalizedLink href={partnershipContactHref} className="wa-go wa-go--gold">
                {t('funderCta')}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </LocalizedLink>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Referral partner self-service signup (single path) ===== */}
      <section id="partner-signup" className="wa-band" style={{ scrollMarginTop: '5rem' }}>
        <div className="wa-wrap">
          <div className="wa-signup">
            <div>
              <span className="wa-eyebrow wa-eyebrow--gold">{t('signupEyebrow')}</span>
              <h2 style={{ marginTop: '12px' }}>{t('signupTitle')}</h2>
              <p className="wa-sub">{t('signupSubtitle')}</p>
              <p className="wa-alt">
                {t('signupAlready')}{' '}
                <LocalizedLink href={partnerLoginHref}>{t('signupSignIn')}</LocalizedLink>
              </p>
              <p className="wa-alt">
                {t('signupOtherPaths')}{' '}
                <LocalizedLink href={partnershipContactHref}>{t('signupContactTeam')}</LocalizedLink>
              </p>
            </div>
            <PartnerSignupForm />
          </div>
        </div>
      </section>

      {/* ===== Digital Integration, Human Impact ===== */}
      <section className="wa-band wa-band--surface">
        <div className="wa-wrap">
          <div className="wa-split">
            <div>
              <div className="wa-sec-head" style={{ marginBottom: '24px' }}>
                <span className="wa-eyebrow wa-eyebrow--gold">{t('platformTitle')}</span>
                <h2>
                  {t('platformTitle')} <span className="wa-accent">{t('platformTitleAccent')}</span>
                </h2>
              </div>

              <div className="wa-feat-rows">
                <div className="wa-feat-row">
                  <span className="wa-ic" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M4 6h16M4 12h10M4 18h7" />
                      <path d="M16 16l2 2 4-4" />
                    </svg>
                  </span>
                  <div>
                    <h3>{t('platformFeature1Title')}</h3>
                    <p>{t('platformFeature1Desc')}</p>
                  </div>
                </div>

                <div className="wa-feat-row">
                  <span className="wa-ic" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="14" rx="2" />
                      <path d="M7 14l3-3 2 2 4-4" />
                    </svg>
                  </span>
                  <div>
                    <h3>{t('platformFeature2Title')}</h3>
                    <p>{t('platformFeature2Desc')}</p>
                  </div>
                </div>

                <div className="wa-feat-row">
                  <span className="wa-ic" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M9 11l2 2 5-5" />
                      <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" />
                    </svg>
                  </span>
                  <div>
                    <h3>{t('platformFeature3Title')}</h3>
                    <p>{t('platformFeature3Desc')}</p>
                  </div>
                </div>
              </div>
            </div>

            <figure className="wa-split-fig">
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
      </section>

      {/* ===== Partner FAQ ===== */}
      <section className="wa-band">
        <div className="wa-wrap">
          <div className="wa-sec-head" style={{ margin: '0 auto 42px', textAlign: 'center' }}>
            <span className="wa-eyebrow wa-eyebrow--gold">{t('faqTitle')}</span>
            <h2>{t('faqTitle')}</h2>
          </div>

          <div className="wa-faq">
            <details>
              <summary>
                {t('faqCobrandQ')}
                <span className="wa-pl" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </summary>
              <p>{t('faqCobrandA')}</p>
            </details>
            <details>
              <summary>
                {t('faqContactQ')}
                <span className="wa-pl" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </summary>
              <p>{t('faqContactA')}</p>
            </details>
            <details>
              <summary>
                {t('faqNotificationsQ')}
                <span className="wa-pl" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </summary>
              <p>{t('faqNotificationsA')}</p>
            </details>
            <details>
              <summary>
                {t('faqBulkQ')}
                <span className="wa-pl" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </summary>
              <p>{t('faqBulkA')}</p>
            </details>
            <details>
              <summary>
                {t('faqFeeQ')}
                <span className="wa-pl" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </summary>
              <p>{t('faqFeeA')}</p>
            </details>
            <details>
              <summary>
                {t('faqReportsQ')}
                <span className="wa-pl" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </summary>
              <p>{t('faqReportsA')}</p>
            </details>
          </div>
        </div>
      </section>

      {/* ===== Closing CTA ===== */}
      <section className="wa-band">
        <div className="wa-wrap">
          <div className="wa-cta">
            <h2>{t('ctaTitle')}</h2>
            <p>{t('ctaCopy')}</p>
            <div className="wa-acts">
              <LocalizedLink href={partnerSignupHref} className="wa-btn wa-btn--light">
                {t('ctaCta')}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </LocalizedLink>
              <LocalizedLink href={employersMarketingHref} className="wa-btn wa-btn--translucent">
                {t('ctaCta2')}
              </LocalizedLink>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
