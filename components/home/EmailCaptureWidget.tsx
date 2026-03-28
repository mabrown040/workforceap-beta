'use client';

import { useState } from 'react';

export default function EmailCaptureWidget() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      // TODO: wire to actual email capture endpoint
      setSubmitted(true);
    }
  };

  return (
    <section style={{ padding: '6rem 2rem' }}>
      <div
        style={{
          maxWidth: '56rem',
          margin: '0 auto',
          backgroundColor: '#201f1f',
          padding: '3rem',
          borderRadius: '1rem',
          border: '1px solid rgba(88, 65, 68, 0.2)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '16rem',
            height: '16rem',
            background: 'rgba(173, 44, 77, 0.05)',
            borderRadius: '50%',
            filter: 'blur(48px)',
            marginRight: '-8rem',
            marginTop: '-8rem',
          }}
        />
        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#e6e1e1', marginBottom: '1rem' }}>
            Not ready to apply?
          </h2>
          <p style={{ color: '#debfc2', maxWidth: '28rem', margin: '0 auto 2rem' }}>
            Get our monthly career guide for Austin&apos;s tech scene and success stories from your neighborhood.
          </p>
          {submitted ? (
            <p style={{ color: '#ffb2bc', fontWeight: 700 }}>✓ You&apos;re in! Check your inbox.</p>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '28rem', margin: '0 auto' }} className="sm:wa-flex-row">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                style={{
                  flex: 1,
                  backgroundColor: '#2b2a2a',
                  border: 'none',
                  borderRadius: '0.5rem',
                  padding: '0.75rem 1rem',
                  color: '#e6e1e1',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                style={{
                  backgroundColor: '#ad2c4d',
                  color: '#670024',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Stay in the loop
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
