import '@/css/marketing-v3-what-we-do.css';
import Image from 'next/image';
import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';
import LocalizedLink from '@/components/LocalizedLink';
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import { getTranslations } from 'next-intl/server';
import { MARKETING_FULL_BLEED_HERO_SIZES } from '@/lib/marketing/heroImage';
import { prisma } from '@/lib/db/prisma';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('marketing.whatWeDo');
  return buildPageMetadataAsync({
    title: t('title'),
    description: t('description'),
    path: '/what-we-do',
  });
}


export default async function WhatWeDoPage() {
  const t = await getTranslations('marketing.whatWeDo');

  let pipelineEmployers: { id: string; companyName: string; logoUrl: string | null; industry: string | null }[] = [];
  try {
    pipelineEmployers = await prisma.employer.findMany({
      where: { hiringPipelineActive: true, status: 'active' },
      select: { id: true, companyName: true, logoUrl: true, industry: true },
      take: 12,
      orderBy: { updatedAt: 'desc' },
    });
  } catch {
    // Column may not exist yet if migration hasn't been applied — section renders empty until then
  }
  void pipelineEmployers;


  return (
    <div className="wa-v3 inner-page">
      {/* ── Photo hero ── */}
      <section className="wwd-hero">
        <div className="wwd-hero__photo" aria-hidden="true">
          <Image
            src="/images/austin-skyline.webp"
            alt=""
            fill
            priority
            fetchPriority="high"
            sizes={MARKETING_FULL_BLEED_HERO_SIZES}
          />
        </div>

        <div className="wa-wrap">
          <span className="wwd-hero__eyebrow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M3 6l9-3 9 3-9 3-9-3z" />
              <path d="M3 6v6M21 6v6M7 8v6c0 1.5 5 1.5 5 1.5s5 0 5-1.5V8" />
            </svg>
            {t('heroEyebrow')}
          </span>

          <h1>
            {t('heroHeadline')}{' '}
            <span className="wa-accent">{t('heroHeadlineAccent')}</span>
          </h1>

          <p className="wwd-hero__lede">{t('heroCopy')}</p>

          <div className="wwd-hero__actions">
            <LocalizedLink href="/programs" className="wa-btn wa-btn--primary">
              {t('heroCta1')}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </LocalizedLink>
            <LocalizedLink href="/contact?topic=partnership" className="wa-btn wa-btn--onaccent">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M8 11l-3 3 3 3M3 14h7M16 13l3-3-3-3M21 10h-7" />
              </svg>
              {t('heroCta2')}
            </LocalizedLink>
          </div>
        </div>
      </section>

      {/* ── Find your path ── */}
      <section className="wwd-findpath">
        <p>{t('findPathPrompt')}</p>
        <div className="wwd-findpath__acts">
          <a href="/find-your-path" className="wa-btn wa-btn--primary">{t('findPathCta')}</a>
          <LocalizedLink href="/apply" className="wa-btn wa-btn--ghost">Check WIOA Options</LocalizedLink>
        </div>
      </section>

      {/* ── Legacy ── */}
      <section className="wa-band wa-band--surface">
        <div className="wa-wrap">
          <div className="wwd-legacy">
            <div className="wwd-legacy__portrait">
              <div className="wwd-legacy__img">
                <Image
                  src="/images/hero-people.webp"
                  alt="Diverse team collaborating on workforce development"
                  fill
                  loading="lazy"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <div className="wwd-legacy__badge">
                <div className="wa-k">25+</div>
                <div className="wa-s">Years Experience</div>
              </div>
            </div>

            <div className="wwd-legacy__text">
              <h2>
                Investing in the Future <span className="wa-accent">Workforce</span>
              </h2>

              <blockquote>
                Built on 25+ years of workforce development leadership across Goodwill, Austin Area Urban League,
                and state and local initiatives. We know what works. Employers help shape talent pipelines.
                Grants and partnerships fund access. We don&rsquo;t charge members.
              </blockquote>

              <p className="wwd-legacy__body">
                Some programs may align with <strong>WIOA (Workforce Innovation and Opportunity Act)</strong> eligibility guidelines
                criteria, including low-income individuals, dislocated workers, adult learners, and veterans seeking
                career advancement.
              </p>

              <div className="wwd-legacy__chip">
                <div className="wa-k">Nonprofit &amp; 501(c)(3)</div>
                <div className="wa-s">
                  WorkforceAP is a national nonprofit and 501(c)(3) organization serving communities nationwide.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Making an impact — bento ── */}
      <section className="wa-band">
        <div className="wa-wrap">
          <div className="wa-sec-head" style={{ margin: '0 auto 48px', textAlign: 'center' }}>
            <span className="wa-eyebrow">{t('valuesEyebrow')}</span>
            <h2>{t('valuesTitle')}</h2>
          </div>

          <div className="wwd-bento">
            <div className="wwd-bcard wwd-bcard--feature">
              <svg className="wwd-ic" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M22 10L12 5 2 10l10 5 10-5z" />
                <path d="M6 12v5c0 1 3 2.5 6 2.5s6-1.5 6-2.5v-5" />
              </svg>
              <h3>{t('bento1Title')}</h3>
              <p>{t('bento1Desc')}</p>
            </div>
            <div className="wwd-bcard wwd-bcard--wide">
              <svg className="wwd-ic" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0" />
              </svg>
              <h3>{t('bento2Title')}</h3>
              <p>{t('bento2Desc')}</p>
            </div>
            <div className="wwd-bcard wwd-bcard--half">
              <svg className="wwd-ic" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 2l2.5 5 5.5.8-4 3.9.9 5.5L12 20l-4.9 2.6.9-5.5-4-3.9 5.5-.8L12 2z" />
              </svg>
              <h3>{t('bento3Title')}</h3>
              <p>{t('bento3Desc')}</p>
            </div>
            <div className="wwd-bcard wwd-bcard--half">
              <svg className="wwd-ic" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="2" />
                <circle cx="5" cy="6" r="2" />
                <circle cx="19" cy="6" r="2" />
                <circle cx="5" cy="18" r="2" />
                <circle cx="19" cy="18" r="2" />
                <path d="M10.5 10.5L6.5 7M13.5 10.5L17.5 7M10.5 13.5L6.5 17M13.5 13.5L17.5 17" />
              </svg>
              <h3>{t('bento4Title')}</h3>
              <p>{t('bento4Desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="wa-band wa-band--trust">
        <div className="wa-wrap">
          <div className="wwd-vgrid">
            {[
              { num: '01', titleKey: 'value1Title', descKey: 'value1Desc' },
              { num: '02', titleKey: 'value2Title', descKey: 'value2Desc' },
              { num: '03', titleKey: 'value3Title', descKey: 'value3Desc' },
            ].map((v) => (
              <div key={v.num} className="wwd-vcard">
                <span className="wwd-ghost" aria-hidden="true">{v.num}</span>
                <div className="wwd-num">{v.num}</div>
                <h3>{t(v.titleKey as Parameters<typeof t>[0])}</h3>
                <p>{t(v.descKey as Parameters<typeof t>[0])}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="wa-band">
        <div className="wa-wrap">
          <div className="wa-cta">
            <h2>{t('ctaTitle')}</h2>
            <p>{t('ctaBody')}</p>
            <div className="wa-acts">
              <LocalizedLink href="/apply" className="wa-btn wa-btn--light">
                {t('ctaApply')}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </LocalizedLink>
              <LocalizedLink href="/programs" className="wa-btn wa-btn--onaccent">
                {t('ctaPrograms')}
              </LocalizedLink>
            </div>
          </div>
        </div>
      </section>

      <MobileBottomNav />
      <Footer />
      {/* Spacer for mobile bottom nav — ensures footer content is not hidden */}
      <div className="mobile-bottom-nav-spacer" aria-hidden="true" />
    </div>
  );
}
