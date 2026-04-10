import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import Footer from '@/components/Footer';
import ContactFormClient from './ContactFormClient';
import ContactMobileSection from './ContactMobileSection';

export const metadata: Metadata = buildPageMetadata({
  title: 'Contact Us',
  description:
    'Contact Workforce Advancement Project for program questions, enrollment support, and partnership opportunities.',
  path: '/contact',
});

export default function ContactPage() {
  return (
    <div className="inner-page contact-page">
      {/* Mobile view ≤768px */}
      <div className="marketing-mobile">
        <ContactMobileSection />
      </div>

      {/* Desktop view >768px */}
      <div className="marketing-desktop">
      {/* Hero Section */}
      <section className="content-section" style={{ paddingBottom: 0 }}>
        <div className="container" style={{ maxWidth: 1400 }}>
          <div style={{ marginBottom: '4rem' }}>
            <span className="text-label-upper" style={{ color: 'var(--color-accent)', marginBottom: '1rem', display: 'block' }}>
              Connect with Authority
            </span>
            <h1 className="text-display-lg" style={{ color: 'var(--color-on-surface)', maxWidth: '48rem', marginBottom: '1.5rem' }}>
              The bridge between <span style={{ color: 'var(--color-accent)' }}>ambition</span> and institutional impact.
            </h1>
            <p style={{ fontSize: '1.125rem', color: 'var(--color-on-surface-variant)', maxWidth: '42rem', lineHeight: 1.7 }}>
              Whether you&rsquo;re an applicant, employer partner, or community supporter, our team responds within 24&ndash;48 hours. We&rsquo;re here to help you move forward.
            </p>
          </div>
        </div>
      </section>

      {/* Content Grid: 7/5 Asymmetric Layout */}
      <section className="content-section" style={{ paddingTop: 0 }}>
        <div className="container" style={{ maxWidth: 1400 }}>
          <div className="editorial-grid" style={{ gap: '3rem' }}>
            {/* Contact Form Section (Left 7 Columns) */}
            <div style={{ gridColumn: 'span 12' }} className="lg-col-span-7">
              <div className="portal-card portal-card--flat" style={{ padding: '2.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem', color: 'var(--color-on-surface)' }}>
                  Send Us a Message
                </h2>
                <ContactFormClient />
              </div>
            </div>

            {/* Info Cards Section (Right 5 Columns) */}
            <div style={{ gridColumn: 'span 12' }} className="lg-col-span-5">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Location Card */}
                <div className="portal-card portal-card--elevated" style={{ padding: '2rem', display: 'flex', alignItems: 'flex-start', gap: '1.5rem' }}>
                  <div style={{ background: 'rgba(173,44,77,0.1)', padding: '0.75rem', borderRadius: 'var(--radius-lg)', color: 'var(--color-accent)', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" aria-hidden="true">location_on</span>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-on-surface)' }}>Our Location</h3>
                    <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
                      Headquartered in Austin, TX<br />
                      Serving communities nationwide
                    </p>
                  </div>
                </div>

                {/* Email Card */}
                <div className="portal-card portal-card--elevated" style={{ padding: '2rem', display: 'flex', alignItems: 'flex-start', gap: '1.5rem' }}>
                  <div style={{ background: 'rgba(173,44,77,0.1)', padding: '0.75rem', borderRadius: 'var(--radius-lg)', color: 'var(--color-accent)', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" aria-hidden="true">alternate_email</span>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-on-surface)' }}>Email</h3>
                    <p style={{ color: 'var(--color-on-surface-variant)' }}>
                      <a href="mailto:info@workforceap.org" style={{ color: 'var(--color-accent)' }}>info@workforceap.org</a>
                    </p>
                  </div>
                </div>

                {/* Phone Card */}
                <div className="portal-card portal-card--elevated" style={{ padding: '2rem', display: 'flex', alignItems: 'flex-start', gap: '1.5rem' }}>
                  <div style={{ background: 'rgba(173,44,77,0.1)', padding: '0.75rem', borderRadius: 'var(--radius-lg)', color: 'var(--color-accent)', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" aria-hidden="true">call</span>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-on-surface)' }}>Phone</h3>
                    <p style={{ color: 'var(--color-on-surface-variant)', fontFamily: 'monospace' }}>
                      <a href="tel:5127771808" style={{ color: 'var(--color-on-surface-variant)' }}>(512) 777-1808</a>
                    </p>
                    <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                      Mon&ndash;Fri, 9:00 AM &ndash; 5:00 PM CT
                    </p>
                  </div>
                </div>

                {/* Map placeholder */}
                <div style={{
                  background: 'var(--surface-container-low)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  aspectRatio: '16/9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--outline-variant)',
                }}>
                  <div style={{ textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem', opacity: 0.4 }} aria-hidden="true">map</span>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Austin, TX</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Editorial Quote Section */}
      <section className="content-section" style={{ textAlign: 'center', maxWidth: '56rem', margin: '0 auto', paddingTop: '4rem', borderTop: '1px solid rgba(88,65,68,0.1)' }}>
        <div className="container">
          <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '2.5rem', marginBottom: '1.5rem', display: 'block', fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>format_quote</span>
          <p style={{ fontSize: '1.5rem', fontWeight: 300, fontStyle: 'italic', color: 'var(--color-on-surface-variant)', lineHeight: 1.6, maxWidth: '40rem', margin: '0 auto' }}>
            &ldquo;We believe everyone deserves a clear path to a meaningful career. That starts with being available and responsive to the people we serve.&rdquo;
          </p>
          <p className="text-label-upper" style={{ color: 'var(--color-accent)', marginTop: '2rem' }}>
            Workforce Advancement Project Team
          </p>
        </div>
      </section>

      <style>{`
        @media (min-width: 1024px) {
          .lg-col-span-7 { grid-column: span 7 !important; }
          .lg-col-span-5 { grid-column: span 5 !important; }
        }
      `}</style>

      <Footer />
      </div>{/* end desktop */}
    </div>
  );
}
