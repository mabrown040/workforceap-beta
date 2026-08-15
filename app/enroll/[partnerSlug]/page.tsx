import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import Footer from '@/components/Footer';
import { buildPageMetadataAsync } from '@/app/seo';
import { normalizeDecodedPartnerRef } from '@/lib/apply/applyReferralCapture';
import { getEnrollmentPageData, type EnrollmentPageData } from '@/lib/partners/enrollmentPage';
import PartnerEnrollmentView from './PartnerEnrollmentView';
import './partner-enroll.css';

/**
 * Dynamic partner enrollment page (Phase B3).
 *
 * `/enroll/<partner-slug>` — the URL segment IS `Partner.slug` (see
 * `lib/partners/chsPartner.ts`), which is also what middleware turns into the
 * durable attribution cookie. This route replaced the hand-built Concordia
 * Astro page at the same URL; adding the next school is data entry (a Partner
 * row with `enrollmentPageEnabled = true` plus `PartnerProgramCatalog` rows),
 * not another page.
 *
 * `force-dynamic`: this page makes cost claims sourced from live sponsorship
 * state (window + seat cap). A cached copy could keep promising sponsored
 * enrollment after the term closed or the funded seats ran out.
 */
export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ partnerSlug: string }> };

/**
 * `generateMetadata` and the page body both need the partner. `cache()` dedupes
 * them into one query per request without weakening `force-dynamic`.
 */
const loadEnrollmentPage = cache(
  async (slug: string): Promise<EnrollmentPageData> => getEnrollmentPageData(slug)
);

/**
 * Rejects segments that can't be a partner slug before they reach the database.
 *
 * `normalizeDecodedPartnerRef`, NOT `normalizePartnerRef`: Next has already
 * percent-decoded the route param, and decoding a second time would resolve
 * `/enroll/%2563oncordia` to the real page while middleware — which decodes the
 * raw pathname exactly once — correctly rejects it and plants no attribution
 * cookie. Decode at one layer only.
 */
async function load(params: PageProps['params']): Promise<EnrollmentPageData> {
  const { partnerSlug } = await params;
  const slug = normalizeDecodedPartnerRef(partnerSlug);
  if (!slug) return { kind: 'not-found' };
  return loadEnrollmentPage(slug);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { partnerSlug } = await params;
  const data = await load(params);
  // Canonical is built from the normalized slug, never the raw URL segment.
  const path = `/enroll/${normalizeDecodedPartnerRef(partnerSlug) ?? ''}`;
  // Never indexed: these are unlisted links handed out by a school, and the
  // sponsored-cost copy is only true for that school's students.
  const robots = { index: false, follow: false };

  if (data.kind === 'not-found') {
    return buildPageMetadataAsync({
      title: 'Partner enrollment | WorkforceAP',
      description: 'Partner enrollment page.',
      path,
      robots,
    });
  }

  if (data.kind === 'paused') {
    return buildPageMetadataAsync({
      title: `${data.partner.name} enrollment | WorkforceAP`,
      description: `Enrollment through ${data.partner.name} is temporarily paused. See your school counselor for next steps.`,
      path,
      robots,
    });
  }

  // Cost framing in the description comes from the same shared helper as the
  // page body — never a second, hand-written sentence.
  const costFraming = data.sponsorship
    ? ` ${data.sponsorship.message}`
    : '';
  return buildPageMetadataAsync({
    title: `${data.partner.name} Partnership — Career Certifications for Students | WorkforceAP`,
    description:
      `${data.partner.name} students: choose an industry-recognized certificate track and apply in about 10 minutes.` +
      `${costFraming}`,
    path,
    robots,
  });
}

export default async function PartnerEnrollmentPage({ params }: PageProps) {
  const data = await load(params);

  if (data.kind === 'not-found') notFound();

  // A paused partner is NOT a 404: students are holding printed links and a
  // dead page reads as "this was a scam". Explain, and point somewhere useful.
  if (data.kind === 'paused') {
    return (
      <>
        <div className="mdx pen">
          <div className="pen-explainer">
            <span className="mdx-eyebrow">Enrollment paused</span>
            <h1>
              Enrollment through {data.partner.name} is temporarily paused — please see your school
              counselor.
            </h1>
            <p>
              Your link still works. Your counselor can tell you when enrollment reopens, and you
              can browse every WorkforceAP training program in the meantime.
            </p>
            <div className="pen-acts" style={{ justifyContent: 'center' }}>
              <a className="mdx-btn mdx-btn--primary" href="/programs">
                Browse all programs
              </a>
              <a className="mdx-btn mdx-btn--ghost" href="/contact">
                Contact WorkforceAP
              </a>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <PartnerEnrollmentView
        partner={data.partner}
        cards={data.cards}
        sponsorship={data.sponsorship}
      />
      <Footer />
    </>
  );
}
