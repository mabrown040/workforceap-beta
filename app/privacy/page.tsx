import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';
import Footer from '@/components/Footer';
import PageHero from '@/components/PageHero';
import { getTranslations } from 'next-intl/server';
import { getRequestLocale } from '@/lib/i18n/server';

/**
 * Last-updated date for the privacy policy. Bump whenever the policy content
 * — especially the sub-processor list — materially changes. The displayed
 * "Last updated" string is derived from this constant.
 */
const PRIVACY_LAST_UPDATED_AT = '2026-05-19';

type SubProcessor = {
  vendor: string;
  data: string;
  purpose: string;
  link: string;
  linkLabel: string;
};

/**
 * Sub-processors that receive member data on our behalf. Each row is the
 * source of truth for both the privacy page and any future DPA disclosures.
 *
 * Vendor URLs verified 2026-05-19. If a link 404s, leave a `TODO(privacy):`
 * comment inline and do not silently swap to a different page.
 */
const SUB_PROCESSORS: SubProcessor[] = [
  {
    vendor: 'Supabase',
    data: 'Authentication, profile fields, training and outcome records',
    purpose: 'Primary database + auth host',
    link: 'https://supabase.com/legal/dpa',
    linkLabel: 'Supabase DPA',
  },
  {
    vendor: 'Vercel',
    data: 'Page renders, edge function execution, performance + Web Analytics',
    purpose: 'Application hosting, edge compute, performance telemetry',
    link: 'https://vercel.com/legal/dpa',
    linkLabel: 'Vercel DPA',
  },
  {
    vendor: 'Sentry',
    data: 'Error events (PII scrubbed by our scrubber before transmission), session replay with sensitive inputs masked',
    purpose: 'Production error monitoring + replay for incident triage',
    link: 'https://sentry.io/legal/dpa/',
    linkLabel: 'Sentry DPA',
  },
  {
    vendor: 'Resend',
    data: 'Member email address + transactional / nudge email content',
    purpose: 'Transactional and program email delivery',
    link: 'https://resend.com/legal/dpa',
    linkLabel: 'Resend DPA',
  },
  {
    vendor: 'Anthropic (Claude)',
    data: 'AI tool inputs — resume text, job descriptions, member-supplied prompts and uploaded text',
    purpose: 'AI-powered career counselor, resume coach, cover-letter draft, skill mapping',
    link: 'https://www.anthropic.com/legal/commercial-terms',
    linkLabel: 'Anthropic Commercial Terms',
  },
  {
    vendor: 'Groq',
    data: 'Voice-coach transcripts + AI tool prompt content routed for low-latency inference',
    purpose: 'Voice transcription and AI inference (latency-sensitive paths)',
    link: 'https://groq.com/privacy-policy/',
    linkLabel: 'Groq Privacy Policy',
  },
  {
    vendor: 'Google (Gemini)',
    data: 'AI tool inputs routed as a secondary AI provider',
    purpose: 'AI inference fallback when primary providers are unavailable',
    link: 'https://policies.google.com/privacy',
    linkLabel: 'Google Privacy Policy',
  },
  {
    vendor: 'ElevenLabs',
    data: 'Text passed for voice synthesis and, where you opt in, member voice samples',
    purpose: 'Voice synthesis for interview-practice and counselor playback',
    link: 'https://elevenlabs.io/privacy',
    linkLabel: 'ElevenLabs Privacy Policy',
  },
  {
    vendor: 'Coursera',
    data: 'Member email (for Coursera for Business enrollment + xAPI completion mapping)',
    purpose: 'Course catalog, enrollment, and completion reporting',
    link: 'https://www.coursera.org/about/privacy',
    linkLabel: 'Coursera Privacy Policy',
  },
  {
    vendor: 'Upstash',
    data: 'Rate-limit counters keyed on IP address and email hash (no raw email stored)',
    purpose: 'Abuse prevention and request rate limiting',
    link: 'https://upstash.com/trust',
    linkLabel: 'Upstash Trust Center',
  },
  {
    vendor: 'Formspree',
    data: 'Contact form submissions (name, email, topic, message) — used only when the static contact form route is enabled',
    purpose: 'Static-form intake fallback for the public contact form',
    link: 'https://formspree.io/privacy',
    linkLabel: 'Formspree Privacy Policy',
  },
  {
    vendor: 'Cloudflare Turnstile',
    data: 'CAPTCHA challenge result token and the IP that produced it',
    purpose: 'Bot mitigation on public forms (apply, contact, WIOA screening)',
    link: 'https://www.cloudflare.com/privacy/',
    linkLabel: 'Cloudflare Privacy Policy',
  },
  {
    vendor: 'OpenAI',
    data: 'Reserved — not currently in active production use; listed for transparency in case a future feature routes inputs here',
    purpose: 'Optional AI inference provider (inactive)',
    link: 'https://openai.com/policies/privacy-policy',
    linkLabel: 'OpenAI Privacy Policy',
  },
];

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  margin: '1rem 0 1.5rem',
  fontSize: '0.92rem',
};

