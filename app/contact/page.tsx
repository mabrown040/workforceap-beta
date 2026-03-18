import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import PageHero from '@/components/PageHero';
import PhotoHighlight from '@/components/PhotoHighlight';
import Footer from '@/components/Footer';
import ContactFormClient from './ContactFormClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Contact Us',
  description:
    'Contact Workforce Advancement Project for program questions, enrollment support, and partnership opportunities.',
  path: '/contact',
});

export default function ContactPage() {
  return (
    <div className="inner-page">
      <PageHero
        title="Contact Us"
        subtitle="Questions about programs? Ready to apply? We respond within 24–48 hours."
      />

      <PhotoHighlight
        imageUrl="https://images.unsplash.com/photo-1497366216548-37526070297c?w=1400&q=80"
        label="Get In Touch"
        title="We're Here to Help"
        description="Whether you have questions about programs, schedules, or partnerships, our team is ready to assist you on your journey."
      />

      <section className="content-section">
        <div className="container">
          <div className="two-col">
            <div className="col animate-on-scroll">
              <h2>Let&rsquo;s Connect</h2>
              <p>We&rsquo;d love to hear from you. Have questions about our programs? Send us a message and we&rsquo;ll get back to you within 24–48 hours.</p>
              <div className="contact-info">
                <div className="contact-item">
                  <span className="contact-icon">&#128231;</span>
                  <div><strong>Email</strong><br /><a href="mailto:info@workforceap.org" style={{ color: 'var(--color-accent)' }}>info@workforceap.org</a></div>
                </div>
                <div className="contact-item">
                  <span className="contact-icon">&#128222;</span>
                  <div><strong>Phone</strong><br /><a href="tel:5127771808" style={{ color: 'var(--color-accent)' }}>(512) 777-1808</a></div>
                </div>
                <div className="contact-item">
                  <span className="contact-icon">&#128336;</span>
                  <div><strong>Response Time</strong><br />Within 24–48 hours</div>
                </div>
              </div>
              <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-200)' }}>
                <p style={{ fontWeight: 600, marginBottom: '.5rem' }}>Ready to apply instead?</p>
                <Link href="/apply" className="btn btn-primary">Start Your Application</Link>
              </div>
            </div>
            <div className="col animate-on-scroll">
              <ContactFormClient />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
