import '@/css/marketing-v3-terms.css';
import type { Metadata } from 'next';
import Image from 'next/image';
import { buildPageMetadataAsync } from '@/app/seo';
import Footer from '@/components/Footer';
import { getTranslations } from 'next-intl/server';
import { getRequestLocale } from '@/lib/i18n/server';
import { MARKETING_FULL_BLEED_HERO_SIZES } from '@/lib/marketing/heroImage';

/**
 * Last-updated date for the Terms of Service. Bump whenever the terms
 * materially change (new fee structure, dispute-resolution forum, new role,
 * etc.). The displayed "Last updated" string is derived from this constant.
 */
const TERMS_LAST_UPDATED_AT = '2026-05-19';

const HERO_IMAGE_SRC = '/images/hero-people.webp';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('marketing.terms');
  return buildPageMetadataAsync({
    title: t('title'),
    description: t('description'),
    path: '/terms',
  });
}

function formatLastUpdated(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const InfoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8h.01M11 12h1v4h1" />
  </svg>
);

export default async function TermsPage() {
  const t = await getTranslations('marketing.terms');
  const locale = await getRequestLocale();
  const lastUpdated = formatLastUpdated(TERMS_LAST_UPDATED_AT);

  return (
    <div className="wa-v3 inner-page">
      {/* ===== HERO: crimson→plum gradient + photo overlay ===== */}
      <header className="wa-terms-hero">
        <div className="wa-terms-hero-photo" aria-hidden="true">
          <Image
            src={HERO_IMAGE_SRC}
            alt=""
            fill
            priority
            fetchPriority="high"
            sizes={MARKETING_FULL_BLEED_HERO_SIZES}
            quality={85}
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
        </div>
        <div className="wa-wrap">
          <div className="wa-inner">
            <h1>{t('heading')}</h1>
            <div className="wa-sub">
              <ClockIcon />
              {t('lastUpdatedLabel')}: {lastUpdated}
            </div>
          </div>
        </div>
      </header>

      {/* ===== CONTENT ===== */}
      <section className="wa-terms-content">
        <div className="wa-wrap">
          <div className="wa-doc">
            {locale !== 'en' && (
              <div className="wa-terms-note" role="note">
                <InfoIcon />
                <span>
                  {t('englishOnlyBanner')}{' '}
                  <a href="mailto:info@workforceap.org">info@workforceap.org</a>.
                </span>
              </div>
            )}

            <div className="wa-doc-card">
              <div className="wa-doc-body">
                <p className="wa-doc-intro">
                  These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the
                  Workforce Advancement Project (&ldquo;WorkforceAP,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;)
                  website at workforceap.org, the member portal, and the related training, counseling, and
                  AI-assisted tools we provide (collectively, the &ldquo;Service&rdquo;). By creating an
                  account, submitting an application, or otherwise using the Service, you agree to be bound
                  by these Terms and by our <a href="/privacy">Privacy Policy</a>. If you do not agree, do
                  not use the Service.
                </p>

                <h2>1. The Service</h2>
                <p>
                  WorkforceAP provides workforce-development services, including: (a) eligibility screening
                  and program intake, (b) career-aligned training delivered directly or through partner
                  providers such as Coursera, (c) one-on-one career counseling and case management, (d)
                  AI-assisted member tools such as resume coaching, interview practice, voice coaching, and
                  career discovery, and (e) employer introductions and job-placement assistance. The Service
                  evolves continuously. We may add, modify, or remove features at any time.
                </p>

                <h2>2. Eligibility &amp; account registration</h2>
                <p>
                  You must be at least 16 years of age to create an account, except where a school- or
                  partner-supported program permits younger participants with verified parent or guardian
                  consent. Some funded programs (including WIOA) impose additional eligibility criteria
                  regarding citizenship, income, employment status, and residency; we will tell you what
                  applies during intake. You agree to provide accurate, current, and complete information
                  and to keep that information updated. WorkforceAP may refuse, suspend, or terminate any
                  account at its discretion, including where required information is missing, falsified, or
                  materially inaccurate.
                </p>

                <h2>3. Acceptable use</h2>
                <p>You agree that you will not:</p>
                <ul>
                  <li>Provide false, misleading, or fraudulent information, including on eligibility or WIOA-related forms</li>
                  <li>Use the Service to harass, threaten, defame, or discriminate against any person</li>
                  <li>Scrape, crawl, or otherwise programmatically extract data from the Service except through documented APIs and within posted rate limits</li>
                  <li>Reverse-engineer, decompile, or attempt to derive the source code of any part of the Service, except as expressly permitted by law</li>
                  <li>Bypass authentication, rate limiting, anti-abuse, or other technical or security controls</li>
                  <li>Upload malware, run automated scripts that disrupt the Service, or interfere with other members&rsquo; use</li>
                  <li>Submit content that infringes intellectual-property rights or violates applicable law</li>
                  <li>Use AI tools provided by the Service to generate content that violates applicable law, the relevant model provider&rsquo;s usage policies, or these Terms (e.g., resumes containing knowingly false credentials)</li>
                  <li>Sell, sublicense, rent, or commercially redistribute any part of the Service or content obtained from it</li>
                </ul>

                <h2>4. Roles &amp; role-specific terms</h2>
                <p>
                  The Service is used by three principal roles. The role-specific terms below apply in
                  addition to the rest of these Terms.
                </p>

                <h3>4.1 Members (job-seekers and trainees)</h3>
                <p>As a member you agree to:</p>
                <ul>
                  <li>Provide truthful, complete eligibility and intake information, including for funded programs</li>
                  <li>Make a good-faith effort to complete the program you enroll in, including attendance, assignments, and any check-ins or assessments required by your advisor or grant</li>
                  <li>Maintain the confidentiality of your account credentials and notify us if you suspect unauthorized access</li>
                  <li>Use the AI tools, course content, and advisor relationship for personal career development; do not impersonate another person or submit AI-generated content as another person&rsquo;s work without proper attribution where required</li>
                  <li>Return loaner equipment in accordance with the equipment-loan agreement you sign at issue; equipment remains WorkforceAP property until program-completion milestones are met</li>
                </ul>

                <h3>4.2 Employers</h3>
                <p>If you access the Service as an employer or hiring partner you agree to:</p>
                <ul>
                  <li>Use member information only to evaluate and contact candidates who have given consent to be shared with you and only for legitimate hiring purposes</li>
                  <li>Comply with all applicable employment laws, including equal employment opportunity, fair hiring, background-check, and pay-disclosure requirements in the jurisdictions where you operate</li>
                  <li>Not resell, redistribute, or aggregate member data, including resumes and contact information</li>
                  <li>Honor the terms of any employer agreement or order form you sign with WorkforceAP (including any fee, exclusivity, or reporting obligations); these Terms incorporate that agreement by reference and the order form controls in the case of a conflict</li>
                  <li>Provide accurate placement and retention data when requested to support outcome reporting</li>
                </ul>

                <h3>4.3 Partners (referring organizations, funders, counselors)</h3>
                <p>If you access the Service as a partner (community-based organization, workforce board, school district, government agency, or other referral or funding partner) you agree to:</p>
                <ul>
                  <li>Refer only members who you reasonably believe meet program eligibility and who have given consent to be referred</li>
                  <li>Maintain the confidentiality of any aggregated or participant-level reporting you receive</li>
                  <li>Comply with the data-use restrictions in your partner agreement and any grant agreement that funds the cohort</li>
                  <li>Use the partner portal only to perform your role; do not share counselor or admin credentials</li>
                </ul>

                <h2>5. Funded participation &amp; recovery of program costs</h2>
                <p>
                  Many member experiences are delivered at no cost to the participant through grants,
                  government workforce funding, or employer partnerships. If we determine that a participant
                  provided materially false information to obtain funded access, or that a participant fails
                  to meet completion requirements set by the grant or partner agreement, WorkforceAP
                  reserves the right to (a) terminate the participant&rsquo;s enrollment, (b) report the
                  determination to the relevant funder as the grant requires, and (c) seek recovery of
                  direct program costs to the extent permitted by applicable law and the grant agreement.
                </p>

                <h2>6. Data &amp; privacy</h2>
                <p>
                  Your use of the Service is also governed by our{' '}
                  <a href="/privacy">Privacy Policy</a>, which describes what data we collect, how we use
                  it, and which sub-processors we share it with. The Privacy Policy is incorporated into
                  these Terms by reference. By using the Service you consent to the collection, use, and
                  sharing of your information as described there. Your rights to access, correct, delete,
                  and port your data are described in Section 8 of the Privacy Policy and in your account&rsquo;s{' '}
                  <a href="/account/privacy">Privacy &amp; Data</a> page.
                </p>

                <h2>7. AI-assisted tools</h2>
                <p>
                  The Service includes AI-powered tools (career counselor, resume coach, interview practice,
                  cover-letter drafting, skill mapping, voice coaching, and others). AI outputs are generated
                  by third-party AI providers identified in our Privacy Policy and are provided for your
                  guidance only. AI outputs may contain inaccuracies, omissions, or content that is not
                  appropriate for your specific situation. You are responsible for reviewing AI outputs
                  before relying on them — particularly when sending content to employers, on applications,
                  or in any setting where accuracy matters. WorkforceAP does not warrant the accuracy of any
                  AI output and is not liable for decisions you make based on it.
                </p>

                <h2>8. Intellectual property</h2>
                <p>
                  All content on the Service — including the software, course materials, assessments,
                  counselor materials, AI prompts, and brand assets — is owned by WorkforceAP or its
                  licensors and is protected by copyright, trademark, and other laws. We grant you a
                  limited, revocable, non-exclusive, non-transferable license to access and use the Service
                  for your personal educational and career-development use. You may not reproduce,
                  distribute, publicly display, or create derivative works from this content for any
                  commercial purpose without our prior written permission. Content you provide (resume
                  text, prompts you submit to AI tools, messages to your counselor, etc.) remains yours; you
                  grant WorkforceAP a license to host, process, transmit, and display that content as needed
                  to operate the Service and as described in the Privacy Policy.
                </p>

                <h2>9. No employment guarantee; service availability</h2>
                <p>
                  WorkforceAP provides training, career support, and job-placement assistance. We do not
                  guarantee any specific employment, wage, credential, certification, or other outcome.
                  Placement assistance is a best-effort service. We do not control the hiring decisions of
                  employer partners and are not responsible for them. The Service is provided on an
                  &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without warranties of any kind,
                  express or implied, including warranties of merchantability, fitness for a particular
                  purpose, non-infringement, or uninterrupted availability, except where such warranties
                  cannot be disclaimed under applicable law.
                </p>

                <h2>10. Limitation of liability</h2>
                <p>
                  To the maximum extent permitted by law, WorkforceAP and its officers, directors, employees,
                  counselors, partners, and licensors will not be liable for any indirect, incidental,
                  consequential, special, exemplary, or punitive damages, or for lost profits, lost
                  earnings, lost employment opportunity, lost data, or business interruption, arising out
                  of or related to your use of the Service. Our total aggregate liability for any claim
                  relating to the Service will not exceed the greater of (a) one hundred U.S. dollars
                  ($100), or (b) the fees you paid to WorkforceAP in the twelve months before the event
                  giving rise to the claim. This limitation applies whether the claim is in contract, tort
                  (including negligence), or any other legal theory, even if we have been advised of the
                  possibility of such damages. Some jurisdictions do not allow these limitations; in those
                  jurisdictions the limitations apply only to the extent permitted by law.
                </p>

                <h2>11. Termination</h2>
                <p>
                  You may stop using the Service and delete your account at any time from your{' '}
                  <a href="/account/privacy">Privacy &amp; Data</a> page. WorkforceAP may suspend or
                  terminate your access immediately, with or without notice, if (a) you violate these Terms
                  or the Acceptable Use policy in Section 3, (b) we are required to do so by law, grant
                  agreement, or order of a competent authority, (c) your continued access creates a security
                  or safety risk, or (d) the funder of your cohort revokes the funding under which you are
                  participating. Termination does not affect rights or obligations that by their nature
                  should survive (intellectual property, confidentiality, limitation of liability,
                  indemnification, governing law, and dispute resolution).
                </p>

                <h2>12. Governing law &amp; dispute resolution</h2>
                <p>
                  These Terms are governed by the laws of the State of Texas, without regard to its
                  conflict-of-laws rules. Any dispute arising out of or related to these Terms or the
                  Service that is not resolved informally will be brought exclusively in the state or
                  federal courts located in Travis County, Texas, and you and WorkforceAP consent to the
                  personal jurisdiction of those courts. You agree to first contact us at{' '}
                  <a href="mailto:legal@workforceap.org">legal@workforceap.org</a> and to attempt in good
                  faith to resolve any dispute informally for at least thirty (30) days before filing a
                  formal proceeding. Nothing in this section limits either party&rsquo;s right to seek
                  injunctive or equitable relief from a court of competent jurisdiction.
                </p>

                <h2>13. Changes to these Terms</h2>
                <p>
                  We may update these Terms from time to time. For material changes we will provide notice
                  by email or in-product notification at least fourteen (14) days before the change takes
                  effect. Continued use of the Service after the effective date constitutes acceptance of
                  the updated Terms. If you do not agree to the updated Terms, your remedy is to stop using
                  the Service and delete your account.
                </p>

                <h2>14. Contact</h2>
                <p>
                  For questions about these Terms, contact us at{' '}
                  <a href="mailto:info@workforceap.org">info@workforceap.org</a> or use our{' '}
                  <a href="/contact">contact form</a>. Legal notices should be addressed to{' '}
                  <a href="mailto:legal@workforceap.org">legal@workforceap.org</a>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
