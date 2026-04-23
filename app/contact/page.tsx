import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import ContactFormClient from './ContactFormClient';

function getPrefilledTopic(topicParam?: string | string[]): string {
  const raw = Array.isArray(topicParam) ? topicParam[0] : topicParam;
  const topic = raw?.trim().toLowerCase();
  if (!topic) return '';

  const topicMap: Record<string, string> = {
    partnership: 'Partnership or sponsorship',
    partnerships: 'Partnership or sponsorship',
    sponsorship: 'Partnership or sponsorship',
    sponsor: 'Partnership or sponsorship',
    program: 'Program information',
    eligibility: 'Eligibility questions',
    application: 'Application help',
    tour: 'Schedule a tour',
    media: 'Media or press inquiry',
    press: 'Media or press inquiry',
    other: 'Other',
  };

  return topicMap[topic] ?? '';
}

export const metadata: Metadata = buildPageMetadata({
  title: 'Contact Us',
  description:
    'Contact Workforce Advancement Project for program questions, enrollment support, and partnership opportunities.',
  path: '/contact',
});

const contactCards = [
  {
    icon: 'location_on',
    title: 'Our Location',
    accentBg: 'rgba(173,44,77,0.1)',
    accentColor: 'var(--color-accent)',
    body: (
      <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.6, margin: 0 }}>
        Built in Austin.
        <br />
        Available nationwide.
      </p>
    ),
  },
  {
    icon: 'alternate_email',
    title: 'Email',
    accentBg: 'rgba(173,44,77,0.1)',
    accentColor: 'var(--color-accent)',
    body: (
      <p style={{ margin: 0 }}>
        <a href="mailto:info@workforceap.org" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
          info@workforceap.org
        </a>
      </p>
    ),
  },
  {
    icon: 'call',
    title: 'Phone',
    accentBg: 'rgba(255,187,0,0.12)',
    accentColor: '#7b5800',
    body: (
      <>
        <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', fontFamily: 'monospace' }}>
          <a href="tel:5127771808" style={{ color: 'inherit' }}>(512) 777-1808</a>
        </p>
        <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.875rem', margin: '0.35rem 0 0' }}>
          Mon–Fri, 9:00 AM – 5:00 PM CT
        </p>
      </>
    ),
  },
  {
    icon: 'schedule',
    title: 'Response Time',
    accentBg: 'rgba(173,44,77,0.1)',
    accentColor: 'var(--color-accent)',
    body: (
      <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.6, margin: 0 }}>
        We reply within 1–2 business days for most inquiries.
      </p>
    ),
  },
];

export default async function ContactPage({
  searchParams,
}: {
  searchParams?: Promise<{ topic?: string | string[] }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const initialTopic = getPrefilledTopic(resolvedSearchParams?.topic);

  return (
    <div className="inner-page contact-page marketing-mobile-pb-for-bottom-nav">
      <section className="content-section" style={{ paddingBottom: '2rem' }}>
        <div className="container" style={{ maxWidth: 1400 }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <span className="text-label-upper" style={{ color: 'var(--color-accent)', marginBottom: '1rem', display: 'block' }}>
              Get in Touch
            </span>
            <h1 className="text-display-lg" style={{ color: 'var(--color-on-surface)', maxWidth: '48rem', marginBottom: '1.25rem' }}>
              We&apos;re here for <span style={{ color: 'var(--color-accent)' }}>members, employers, and partners</span> alike.
            </h1>
            <p style={{ fontSize: '1.05rem', color: 'var(--color-on-surface-variant)', maxWidth: '46rem', lineHeight: 1.7, margin: 0 }}>
              Whether you&apos;re a current or prospective member with program questions, an employer looking to hire or build a pipeline,
              a community partner exploring a referral relationship, or a donor interested in supporting our work, reach out and a
              member of our team will respond within 1–2 business days.
            </p>
          </div>

          <div className="contact-grid" style={{ display: 'grid', gap: '2rem', alignItems: 'start' }}>
            <div>
              <div className="portal-card portal-card--flat" style={{ padding: 'clamp(1.25rem, 3vw, 2.5rem)' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--color-on-surface)' }}>
                  Send Us a Message
                </h2>
                <ContactFormClient initialTopic={initialTopic} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="contact-card-grid" style={{ display: 'grid', gap: '1rem' }}>
                {contactCards.map((card) => (
                  <div key={card.title} className="portal-card portal-card--elevated" style={{ padding: '1.25rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ background: card.accentBg, padding: '0.75rem', borderRadius: 'var(--radius-lg)', color: card.accentColor, flexShrink: 0 }}>
                      <span className="material-symbols-outlined" aria-hidden="true">{card.icon}</span>
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--color-on-surface)' }}>{card.title}</h3>
                      {card.body}
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="portal-card portal-card--flat"
                style={{
                  padding: '1.25rem',
                  border: '1px solid var(--outline-variant)',
                  background: 'var(--surface-container-low)',
                }}
              >
                <p className="text-label-upper" style={{ marginBottom: '0.5rem', color: 'var(--color-accent)' }}>Austin-based team</p>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--color-on-surface)' }}>Built in Austin, supporting members nationwide</h3>
                <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
                  We work from Austin, Texas and support members, partners, and employers across the country. Use the form,
                  email, or phone to reach the right team and we&apos;ll follow up within 1–2 business days.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="content-section" style={{ textAlign: 'center', maxWidth: '56rem', margin: '0 auto', paddingTop: '2rem', borderTop: '1px solid rgba(88,65,68,0.1)' }}>
        <div className="container">
          <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '2.5rem', marginBottom: '1rem', display: 'block', '--ms-fill': 1 } as CSSProperties}>format_quote</span>
          <p style={{ fontSize: 'clamp(1.125rem, 2.5vw, 1.5rem)', fontWeight: 300, fontStyle: 'italic', color: 'var(--color-on-surface-variant)', lineHeight: 1.6, maxWidth: '40rem', margin: '0 auto' }}>
            &ldquo;We believe everyone deserves a clear path to a meaningful career. That starts with being available and responsive to the people we serve.&rdquo;
          </p>
          <p className="text-label-upper" style={{ color: 'var(--color-accent)', marginTop: '1.5rem' }}>
            Workforce Advancement Project Team
          </p>
        </div>
      </section>

      <Footer />
      <MobileBottomNav />
      {/* Spacer for mobile bottom nav — ensures footer content is not hidden */}
      <div className="mobile-bottom-nav-spacer" aria-hidden="true" />

      <style>{`
        .contact-grid {
          grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.85fr);
        }
        .contact-card-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        @media (max-width: 1023px) {
          .contact-grid,
          .contact-card-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
