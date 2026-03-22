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
    <div className="inner-page contact-page">
      <PageHero
        title="Contact WorkforceAP"
        subtitle="Use this page when you are not ready to apply, hire talent, or choose a program on your own. We respond within 24–48 hours and help route you to the right next step."
      >
        <div className="hero-actions" style={{ marginTop: '1.5rem' }}>
          <Link href="/apply" className="btn btn-primary">Apply</Link>
          <Link href="/programs" className="btn btn-outline">Explore programs</Link>
          <Link href="/employers" className="btn btn-outline">Hire talent</Link>
        </div>
      </PageHero>

      <PhotoHighlight
        imageUrl="https://images.unsplash.com/photo-1497366216548-37526070297c?w=1400&q=80"
        label="Get In Touch"
        title="A simple routing page for every audience"
        description="Members, employers, and partners can all start here when they need help. Our job is to point you toward the right WorkforceAP journey without splitting your attention."
      />

      <section className="content-section">
        <div className="container">
          <div className="mission-vision-grid" style={{ marginBottom: '2.5rem' }}>
            <div className="mv-card animate-on-scroll">
              <h2>Who this is for</h2>
              <p>Prospective members, employers, partners, and supporters who need help choosing the best next action.</p>
            </div>
            <div className="mv-card animate-on-scroll">
              <h2>What WorkforceAP offers</h2>
              <p>A real person, a fast response window, and guidance toward the right route: apply, explore programs, hire talent, or continue the conversation.</p>
            </div>
          </div>
          <div className="two-col">
            <div className="col animate-on-scroll">
              <h2>What to do next</h2>
              <p>If you already know your goal, use one of the primary paths below. If not, send us a message and we will help you choose the right one.</p>
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
                <p style={{ fontWeight: 600, marginBottom: '.75rem' }}>Most common next steps</p>
                <div className="cta-buttons" style={{ justifyContent: 'flex-start' }}>
                  <Link href="/apply" className="btn btn-primary">Apply</Link>
                  <Link href="/programs" className="btn btn-outline">Explore programs</Link>
                  <Link href="/employers" className="btn btn-outline">Hire talent</Link>
                </div>
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
