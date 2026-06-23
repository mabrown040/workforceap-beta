import LocalizedLinkServer from '@/components/LocalizedLinkServer';
import { getTranslations } from 'next-intl/server';

export type HomeProgramShowcaseCard = {
  slug: string;
  name?: string | null;
  category?: string | null;
  duration?: string | null;
  static?: { title?: string | null; duration?: string | null; categoryLabel?: string | null } | null;
};

/* Inline SVG icons (no emoji, no icon-font dependency). */
function IconRoundedSquare({ variant }: { variant: 0 | 1 | 2 }) {
  if (variant === 0) {
    // hardware / IT
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </svg>
    );
  }
  if (variant === 1) {
    // AI / data
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      </svg>
    );
  }
  // project management / business
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M9 11l3 3 8-8" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

const PCARD_ICON_TONE = ['wa-ic--info', 'wa-ic--accent', 'wa-ic--gold'] as const;

export default async function HomePageBelowFold({
  homeProgramShowcase,
  programCount,
}: {
  homeProgramShowcase: HomeProgramShowcaseCard[];
  programCount: number;
}) {
  const t = await getTranslations('marketing.home');

  return (
    <>
      {/* CERT PARTNERS — employer-recognized credential row */}
      <div className="wa-creds">
        <div className="wa-wrap">
          <div className="wa-lab">{t('credBarLabel')}</div>
          <div className="wa-row">
            <span>IBM</span>
            <span>Google</span>
            <span>Microsoft</span>
            <span>AWS</span>
            <span>CompTIA</span>
            <span className="wa-creds-extra">+ CPT &amp; CLT</span>
          </div>
        </div>
      </div>

      {/* PROGRAMS — real catalog data, real /programs/{slug} hrefs */}
      <section className="wa-band" id="programs">
        <div className="wa-wrap">
          <div className="wa-sec-head">
            <span className="wa-eyebrow">{t('programsEyebrow')}</span>
            <h2>{t('programsTitle')}</h2>
            <p>
              {t('programsSubtitle', { featuredCount: homeProgramShowcase.length, count: programCount })}
            </p>
          </div>
          <div className="wa-pgrid">
            {homeProgramShowcase.map((p, index) => {
              const title = p.static?.title ?? p.name ?? '';
              const area = p.static?.categoryLabel ?? p.category ?? '';
              return (
                <LocalizedLinkServer
                  key={p.slug}
                  href={`/programs/${p.slug}`}
                  className="wa-pcard"
                  aria-label={`${title} — ${t('programsCardCta')}`}
                >
                  <div className={`wa-ic ${PCARD_ICON_TONE[index % PCARD_ICON_TONE.length]}`}>
                    <IconRoundedSquare variant={(index % 3) as 0 | 1 | 2} />
                  </div>
                  <h3>{title}</h3>
                  {area ? <div className="wa-area">{area}</div> : null}
                  <span className="wa-go">{t('programsCardCta')} →</span>
                </LocalizedLinkServer>
              );
            })}
          </div>
          <div style={{ marginTop: '32px' }}>
            <LocalizedLinkServer href="/programs#program-catalog" className="wa-btn wa-btn--ghost">
              {t('programsCta', { count: programCount })}
            </LocalizedLinkServer>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — 3 steps */}
      <section className="wa-band wa-band--surface" id="how">
        <div className="wa-wrap">
          <div className="wa-sec-head">
            <span className="wa-eyebrow">{t('contrastEyebrow')}</span>
            <h2>{t('journeyTitle')}</h2>
          </div>
          <div className="wa-steps">
            <div className="wa-step">
              <div className="wa-n">1</div>
              <h3>{t('journeyPhaseGetStarted')}</h3>
              <p>{t('heroStep1')}</p>
            </div>
            <div className="wa-step">
              <div className="wa-n">2</div>
              <h3>{t('journeyPhaseTrain')}</h3>
              <p>{t('heroStep2')}</p>
            </div>
            <div className="wa-step">
              <div className="wa-n">3</div>
              <h3>{t('journeyPhaseLaunch')}</h3>
              <p>{t('heroStep3')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* NETWORK — tri-audience */}
      <section className="wa-band" id="network">
        <div className="wa-wrap">
          <div className="wa-sec-head">
            <span className="wa-eyebrow">{t('partnershipsEyebrow')}</span>
            <h2>{t('networkTitle')}</h2>
          </div>
          <div className="wa-tri">
            <div className="wa-acard">
              <div className="wa-ic wa-ic--accent">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
                </svg>
              </div>
              <h3>{t('memberCardTitle')}</h3>
              <p>{t('memberCardResume')}</p>
              <div style={{ marginTop: '14px' }}>
                <LocalizedLinkServer href="/apply" className="wa-btn wa-btn--primary" style={{ padding: '10px 20px' }}>
                  {t('memberCardCta')}
                </LocalizedLinkServer>
              </div>
            </div>
            <div className="wa-acard">
              <div className="wa-ic wa-ic--info">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <rect x="3" y="7" width="18" height="13" rx="2" />
                  <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </div>
              <h3>{t('employerCardTitle')}</h3>
              <p>{t('employerCardCandidates')}</p>
              <div style={{ marginTop: '14px' }}>
                <LocalizedLinkServer href="/employers" className="wa-btn wa-btn--ghost" style={{ padding: '10px 20px' }}>
                  {t('employerCardCta')}
                </LocalizedLinkServer>
              </div>
            </div>
            <div className="wa-acard">
              <div className="wa-ic wa-ic--gold">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path d="M3 21h18M5 21V8l7-5 7 5v13" />
                </svg>
              </div>
              <h3>{t('partnerCardTitle')}</h3>
              <p>{t('partnerCardImpact')}</p>
              <div style={{ marginTop: '14px' }}>
                <LocalizedLinkServer href="/partners" className="wa-btn wa-btn--ghost" style={{ padding: '10px 20px' }}>
                  {t('partnerCardCta')}
                </LocalizedLinkServer>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST band — 25+yrs / 501(c)(3) / employer-recognized */}
      <section className="wa-band wa-band--trust" id="trust">
        <div className="wa-wrap">
          <div className="wa-trust">
            <div className="wa-t">
              <div className="wa-k">{t('trustYears')}</div>
              <p>{t('trustYearsDetail')}</p>
            </div>
            <div className="wa-t">
              <div className="wa-k">{t('memberPromiseTitleAccent')}</div>
              <p>{t('statQualifyingMembers')}</p>
            </div>
            <div className="wa-t">
              <div className="wa-k">{t('trustEmployer')}</div>
              <p>{t('trustEmployerDetail')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CRIMSON CTA */}
      <section className="wa-band">
        <div className="wa-wrap">
          <div className="wa-cta">
            <h2>{t('ctaTitle')}</h2>
            <p>{t('ctaCopy')}</p>
            <div className="wa-acts">
              <LocalizedLinkServer href="/apply" className="wa-btn wa-btn--light">
                {t('ctaApply')}
              </LocalizedLinkServer>
              <LocalizedLinkServer href="/find-your-path" className="wa-btn wa-btn--translucent">
                {t('ctaFind')}
              </LocalizedLinkServer>
              <LocalizedLinkServer href="/programs#program-catalog" className="wa-btn wa-btn--translucent">
                {t('ctaViewPrograms')}
              </LocalizedLinkServer>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
