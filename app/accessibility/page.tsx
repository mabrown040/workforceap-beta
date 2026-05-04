import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import { buildPageMetadataAsync } from '@/app/seo';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Accessibility Statement',
  description:
    'Read Workforce Advancement Project accessibility commitments and how to request help using the site.',
  path: '/accessibility',
});
}

const sectionStyle: CSSProperties = {
  maxWidth: 900,
  margin: '0 auto',
  padding: '0 1.25rem',
};

export default function AccessibilityPage() {
  return (
    <div className="inner-page marketing-mobile-pb-for-bottom-nav">
      <section className="content-section">
        <div style={sectionStyle}>
          <span className="text-label-upper" style={{ color: 'var(--color-accent)', marginBottom: '1rem', display: 'block' }}>
            Accessibility
          </span>
          <h1 className="text-display-lg" style={{ marginBottom: '1rem' }}>Accessibility Statement</h1>
          <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.8, marginBottom: '1.5rem' }}>
            Workforce Advancement Project works to make this site easier to use for members, partners, employers, and community supporters.
            We aim to provide clear content, readable layouts, keyboard-usable navigation, and mobile-friendly access on slow devices and limited connections.
          </p>
          <div className="portal-card portal-card--flat" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>If you need help using this site</h2>
            <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.7, marginBottom: '0.75rem' }}>
              If you run into a barrier while using WorkforceAP.org, contact us and we will do our best to provide the information or support you need in another format.
            </p>
            <ul style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.8, paddingLeft: '1.25rem', margin: 0 }}>
              <li>Email: <a href="mailto:info@workforceap.org">info@workforceap.org</a></li>
              <li>Phone: <a href="tel:+15127771808">(512) 777-1808</a></li>
              <li><Link href="/contact">Contact form</Link></li>
            </ul>
          </div>
          <div className="portal-card portal-card--flat" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Ongoing improvements</h2>
            <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.8, marginBottom: '0.75rem' }}>
              We continue improving content clarity, color contrast, tap targets, and responsive behavior across public and member-facing pages.
            </p>
            <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.8, margin: 0 }}>
              If something is hard to read, navigate, or complete, please tell us. That feedback helps us improve access for the people this work is meant to serve.
            </p>
          </div>
        </div>
      </section>
      <Footer />
      <MobileBottomNav />
      <div className="mobile-bottom-nav-spacer" aria-hidden="true" />
    </div>
  );
}
