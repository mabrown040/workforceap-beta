import type { Metadata } from 'next';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import PageHero from '@/components/PageHero';
import Footer from '@/components/Footer';

export const metadata: Metadata = buildPageMetadata({
  title: 'Privacy Policy',
  description: 'Workforce Advancement Project privacy policy and data practices.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <div className="inner-page">
      <PageHero
        title="Privacy Policy"
        subtitle="How we collect, use, and protect your information."
      />

      <section className="content-section">
        <div className="container">
          <div className="markdown-body" style={{ maxWidth: '720px' }}>
            <p><em>Last updated: March 2025</em></p>

            <h2>Overview</h2>
            <p>
              Workforce Advancement Project (&quot;WorkforceAP&quot;) respects your privacy. This policy describes how we collect, use, and protect information when you use our website and member portal.
            </p>

            <h2>Information We Collect</h2>
            <p>We may collect:</p>
            <ul>
              <li><strong>Account information:</strong> Name, email, phone, and address when you sign up or apply.</li>
              <li><strong>Usage data:</strong> How you use our site, including pages visited and tools used.</li>
              <li><strong>Application data:</strong> Information you provide when applying for programs or member benefits.</li>
            </ul>

            <h2>How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul>
              <li>Provide and improve our programs and services</li>
              <li>Communicate with you about your application and membership</li>
              <li>Send relevant updates and career resources (with your consent)</li>
              <li>Analyze site usage to improve the user experience</li>
            </ul>

            <h2>Data Security</h2>
            <p>
              We use industry-standard measures to protect your data. Account credentials are stored securely. We do not sell your personal information to third parties.
            </p>

            <h2>Cookies and Analytics</h2>
            <p>
              We use cookies for authentication and analytics to understand how visitors use our site. You can adjust browser settings to limit cookies.
            </p>

            <h2>Your Rights</h2>
            <p>
              You may request access to, correction of, or deletion of your personal data. Contact us at{' '}
              <a href="mailto:info@workforceap.org">info@workforceap.org</a> with requests.
            </p>

            <h2>Contact</h2>
            <p>
              Questions about this policy? <Link href="/contact">Contact us</Link>.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
