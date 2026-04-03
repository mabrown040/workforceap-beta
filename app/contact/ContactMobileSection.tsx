'use client';

import Link from 'next/link';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import ContactFormClient from './ContactFormClient';

export default function ContactMobileSection() {
  return (
    <div className="marketing-mobile marketing-mobile-pb-for-bottom-nav" style={{ background: 'var(--color-surface)', minHeight: '100vh' }}>
      <div style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingTop: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: "0.5rem", fontSize: "2.25rem", fontWeight: 800, letterSpacing: "-0.025em", color: "var(--color-on-surface)", lineHeight: 1.15 }}>
          Get in Touch
        </h2>
        <p style={{ color: '#584144', fontSize: '1rem', lineHeight: 1.6 }}>
          We respond within 3–5 business days
        </p>
      </div>

      <div
        style={{
          paddingLeft: '1.5rem',
          paddingRight: '1.5rem',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div style={{ background: 'white', padding: '1.25rem', borderRadius: '0.75rem' }}>
          <div
            style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '0.5rem',
              background: 'rgba(140,15,55,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}
          >
            <span className="material-symbols-outlined" style={{ color: '#8c0f37' }}>alternate_email</span>
          </div>
          <p style={{ marginBottom: '0.25rem', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8c0f37' }}>Email</p>
          <p style={{ wordBreak: 'break-word', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>info@workforceap.org</p>
        </div>
        <div style={{ background: 'white', padding: '1.25rem', borderRadius: '0.75rem' }}>
          <div
            style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '0.5rem',
              background: 'rgba(255,187,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}
          >
            <span className="material-symbols-outlined" style={{ color: '#7b5800' }}>phone</span>
          </div>
          <p style={{ marginBottom: '0.25rem', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7b5800' }}>Phone</p>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>(512) 777-1808</p>
        </div>
        <div style={{ background: 'white', padding: '1.25rem', borderRadius: '0.75rem' }}>
          <div
            style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '0.5rem',
              background: 'rgba(140,15,55,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}
          >
            <span className="material-symbols-outlined" style={{ color: '#8c0f37' }}>location_on</span>
          </div>
          <p style={{ marginBottom: '0.25rem', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8c0f37' }}>Location</p>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>Austin, TX</p>
        </div>
        <div style={{ background: 'white', padding: '1.25rem', borderRadius: '0.75rem' }}>
          <div
            style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '0.5rem',
              background: 'rgba(140,15,55,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}
          >
            <span className="material-symbols-outlined" style={{ color: '#8c0f37' }}>schedule</span>
          </div>
          <p style={{ marginBottom: '0.25rem', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8c0f37' }}>Hours</p>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>Mon–Fri 9–5 CT</p>
        </div>
      </div>

      <div style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem', marginBottom: '2.5rem' }}>
        <div style={{ background: '#f6f3f2', padding: '1.5rem', borderRadius: '0.75rem', position: 'relative', overflow: 'hidden' }}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '8rem',
              height: '8rem',
              background: 'rgba(140,15,55,0.05)',
              borderRadius: '50%',
              marginRight: '-4rem',
              marginTop: '-4rem',
              filter: 'blur(24px)',
            }}
          />
          <h2 style={{ marginBottom: '1.5rem', position: 'relative', zIndex: 10, fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>Send Us a Message</h2>
          <div style={{ position: 'relative', zIndex: 10 }}>
            <ContactFormClient />
          </div>
        </div>
      </div>

      <div style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ textAlign: 'center', paddingTop: '1.5rem', paddingBottom: '1.5rem', paddingLeft: '1rem', paddingRight: '1rem', background: '#f6f3f2', borderRadius: '0.75rem' }}>
          <p style={{ marginBottom: '0.5rem', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#584144' }}>
            Workforce Advancement Project
          </p>
          <p style={{ fontSize: '0.875rem', color: '#584144' }}>
            Austin, TX · Serving communities nationwide
          </p>
          <p style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: '#584144' }}>
            <a href="mailto:info@workforceap.org" style={{ color: '#8c0f37', fontWeight: 600, textDecoration: 'none' }}>
              info@workforceap.org
            </a>
            {' · '}
            <a href="tel:5127771808" style={{ color: '#584144', textDecoration: 'none' }}>(512) 777-1808</a>
          </p>
        </div>
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
