import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import PageHero from '@/components/PageHero';

export const metadata: Metadata = buildPageMetadata({
  title: 'Privacy Policy',
  description: 'Privacy Policy for the Workforce Advancement Project — how we collect, use, and protect your information.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <div className="inner-page">
      <PageHero
        title="Privacy Policy"
        subtitle="Last updated: March 2026"
      />
      <section className="content-section">
        <div className="container" style={{ maxWidth: '800px' }}>
          <div className="prose" style={{ lineHeight: 1.7 }}>
            <h2>1. Information We Collect</h2>
            <p>WorkforceAP collects information you provide directly to us, including:</p>
            <ul>
              <li><strong>Account information:</strong> Name, email address, phone number, ZIP code, and password when you create an account</li>
              <li><strong>Application information:</strong> Employment status, household income, location, and program preferences submitted during the application process</li>
              <li><strong>Assessment data:</strong> Responses to readiness assessments and program interest selections</li>
              <li><strong>Profile information:</strong> Veteran status, employment status, and other optional profile details</li>
              <li><strong>Usage data:</strong> Information about how you interact with our platform, including pages visited, resources accessed, and progress in courses</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide, maintain, and improve our career training services</li>
              <li>Process your application and determine program eligibility</li>
              <li>Personalize your learning experience and track your progress</li>
              <li>Communicate with you about your enrollment, program updates, and career resources</li>
              <li>Connect you with job placement opportunities and employer partners</li>
              <li>Comply with grant reporting requirements and program evaluation</li>
              <li>Send service-related notices and, with your consent, promotional communications</li>
            </ul>

            <h2>3. Information Sharing</h2>
            <p>WorkforceAP does not sell your personal information. We may share your information with:</p>
            <ul>
              <li><strong>Program partners:</strong> Coursera, IBM, Google, Amazon, Microsoft, CompTIA, and other certification providers to facilitate your enrollment in their platforms</li>
              <li><strong>Employer partners:</strong> With your explicit consent, we may share your resume or profile with potential employers as part of job placement assistance</li>
              <li><strong>Grant funders:</strong> Aggregated, de-identified data may be shared with grant providers for reporting purposes</li>
              <li><strong>Service providers:</strong> Third-party vendors who assist us in operating our platform, subject to confidentiality agreements</li>
              <li><strong>Legal requirements:</strong> When required by law or to protect the rights and safety of WorkforceAP and its members</li>
            </ul>

            <h2>4. Data Security</h2>
            <p>We implement industry-standard security measures to protect your information, including encrypted data transmission (HTTPS), secure authentication through Supabase, and access controls limiting who can view your personal data. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.</p>

            <h2>5. Data Retention</h2>
            <p>We retain your information for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time through your account settings or by contacting us at <a href="mailto:info@workforceap.org">info@workforceap.org</a>. Certain information may be retained as required by law or for legitimate business purposes.</p>

            <h2>6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access and review the personal information we hold about you</li>
              <li>Correct inaccurate or incomplete information</li>
              <li>Request deletion of your account and personal data</li>
              <li>Opt out of marketing communications at any time</li>
              <li>Request a copy of your data in a portable format</li>
            </ul>
            <p>To exercise these rights, contact us at <a href="mailto:info@workforceap.org">info@workforceap.org</a>.</p>

            <h2>7. Cookies and Tracking</h2>
            <p>We use cookies and similar technologies to maintain your session, remember your preferences, and understand how our platform is used. We use Google Tag Manager for analytics. You can control cookie settings through your browser, though disabling cookies may affect platform functionality.</p>

            <h2>8. Children&rsquo;s Privacy</h2>
            <p>Our platform is intended for users 16 years of age and older. We do not knowingly collect personal information from children under 13. If we become aware that we have collected information from a child under 13, we will delete it promptly.</p>

            <h2>9. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page and updating the &ldquo;Last updated&rdquo; date. Your continued use of our services after changes are posted constitutes acceptance of the revised policy.</p>

            <h2>10. Contact Us</h2>
            <p>If you have questions about this Privacy Policy or our data practices, please contact us:</p>
            <p>
              <strong>Workforce Advancement Project</strong><br />
              Email: <a href="mailto:info@workforceap.org">info@workforceap.org</a><br />
              Phone: <a href="tel:5127771808">(512) 777-1808</a><br />
              <a href="/contact">Contact Form</a>
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
