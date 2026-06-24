import '@/css/marketing-v3-outcomes.css';
import type { Metadata } from 'next';
import LocalizedLink from '@/components/LocalizedLink';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import { buildPageMetadataAsync } from '@/app/seo';
import { prisma } from '@/lib/db/prisma';
import { getPublicPlacementOutcomes, wilsonInterval } from '@/lib/outcomes/publicPlacementOutcomes';
import { getOutcomesSocialProof } from '@/lib/outcomes/socialProof';
import { getProgramBySlug } from '@/lib/content/programs';
import { getTranslations } from 'next-intl/server';
import { getSiteUrl } from '@/lib/seo/siteEnvironment';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('marketing.outcomes');
  return buildPageMetadataAsync({
    title: t('title'),
    description: t('description'),
    path: '/outcomes',
  });
}

export const revalidate = 3600;

export default async function PublicOutcomesPage() {
  const t = await getTranslations('marketing.outcomes');
  const data = await getPublicPlacementOutcomes(prisma);
  const socialProof = await getOutcomesSocialProof(prisma, { baseUrl: getSiteUrl() });
  const retentionWilson =
    data.totalPlaced > 0 ? wilsonInterval(data.withRetentionNote, data.totalPlaced) : null;

  const programRows = [...data.byProgram].sort((a, b) => b.count - a.count);
  const fundingRows = [...data.byFunding].filter((r) => r.fundingSource).sort((a, b) => b.count - a.count);
  const retentionRows = [...data.byRetentionStatus].filter((r) => r.retentionStatus).sort((a, b) => b.count - a.count);

  return (
    <div className="wa-v3">
      {/* HERO / INTRO */}
      <header className="wa-ohero">
        <div className="wa-wrap">
          <div className="wa-lead">
            <span className="wa-eyebrow">{t('eyebrow')}</span>
            <h1>{t('heading')}</h1>
            <p className="wa-intro">
              {t('intro')}{' '}
              <LocalizedLink href="/programs">{t('browsePrograms')}</LocalizedLink>.
            </p>
          </div>

          {/* BIG STAT CARD */}
          <div className="wa-statcard">
            <div className="wa-num">{data.totalPlaced}</div>
            <div className="wa-lab">{t('placedLabel')}</div>
            <div className="wa-asof">{data.asOfLabel}</div>
            {retentionWilson && data.totalPlaced > 0 ? (
              <div className="wa-signal">
                {t('followUpSignal')}{' '}
                <strong>{Math.round((data.withRetentionNote / data.totalPlaced) * 100)}%</strong>{' '}
                ({data.withRetentionNote} of {data.totalPlaced}) — {t('wilsonInterval')}{' '}
                {Math.round(retentionWilson.low * 100)}–{Math.round(retentionWilson.high * 100)}% ({t('wilsonScore')}).
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* VERIFIED PLACEMENT STORIES */}
      {socialProof.enabled && socialProof.storyCards.length > 0 ? (
        <section className="wa-band" aria-labelledby="placement-stories">
          <div className="wa-wrap">
            <div className="wa-sec-head">
              <h2 id="placement-stories">Verified placement stories</h2>
              <p>PII-stripped cards pulled from live placement records. No seeded or illustrative outcomes are shown.</p>
            </div>
            <div className="wa-stories">
              {socialProof.storyCards.map((story) => {
                const program = story.programSlug
                  ? getProgramBySlug(story.programSlug)?.title ?? story.programSlug
                  : 'Program not specified';
                return (
                  <article key={story.id} className="wa-scard">
                    <span className="wa-tag">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      Verified placement
                    </span>
                    <h3>{story.jobTitle}</h3>
                    <p className="wa-meta">
                      {program} · {story.placedAt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </p>
                  </article>
                );
              })}
            </div>
            <p className="wa-method">
              {socialProof.methodologyNote} See the admin outcomes methodology before using any claim externally.
            </p>
          </div>
        </section>
      ) : null}

      {/* BY PROGRAM */}
      {programRows.length > 0 ? (
        <section className="wa-band" style={{ paddingTop: 0 }}>
          <div className="wa-wrap">
            <div className="wa-sec-head wa-sec-head--sm">
              <h2>{t('byProgram')}</h2>
            </div>
            <ul className="wa-blist">
              {programRows.map((row) => {
                const title = row.programSlug
                  ? getProgramBySlug(row.programSlug)?.title ?? row.programSlug
                  : t('unspecified');
                return (
                  <li key={row.programSlug ?? 'null'} className="wa-brow">
                    <span>{title}</span>
                    <strong>{row.count}</strong>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}

      {/* BY FUNDING */}
      {fundingRows.length > 0 ? (
        <section className="wa-band" style={{ paddingTop: 0 }}>
          <div className="wa-wrap">
            <div className="wa-sec-head wa-sec-head--sm">
              <h2>{t('byFunding')}</h2>
            </div>
            <ul className="wa-blist">
              {fundingRows.map((row) => (
                <li key={row.fundingSource ?? 'x'} className="wa-brow">
                  <span>{row.fundingSource}</span>
                  <strong>{row.count}</strong>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* BY RETENTION */}
      {retentionRows.length > 0 ? (
        <section className="wa-band" style={{ paddingTop: 0 }}>
          <div className="wa-wrap">
            <div className="wa-sec-head wa-sec-head--sm">
              <h2>{t('byRetention')}</h2>
            </div>
            <ul className="wa-blist">
              {retentionRows.map((row) => (
                <li key={row.retentionStatus ?? 'x'} className="wa-brow">
                  <span>{row.retentionStatus}</span>
                  <strong>{row.count}</strong>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ===== CLOSING CTA: convert transparency readers into applicants (approved mockup) ===== */}
      <section className="wa-band">
        <div className="wa-wrap">
          <div className="wa-cta">
            <h2>{t('ctaTitle')}</h2>
            <p>{t('ctaCopy')}</p>
            <div className="wa-acts">
              <LocalizedLink href="/apply" className="wa-btn wa-btn--light">
                {t('ctaApply')}
              </LocalizedLink>
              <LocalizedLink href="/programs" className="wa-btn wa-btn--translucent">
                {t('browsePrograms')}
              </LocalizedLink>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
