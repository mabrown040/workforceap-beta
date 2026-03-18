import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import PageHero from '@/components/PageHero';

export const metadata: Metadata = buildPageMetadata({
  title: 'Terms of Service',
  description: 'Terms of Service for the Workforce Advancement Project member portal and training programs.',
  path: '/terms',
});

export default function TermsPage() {
  return (
    <div className="inner-page">
      <PageHero
        title="Terms of Service"
        subtitle="Last updated: March 2026"
      />
      <section className="content-section">
        <div className="container" style={{ maxWidth: '800px' }}>
          <div className="markdown-body" style={{ lineHeight: 1.7 }}>
            <h2>1. Acceptance of Terms</h2>
            <p>By creating an account or using the Workforce Advancement Project (&ldquo;WorkforceAP&rdquo;) member portal and services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>

            <h2>2. Program Eligibility</h2>
            <p>WorkforceAP programs are designed for qualifying participants. Eligibility requirements include but are not limited to: being 16 years of age or older, being a U.S. Citizen or Permanent Resident, and meeting income and employment criteria as determined during the application process. WorkforceAP reserves the right to verify eligibility and deny enrollment to ineligible applicants.</p>

            <h2>3. Member Responsibilities</h2>
            <p>As a member, you agree to:</p>
            <ul>
              <li>Provide accurate and truthful information during registration and throughout your participation</li>
              <li>Maintain the confidentiality of your account credentials</li>
              <li>Commit to 100% program completion to the best of your ability</li>
              <li>Participate in job placement assistance services as outlined in your program</li>
              <li>Notify WorkforceAP of any changes to your eligibility status</li>
              <li>Use the member portal and resources only for their intended educational and career development purposes</li>
            </ul>

            <h2>4. Program Participation</h2>
            <p>Enrollment in a WorkforceAP program is subject to seat availability. WorkforceAP reserves the right to modify program schedules, curriculum, and requirements. Participants who fail to meet program attendance or completion standards may be removed from the program. Loaner equipment provided as part of the program remains the property of WorkforceAP until program completion milestones are met.</p>

            <h2>5. No-Cost Training Conditions</h2>
            <p>No-cost training is available to qualifying participants based on eligibility criteria. WorkforceAP programs are funded through grants, partnerships, and contributions. If it is determined that a participant provided false information to qualify for no-cost training, WorkforceAP reserves the right to terminate enrollment and seek recovery of program costs.</p>

            <h2>6. Data and Privacy</h2>
            <p>Your use of the WorkforceAP platform is also governed by our <a href="/privacy">Privacy Policy</a>, which is incorporated into these Terms by reference. By using our services, you consent to the collection and use of your information as described in the Privacy Policy.</p>

            <h2>7. Intellectual Property</h2>
            <p>All content on the WorkforceAP platform, including course materials, assessments, and resources, is provided for your personal educational use. You may not reproduce, distribute, or create derivative works from this content without written permission from WorkforceAP.</p>

            <h2>8. Limitation of Liability</h2>
            <p>WorkforceAP provides training and career support services but does not guarantee employment outcomes. Job placement assistance is provided as a best-effort service. WorkforceAP is not liable for any employment decisions made by third-party employers.</p>

            <h2>9. Modifications</h2>
            <p>WorkforceAP reserves the right to modify these Terms at any time. Continued use of the platform after changes are posted constitutes acceptance of the revised Terms.</p>

            <h2>10. Contact</h2>
            <p>For questions about these Terms, please contact us at <a href="mailto:info@workforceap.org">info@workforceap.org</a> or visit our <a href="/contact">Contact page</a>.</p>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