const cellStyle = {
  padding: '0.65rem 0.75rem',
  borderBottom: '1px solid var(--outline-variant, #e5e7eb)',
  verticalAlign: 'top' as const,
  textAlign: 'left' as const,
};

const headerCellStyle = {
  ...cellStyle,
  fontWeight: 700,
  background: 'var(--surface-container, #f5f5f5)',
  borderBottom: '2px solid var(--outline-variant, #e5e7eb)',
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('marketing.privacy');
  return buildPageMetadataAsync({
    title: t('title'),
    description: t('description'),
    path: '/privacy',
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

export default async function PrivacyPage() {
  const t = await getTranslations('marketing.privacy');
  const locale = await getRequestLocale();
  const lastUpdated = formatLastUpdated(PRIVACY_LAST_UPDATED_AT);

  return (
    <div className="inner-page">
      <PageHero
        title={t('heading')}
        subtitle={`${t('lastUpdatedLabel')}: ${lastUpdated}`}
      />
      <section className="content-section">
        <div className="container" style={{ maxWidth: '860px' }}>
          {locale !== 'en' && (
            <div
              role="note"
              style={{
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                background: 'var(--surface-container, #f5f5f5)',
                border: '1px solid var(--outline-variant, #e5e7eb)',
                borderRadius: 'var(--radius-md, 8px)',
                fontSize: '0.9rem',
                lineHeight: 1.5,
              }}
            >
              {t('englishOnlyBanner')}{' '}
              <a href="mailto:privacy@workforceap.org">privacy@workforceap.org</a>.
            </div>
          )}

          <div className="markdown-body" style={{ lineHeight: 1.7 }}>
            <p>
              This Privacy Policy explains how the Workforce Advancement Project (&ldquo;WorkforceAP,&rdquo;
              &ldquo;we,&rdquo; or &ldquo;us&rdquo;) collects, uses, shares, and protects your information when you use our
              platform at workforceap.org and related services. By using our services, you agree to the practices
              described here.
            </p>

            <h2>1. Information We Collect</h2>
            <p>We collect the following categories of information:</p>
            <h3>1.1 Account &amp; contact information</h3>
            <ul>
              <li>Name, email address, phone number, mailing address, and password</li>
              <li>Account preferences and communication settings</li>
            </ul>
            <h3>1.2 Eligibility &amp; demographic information</h3>
            <p>
              To match you with appropriate programs and to satisfy federal, state, and local grant
              reporting requirements (including the Workforce Innovation and Opportunity Act, or WIOA),
              we may collect:
            </p>
            <ul>
              <li>Date of birth and age</li>
              <li>Race, ethnicity, and gender identity</li>
              <li>Veteran status and service history</li>
              <li>Disability status and accommodation needs</li>
              <li>Citizenship and work-authorization status</li>
              <li>Household income, employment status, and education level</li>
              <li>Public-benefit participation (SNAP, TANF, etc.) when relevant to eligibility</li>
              <li>Employment-barrier information (housing, childcare, justice-system involvement, etc.)</li>
              <li>Parent/guardian contact information (for minor participants)</li>
            </ul>
            <p>
              Several of these fields are classified as &ldquo;Sensitive Personal Information&rdquo; under the
              California Consumer Privacy Act (CCPA/CPRA), Texas Data Privacy and Security Act (Texas
              SB 1827), and similar laws. See Section 8 (Your Rights) for how to restrict their use.
            </p>
            <h3>1.3 Career &amp; assessment data</h3>
            <ul>
              <li>Resume content, job history, skills inventories, and certifications</li>
              <li>Career-interest assessment responses, quiz answers, and pathway selections</li>
              <li>Course enrollments, course progress, and assessment scores</li>
              <li>Voice-coach session transcripts, interview-practice responses, and AI-generated artifacts</li>
              <li>Counselor notes and case-management records</li>
              <li>Job-application activity and placement outcomes (employer, role, salary, retention)</li>
            </ul>
            <h3>1.4 Technical &amp; usage data</h3>
            <ul>
              <li>Device, browser, and IP-derived approximate location</li>
              <li>Pages viewed, features used, and time spent</li>
              <li>Cookies, local storage, and similar identifiers (see Section 6)</li>
              <li>Error reports and performance telemetry</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Determine program eligibility and personalize program recommendations</li>
              <li>Deliver coursework, certifications, coaching, and career-services through our platform and partners</li>
              <li>Match you with employers, partner organizations, and job opportunities</li>
              <li>Provide AI-assisted tools (resume coaching, interview practice, career counseling, skill mapping)</li>
              <li>Send service notices, reminders, and (with your consent) program updates</li>
              <li>Comply with grant reporting, audit, and program-evaluation requirements</li>
              <li>Improve the platform&rsquo;s safety, performance, and security</li>
              <li>Train and refine our internal machine-learning models using de-identified or aggregated data (see Section 4)</li>
            </ul>

            <h2>3. Service providers and sub-processors</h2>
            <p>
              We do not sell your personal information for cross-context behavioral advertising. We share
              information only with the categories of recipients listed below, each bound by contractual
              confidentiality and security obligations. The following vendors process member data on our
              behalf today. We update this list when sub-processors change; material changes are
              communicated under Section 12.
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle} aria-label="Sub-processors that process WorkforceAP member data">
                <caption className="sr-only">
                  Sub-processors that process WorkforceAP member data, including what is shared, the purpose, and links to each vendor&apos;s DPA or privacy policy.
                </caption>
                <thead>
                  <tr>
                    <th scope="col" style={headerCellStyle}>Vendor</th>
                    <th scope="col" style={headerCellStyle}>What we send</th>
                    <th scope="col" style={headerCellStyle}>Why</th>
                    <th scope="col" style={headerCellStyle}>DPA / privacy link</th>
                  </tr>
                </thead>
                <tbody>
                  {SUB_PROCESSORS.map((sp) => (
                    <tr key={sp.vendor}>
                      <th scope="row" style={{ ...cellStyle, fontWeight: 700 }}>{sp.vendor}</th>
                      <td style={cellStyle}>{sp.data}</td>
                      <td style={cellStyle}>{sp.purpose}</td>
                      <td style={cellStyle}>
                        <a href={sp.link} target="_blank" rel="noreferrer noopener">
                          {sp.linkLabel}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p>
              Each provider receives only the data necessary to perform its function. Where a provider
              offers it, we use the no-training, business-data variant of their service (for example,
              Anthropic&rsquo;s commercial API does not train on customer prompts by default).
            </p>

            <h3>3.1 Program partners</h3>
            <p>
              Certification providers (IBM, Google, Amazon, Microsoft, CompTIA, and others) and our
              workforce funding partners receive the information needed to enroll you in their courses
              and report completion back to us, and to meet grant reporting obligations.
            </p>
            <h3>3.2 Employers &amp; placement partners</h3>
            <p>
              With your explicit consent, we may share your resume, profile, and contact information with
              prospective employers as part of job-placement assistance. You can withdraw consent for
              specific employers at any time in your account settings.
            </p>
            <h3>3.3 Counselors &amp; community partners</h3>
            <p>
              Your assigned career counselor and the partner organization that referred you (if any) may
              view your enrollment status, progress, and outcomes to provide coaching and to satisfy
              grant-reporting requirements. Counselors are bound by the same confidentiality obligations
              we are.
            </p>
            <h3>3.4 Grant funders &amp; auditors</h3>
            <p>
              When required by federal, state, or local grant agreements (including WIOA, TAA, and
              equivalent programs), we share participant-level information with the granting agency or
              its designated evaluators. Where the grant permits, we share aggregated, de-identified data
              only.
            </p>
            <h3>3.5 Legal requirements</h3>
            <p>
              We may disclose information when required by law, subpoena, court order, or to protect the
              rights, property, or safety of WorkforceAP, our members, or others.
            </p>

            <h2>4. AI processing &amp; model training</h2>
            <p>
              We use artificial-intelligence tools to provide core platform features: the career counselor,
              voice-based coaching, resume rewriting, interview practice, skill mapping, job-match scoring,
              cover-letter drafting, and similar member tools. When you use these tools, the relevant inputs
              you provide — including resume text, job descriptions you paste, voice-session transcripts,
              and your responses to AI prompts — are transmitted to the third-party AI providers named in
              Section 3 (Anthropic, Groq, Google Gemini, ElevenLabs) to generate the response you see.
            </p>
            <p>
              We retain conversation logs, transcripts, and AI outputs as part of your member record so you
              can revisit prior sessions and so we can improve the service. We may also use this data, in
              de-identified or aggregated form, to:
            </p>
            <ul>
              <li>Evaluate the performance of our AI tools and refine prompts, retrieval strategies, and routing logic</li>
              <li>Train, fine-tune, or evaluate machine-learning models that we operate ourselves or commission for use within our platform</li>
              <li>Generate analytics, benchmarks, and reports about workforce outcomes</li>
            </ul>
            <p>
              <strong>What this means in practice:</strong> de-identification removes direct identifiers
              (name, email, phone, full address, account ID) before data is used for model training or
              cross-member analytics. We do not sell training data to third parties. You can opt out of
              having your data used for AI-model training (other than the real-time AI tools you actively
              use) through your account&rsquo;s Privacy &amp; Data page or by emailing
              {' '}<a href="mailto:privacy@workforceap.org">privacy@workforceap.org</a>.
            </p>

            <h2>5. Data security</h2>
            <p>
              We use industry-standard safeguards including TLS-encrypted transit, encryption at rest for
              member databases and stored files, role-based access controls, multi-factor authentication
              for staff, and regular security audits. Despite our efforts, no method of transmission or
              storage is perfectly secure; we cannot guarantee absolute security.
            </p>

            <h2>6. Cookies, local storage &amp; analytics</h2>
            <p>
              We use cookies, local storage, and similar technologies to keep you signed in, remember
              your preferences (theme, locale), persist in-progress applications, and understand how the
              platform is used. We use Vercel Analytics and Sentry session replay (sensitive inputs
              masked) for product analytics and error tracking, and we may add Google Tag Manager +
              Google Analytics for first-party measurement.
            </p>
            <p>
              We honor the &ldquo;Global Privacy Control&rdquo; (GPC) browser signal as an opt-out of
              cross-context advertising and analytics where required by law. You can also manage your
              consent through the cookie banner displayed on first visit. Disabling required cookies may
              affect core functionality such as signing in.
            </p>

            <h2>7. Data retention</h2>
            <p>We retain personal information for the periods needed to operate our services and meet legal obligations:</p>
            <ul>
              <li>Active account data: for the life of your account and any program participation</li>
              <li>WIOA/grant-mandated records: as long as required by the funding agency (typically 3–6 years after program exit)</li>
              <li>Application logs, telemetry, and security logs: up to 12 months</li>
              <li>De-identified or aggregated analytics: indefinitely</li>
              <li>Records of deletion requests and consent: as required by applicable privacy law</li>
            </ul>
            <p>
              When you delete your account, we anonymize or remove your personal information except where
              we are required to retain it (for example, financial records, completed-course transcripts
              required by an issuer, or grant-reporting fields locked by the funder).
            </p>

            <h2>8. Your rights</h2>
            <p>
              Depending on where you live, you may have one or more of the following rights with respect
              to your personal information:
            </p>
            <ul>
              <li><strong>Access:</strong> request a copy of the personal information we hold about you</li>
              <li><strong>Correct:</strong> ask us to fix inaccurate or incomplete information</li>
              <li><strong>Delete:</strong> request deletion of your account and associated data</li>
              <li><strong>Port:</strong> receive a copy of your data in a structured, machine-readable format</li>
              <li><strong>Limit sensitive-info use:</strong> tell us not to use Sensitive Personal Information beyond what is necessary to deliver the service</li>
              <li><strong>Opt out of AI-model training:</strong> exclude your data from any non-real-time AI-training use (see Section 4)</li>
              <li><strong>Opt out of marketing:</strong> stop promotional emails at any time using the unsubscribe link or your account settings</li>
              <li><strong>Non-discrimination:</strong> we will not deny you services or treat you differently for exercising these rights</li>
            </ul>

            <h3>8.1 How to request a copy of your data</h3>
            <p>
              You can export every record we hold about you from your account&rsquo;s{' '}
              <a href="/account/privacy">Privacy &amp; Data</a> page. The export covers your profile,
              applications, messages, course progress, AI tool outputs, and consent history. It is
              produced as a structured JSON file you can download immediately. If you prefer to receive
              the export by another method, email{' '}
              <a href="mailto:privacy@workforceap.org">privacy@workforceap.org</a> from the email address
              on your account and we will respond within the timelines required by applicable law
              (typically 45 days under CCPA/CPRA and Texas SB 1827; 30 days under GDPR).
            </p>

            <h3>8.2 How to delete your account</h3>
            <p>
              You can permanently delete your account from your{' '}
              <a href="/account/privacy">Privacy &amp; Data</a> page using the &ldquo;Delete My
              Account&rdquo; button. Deletion anonymizes your personal information; records we are
              required by law or grant agreement to retain (financial records, WIOA-locked outcome
              fields, completed-course transcripts) remain in a redacted form. If the in-product flow
              is unavailable to you, email{' '}
              <a href="mailto:privacy@workforceap.org">privacy@workforceap.org</a> and we will process
              your request manually.
            </p>

            <h2>9. State-specific disclosures</h2>
            <h3>9.1 California residents (CCPA/CPRA)</h3>
            <p>
              California residents have the right to: (a) know what categories and specific pieces of
              personal information we have collected about them and the sources, business purposes, and
              recipient categories listed above; (b) request correction of inaccurate personal
              information; (c) request deletion of personal information, subject to exceptions; (d) opt
              out of any &ldquo;sale&rdquo; or &ldquo;sharing&rdquo; of personal information for
              cross-context behavioral advertising (we do not engage in either today); (e) limit the use
              and disclosure of Sensitive Personal Information to what is necessary to deliver the
              service; and (f) non-discrimination for exercising these rights.
            </p>
            <p>
              <strong>How to exercise your California rights:</strong> use the{' '}
              <a href="/account/privacy">Privacy &amp; Data</a> page in your account, or email{' '}
              <a href="mailto:privacy@workforceap.org">privacy@workforceap.org</a> with the subject line
              &ldquo;California privacy request.&rdquo; You may designate an authorized agent in writing
              to submit a request on your behalf. We will verify your identity by matching the request
              against the email address and recent activity on your account, and we may ask for
              additional information if the request is unusually broad or risky to grant without
              verification.
            </p>
            <h3>9.2 Texas (Texas Data Privacy and Security Act)</h3>
            <p>
              Texas residents have access, correction, deletion, portability, and opt-out rights
              comparable to those described above. To submit a request, use the channels in Section 8.
            </p>
            <h3>9.3 Other states</h3>
            <p>
              We extend the rights in Section 8 to all members where comparable state privacy laws apply
              (including Colorado, Virginia, Connecticut, Utah, Oregon, and Montana). Contact us if you
              need help submitting a request specific to your state.
            </p>
            <h3>9.4 European Economic Area &amp; United Kingdom</h3>
            <p>
              The platform is primarily intended for users in the United States. If you access the
              platform from the EEA or UK, our legal basis for processing is your consent (Article 6(1)(a)
              GDPR) for AI-tool use and marketing, and contract or legitimate interest for service
              delivery. Special-category data (Article 9) — including racial/ethnic origin and health
              status — is processed only with your explicit consent. You may withdraw consent at any time
              by contacting <a href="mailto:privacy@workforceap.org">privacy@workforceap.org</a>.
            </p>

            <h2>10. Children&rsquo;s privacy and minor consent</h2>
            <h3>10.1 Age requirements</h3>
            <p>
              Our platform is generally intended for users 16 years of age and older. In some school- or
              partner-supported programs, minors ages 13–17 may participate with parent or guardian
              consent and any additional program approvals. We do not knowingly collect personal
              information from children under 13 without verifiable parental consent, as required by the
              Children&rsquo;s Online Privacy Protection Act (COPPA).
            </p>
            <h3>10.2 Minors (ages 13–17)</h3>
            <p>For minors who participate in an approved program experience, we require:</p>
            <ul>
              <li><strong>Parental or guardian consent</strong> to our Terms of Service and this Privacy Policy before the minor can access our services</li>
              <li><strong>Guardian contact information</strong> for communication about the minor&rsquo;s participation</li>
              <li><strong>Educational-records consent</strong> if applicable, under FERPA</li>
            </ul>
            <h3>10.3 High school partnerships</h3>
            <p>When partnering with high schools and educational institutions, we comply with FERPA for student records, collect only necessary information with appropriate consent, provide parents/guardians access to their minor&rsquo;s information on request, allow consent revocation and data deletion at any time, maintain enhanced access controls for minor records, and share student progress with authorized school officials only when consent is provided.</p>
            <h3>10.4 Parental rights</h3>
            <p>Parents and guardians of minors have the right to review, correct, or request deletion of their child&rsquo;s information, refuse further collection, and receive notice of significant changes to our minor-data practices. To exercise these rights or to report information collected from a child under 13 without proper consent, contact us immediately at <a href="mailto:privacy@workforceap.org">privacy@workforceap.org</a>.</p>

            <h2>11. WIOA participants &amp; grant records</h2>
            <p>
              If you participate in a WIOA-funded program, federal regulations (20 CFR Part 603 and
              related rules) govern the collection, use, and protection of your information. Your
              eligibility documentation, case-management records, and outcome data may be shared with
              the workforce development board, the Texas Workforce Commission (or your state equivalent),
              the U.S. Department of Labor, and authorized evaluators. We use these records solely for
              program administration, performance reporting, and authorized research. The retention
              period set by your grantor takes precedence over the default retention in Section 7.
            </p>

            <h2>12. Changes to this policy</h2>
            <p>
              We may update this Privacy Policy from time to time. For material changes — including any
              addition or removal of a sub-processor in Section 3 — we will notify you by email or
              in-product notice at least 14 days before the change takes effect. The &ldquo;Last
              updated&rdquo; date at the top of this page reflects the current version. Continued use of
              the services after a change indicates acceptance of the updated policy.
            </p>

            <h2>13. Contact us</h2>
            <p>
              For questions about this Privacy Policy, to submit a data request, or to report a privacy
              concern, contact us:
            </p>
            <p>
              <strong>Workforce Advancement Project</strong><br />
              Privacy inquiries: <a href="mailto:privacy@workforceap.org">privacy@workforceap.org</a><br />
              General contact: <a href="mailto:info@workforceap.org">info@workforceap.org</a><br />
              Phone: <a href="tel:+15127771808">(512) 777-1808</a><br />
              <a href="/contact">Contact form</a>
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
