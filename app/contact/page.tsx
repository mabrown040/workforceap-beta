import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import PageHero from '@/components/PageHero';
import PhotoHighlight from '@/components/PhotoHighlight';
import Footer from '@/components/Footer';

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
        subtitle="Questions about programs? Ready to apply? We respond within 24 hours."
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
              <p>We&rsquo;d love to hear from you. Have questions about our programs? Send us a message and we&rsquo;ll get back to you within 24 hours.</p>
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
                  <div><strong>Response Time</strong><br />Within 24 hours</div>
                </div>
              </div>
              <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-200)' }}>
                <p style={{ fontWeight: 600, marginBottom: '.5rem' }}>Ready to apply instead?</p>
                <Link href="/apply" className="btn btn-primary">Start Your Application</Link>
              </div>
            </div>
            <div className="col animate-on-scroll">
              <form className="contact-form" action="https://formspree.io/f/xpwzkyjo" method="POST">
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group"><label>First Name *</label><input type="text" name="first_name" required /></div>
                  <div className="form-group"><label>Last Name *</label><input type="text" name="last_name" required /></div>
                </div>
                <div className="form-group"><label>Email Address *</label><input type="email" name="email" required /></div>
                <div className="form-group"><label>Phone Number</label><input type="tel" name="phone" /></div>
                <div className="form-group">
                  <label>What can we help with? *</label>
                  <select name="topic" required>
                    <option value="">Select a topic&hellip;</option>
                    <option>Program information</option>
                    <option>Eligibility questions</option>
                    <option>Application help</option>
                    <option>Schedule a tour</option>
                    <option>Partnership or sponsorship</option>
                    <option>Media or press inquiry</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="form-group"><label>Your Message *</label><textarea name="message" rows={5} required /></div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem' }}>Send Message</button>
                <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--color-gray-400)', fontSize: '.85rem' }}>We respond within 24 hours.</p>
              </form>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
