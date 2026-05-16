import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';
import Footer from '@/components/Footer';
import PageHero from '@/components/PageHero';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Privacy Policy',
  description: 'Privacy Policy for the Workforce Advancement Project — how we collect, use, share, and protect your information.',
  path: '/privacy',
});
}

export default function PrivacyPage() {
  return (
    <div className="inner-page">
      <PageHero
        title="Privacy Policy"
        subtitle="Last updated: May 16, 2026"
      />
      <section className="content-section">
        <div className="container" style={{ maxWidth: '800px' }}>
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

            <h2>3. Information Sharing &amp; Sub-Processors</h2>
            <p>
              We do not sell your personal information for cross-context behavioral advertising. We share
              information only with the categories of recipients listed below, each bound by contractual
              confidentiality and security obligations.
            </p>
            <h3>3.1 Service providers (sub-processors)</h3>
            <p>The following vendors process member data on our behalf:</p>
            <ul>
              <li><strong>Infrastructure &amp; hosting:</strong> Vercel (application hosting), Supabase (authentication and database), Upstash (rate limiting)</li>
              <li><strong>Email:</strong> Resend (transactional and program email delivery)</li>
              <li><strong>Payments:</strong> Stripe (employer and partner billing; we do not store card numbers ourselves)</li>
              <li><strong>Observability:</strong> Sentry (error tracking and performance), Vercel Analytics, Google Tag Manager + Google Analytics</li>
              <li><strong>AI providers:</strong> Anthropic (Claude), Google (Gemini), Groq, and ElevenLabs power our AI tools including the career counselor, resume coach, interview-practice voice agent, and skill-mapping engines</li>
              <li><strong>Career data:</strong> O*NET (occupation data), Coursera (course catalog and progress)</li>
              <li><strong>Verification:</strong> Cloudflare Turnstile (anti-abuse on public forms)</li>
            </ul>
            <p>
              Each provider receives only the data necessary to perform their function. Where a provider
              offers it, we use the no-training, business-data variant of their service (for example,
              Anthropic&rsquo;s commercial API does not train on customer prompts by default).
            </p>
            <h3>3.2 Program partners</h3>
            <p>
              Coursera, IBM, Google, Amazon, Microsoft, CompTIA, and other certification providers
              receive the information needed to enroll you in their courses and report completion back to us.
            </p>
            <h3>3.3 Employers &amp; placement partners</h3>
            <p>
              With your explicit consent, we may share your resume, profile, and contact information with
              prospective employers as part of job-placement assistance. You can withdraw consent for
              specific employers at any time in your account settings.
            </p>
            <h3>3.4 Counselors &amp; community partners</h3>
            <p>
              Your assigned career counselor and the partner organization that referred you (if any) may
              view your enrollment status, progress, and outcomes to provide coaching and to satisfy
              grant-reporting requirements. Counselors are bound by the same confidentiality obligations
              we are.
            </p>
            <h3>3.5 Grant funders &amp; auditors</h3>
            <p>
              When required by federal, state, or local grant agreements (including WIOA, TAA, and
              equivalent programs), we share participant-level information with the granting agency or
              its designated evaluators. Where the grant permits, we share aggregated, de-identified data
              only.
            </p>
            <h3>3.6 Legal requirements</h3>
            <p>
              We may disclose information when required by law, subpoena, court order, or to protect the
              rights, property, or safety of WorkforceAP, our members, or others.
            </p>

            <h2>4. AI Processing &amp; Model Training</h2>
            <p>
              We use artificial-intelligence tools to provide core platform features: the career counselor,
              voice-based coaching, resume rewriting, interview practice, skill mapping, job-match scoring,
              cover-letter drafting, and similar member tools. When you use these tools, the relevant inputs
              you provide — including resume text, job descriptions you paste, voice-session transcripts,
              and your responses to AI prompts — are transmitted to the third-party AI providers named in
              Section 3.1 to generate the response you see.
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

            <h2>5. Data Security</h2>
            <p>
              We use industry-standard safeguards including TLS-encrypted transit, encryption at rest for
              member databases and stored files, role-based access controls, multi-factor authentication
              for staff, and regular security audits. Despite our efforts, no method of transmission or
              storage is perfectly secure; we cannot guarantee absolute security.
            </p>

            <h2>6. Cookies, Local Storage &amp; Analytics</h2>
            <p>
              We use cookies, local storage, and similar technologies to keep you signed in, remember
              your preferences (theme, locale), persist in-progress applications, and understand how the
              platform is used. We use Google Tag Manager + Google Analytics, Vercel Analytics, and
              Sentry session replay (sensitive inputs masked) for product analytics and error tracking.
            </p>
            <p>
              We honor the &ldquo;Global Privacy Control&rdquo; (GPC) browser signal as an opt-out of
              cross-context advertising and analytics where required by law. You can also manage your
              consent through the cookie banner displayed on first visit. Disabling required cookies may
              affect core functionality such as signing in.
            </p>

            <h2>7. Data Retention</h2>
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

            <h2>8. Your Rights</h2>
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
            <p>
              You can exercise most of these rights directly from your account&rsquo;s{' '}
              <a href="/account/privacy">Privacy &amp; Data</a> page (export, deletion, consent
              preferences). You can also email{' '}
              <a href="mailto:privacy@workforceap.org">privacy@workforceap.org</a>. We will respond within
              the timelines required by applicable law (typically 45 days under CCPA/CPRA and Texas SB 1827).
            </p>

            <h2>9. State-Specific Disclosures</h2>
            <h3>9.1 California (CCPA/CPRA)</h3>
            <p>
              California residents have all of the rights listed in Section 8. We do not sell personal
              information or share it for cross-context behavioral advertising. Categories of personal
              information we collect, the sources we collect from, the business purposes for collection,
              and the categories of third parties we share with are described above. We retain personal
              information for the periods described in Section 7.
            </p>
            <h3>9.2 Texas (Texas Data Privacy and Security Act)</h3>
            <p>
              Texas residents have the same access, correction, deletion, portability, and opt-out rights
              described above. To submit a request, use the channels in Section 8.
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

            <h2>10. Children&rsquo;s Privacy and Minor Consent</h2>
            <h3>10.1 Age Requirements</h3>
            <p>
              Our platform is generally intended for users 16 years of age and older. In some school- or
              partner-supported programs, minors ages 13–17 may participate with parent or guardian
              consent and any additional program approvals. We do not knowingly collect personal
              information from children under 13 without verifiable parental consent, as required by the
              Children&rsquo;s Online Privacy Protection Act (COPPA).
            </p>
            <h3>10.2 Minors (Ages 13–17)</h3>
            <p>For minors who participate in an approved program experience, we require:</p>
            <ul>
              <li><strong>Parental or guardian consent</strong> to our Terms of Service and this Privacy Policy before the minor can access our services</li>
              <li><strong>Guardian contact information</strong> for communication about the minor&rsquo;s participation</li>
              <li><strong>Educational-records consent</strong> if applicable, under FERPA</li>
            </ul>
            <h3>10.3 High School Partnerships</h3>
            <p>When partnering with high schools and educational institutions, we comply with FERPA for student records, collect only necessary information with appropriate consent, provide parents/guardians access to their minor&rsquo;s information on request, allow consent revocation and data deletion at any time, maintain enhanced access controls for minor records, and share student progress with authorized school officials only when consent is provided.</p>
            <h3>10.4 Parental Rights</h3>
            <p>Parents and guardians of minors have the right to review, correct, or request deletion of their child&rsquo;s information, refuse further collection, and receive notice of significant changes to our minor-data practices. To exercise these rights or to report information collected from a child under 13 without proper consent, contact us immediately at <a href="mailto:privacy@workforceap.org">privacy@workforceap.org</a>.</p>

            <h2>11. WIOA Participants &amp; Grant Records</h2>
            <p>
              If you participate in a WIOA-funded program, federal regulations (20 CFR Part 603 and
              related rules) govern the collection, use, and protection of your information. Your
              eligibility documentation, case-management records, and outcome data may be shared with
              the workforce development board, the Texas Workforce Commission (or your state equivalent),
              the U.S. Department of Labor, and authorized evaluators. We use these records solely for
              program administration, performance reporting, and authorized research. The retention
              period set by your grantor takes precedence over the default retention in Section 7.
            </p>

            <h2>12. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. For material changes, we will notify
              you by email or in-product notice at least 14 days before the change takes effect. The
              &ldquo;Last updated&rdquo; date at the top reflects the current version. Continued use of
              the services after a change indicates acceptance of the updated policy.
            </p>

            <h2>13. Contact Us</h2>
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
