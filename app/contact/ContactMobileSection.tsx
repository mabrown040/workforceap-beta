'use client';

import MobileBottomNav from '@/components/MobileBottomNav';
import ContactFormClient from './ContactFormClient';

export default function ContactMobileSection() {
  return (
    <div className="md:wa-hidden" style={{ background: '#fcf9f8', minHeight: '100vh', paddingBottom: '8rem' }}>
      {/* Top Nav */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          width: '100%',
          zIndex: 50,
          background: 'rgba(252,249,248,0.9)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingLeft: '1.5rem',
          paddingRight: '1.5rem',
          paddingTop: '1rem',
          paddingBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="material-symbols-outlined text-[#ad2c4d]">school</span>
          <span className="text-xl font-black text-[#ad2c4d] tracking-tighter">WorkforceAP</span>
        </div>
        <span className="material-symbols-outlined text-[#584144]">account_circle</span>
      </header>

      {/* Hero */}
      <div style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingTop: '6rem', marginBottom: '2rem' }}>
        <h1 className="text-4xl font-extrabold tracking-tight text-[#1c1b1b] leading-tight" style={{ marginBottom: '0.5rem' }}>
          Get in Touch
        </h1>
        <p className="text-[#584144] text-base leading-relaxed">
          We respond within 3–5 business days
        </p>
      </div>

      {/* Contact Methods Row */}
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
            <span className="material-symbols-outlined text-[#8c0f37]">alternate_email</span>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#8c0f37]" style={{ marginBottom: '0.25rem' }}>Email</p>
          <p className="text-sm font-semibold text-[#1c1b1b]" style={{ wordBreak: 'break-word' }}>info@workforceap.org</p>
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
            <span className="material-symbols-outlined text-[#7b5800]">phone</span>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#7b5800]" style={{ marginBottom: '0.25rem' }}>Phone</p>
          <p className="text-sm font-semibold text-[#1c1b1b]">(512) 777-1808</p>
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
            <span className="material-symbols-outlined text-[#8c0f37]">location_on</span>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#8c0f37]" style={{ marginBottom: '0.25rem' }}>Location</p>
          <p className="text-sm font-semibold text-[#1c1b1b]">Austin, TX</p>
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
            <span className="material-symbols-outlined text-[#8c0f37]">schedule</span>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#8c0f37]" style={{ marginBottom: '0.25rem' }}>Hours</p>
          <p className="text-sm font-semibold text-[#1c1b1b]">Mon–Fri 9–5 CT</p>
        </div>
      </div>

      {/* Contact Form */}
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
          <h2 className="text-xl font-bold text-[#1c1b1b]" style={{ marginBottom: '1.5rem', position: 'relative', zIndex: 10 }}>Send Us a Message</h2>
          <div style={{ position: 'relative', zIndex: 10 }}>
            <ContactFormClient />
          </div>
        </div>
      </div>

      {/* Office Info */}
      <div style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ textAlign: 'center', paddingTop: '1.5rem', paddingBottom: '1.5rem', paddingLeft: '1rem', paddingRight: '1rem', background: '#f6f3f2', borderRadius: '0.75rem' }}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#584144]" style={{ marginBottom: '0.5rem' }}>
            Workforce Advancement Project
          </p>
          <p className="text-sm text-[#584144]">
            Austin, TX · Serving communities nationwide
          </p>
          <p className="text-sm text-[#584144]" style={{ marginTop: '0.25rem' }}>
            <a href="mailto:info@workforceap.org" className="text-[#8c0f37] font-semibold">
              info@workforceap.org
            </a>
            {' · '}
            <a href="tel:5127771808" className="text-[#584144]">(512) 777-1808</a>
          </p>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
