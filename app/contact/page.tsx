import type { Metadata } from 'next';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import StitchHero from '@/components/marketing/StitchHero';
import StitchPage from '@/components/marketing/StitchPage';
import ContactFormClient from './ContactFormClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Contact Us | Workforce Advancement Project',
  description:
    'Contact Workforce Advancement Project for program questions, enrollment support, and partnership opportunities.',
  path: '/contact',
});

export default function ContactPage() {
  return (
    <StitchPage>
      <StitchHero
        badge="Get in Touch"
        title={
          <>
            Contact us through a
            <br />
            <span className="stitch-title-highlight">proper Stitch shell</span>
          </>
        }
        description="Contact now reads like the same premium marketing product as the rest of the site instead of a standalone utility page."
        actions={
          <>
            <Link href="/apply" className="btn btn-primary">Apply now</Link>
            <Link href="/faq" className="btn btn-outline">Read common questions</Link>
          </>
        }
      />

      <section className="stitch-section">
        <div className="stitch-grid-2">
          <div className="stitch-surface">
            <div className="stitch-kicker">Message the Team</div>
            <h2 className="wa-text-3xl wa-font-bold wa-mt-3">Questions about programs, eligibility, or partners</h2>
            <p className="wa-mt-3 stitch-muted">Fill out the form and our team will get back to you shortly.</p>
            <div className="wa-mt-6">
              <ContactFormClient />
            </div>
          </div>

          <div className="wa-flex wa-flex-col wa-gap-4">
            <div className="stitch-card">
              <div className="stitch-kicker">Contact Information</div>
              <div className="stitch-panel-list wa-mt-4">
                <div><strong>Austin, TX</strong><p className="wa-mt-2">Built for Austin first, expanding over time.</p></div>
                <div><strong>info@workforceap.org</strong><p className="wa-mt-2">Questions, referrals, and partnership requests.</p></div>
                <div><strong>(512) 777-1808</strong><p className="wa-mt-2">Monday through Friday, 9 AM to 5 PM CT.</p></div>
              </div>
            </div>
            <div className="stitch-cta-band">
              <div className="stitch-kicker">Ready to Move</div>
              <h3>Skip the form if you already know you want in</h3>
              <p>Start the application directly. It takes about 10 minutes.</p>
              <div className="stitch-actions">
                <Link href="/apply" className="btn btn-primary">Apply now</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </StitchPage>
  );
}
