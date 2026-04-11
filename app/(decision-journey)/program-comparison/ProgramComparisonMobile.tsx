import type { CSSProperties } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';

export type ComparisonRow = {
  label: string;
  a: string;
  b: string;
  highlight?: boolean;
};

const selectStyle: CSSProperties = {
  width: '100%',
  height: '3.5rem',
  paddingLeft: '1rem',
  paddingRight: '2.5rem',
  appearance: 'none',
  WebkitAppearance: 'none',
  background: '#ebe7e7',
  borderRadius: '0.75rem',
  color: 'var(--color-on-surface)',
  fontWeight: 500,
  border: 'none',
  fontSize: '0.9375rem',
};

export default function ProgramComparisonMobile({ rows }: { rows: ComparisonRow[] }) {
  return (
    <div className="marketing-mobile marketing-mobile-pb-for-bottom-nav" style={{ background: 'var(--color-surface)', color: 'var(--color-on-surface)', minHeight: '100vh' }}>
      <div style={{ paddingTop: '1.5rem', paddingLeft: '1.5rem', paddingRight: '1.5rem', maxWidth: '390px', margin: '0 auto' }}>
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-on-surface)', margin: '0 0 0.75rem', lineHeight: 1.15 }}>
            Compare Programs
          </h2>
          <p style={{ color: '#584144', fontSize: '1rem', lineHeight: 1.6, margin: 0 }}>
            Find the right fit for your goals and timeline through our curated workforce paths.
          </p>
        </section>

        <section style={{ marginBottom: '3rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: 600,
                color: '#584144',
                marginBottom: '0.5rem',
                marginLeft: '0.25rem',
              }}
            >
              Program One
            </label>
            <div style={{ position: 'relative' }}>
              <select style={selectStyle} aria-label="Program one">
                <option>AI Professional Developer</option>
                <option>Cybersecurity Specialist</option>
                <option>Data Science Analyst</option>
                <option>Cloud Architect</option>
              </select>
              <span
                className="material-symbols-outlined"
                style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#584144',
                  pointerEvents: 'none',
                  fontSize: '1.25rem',
                }}
               aria-hidden="true">
                expand_more
              </span>
            </div>
          </div>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: 600,
                color: '#584144',
                marginBottom: '0.5rem',
                marginLeft: '0.25rem',
              }}
            >
              Program Two
            </label>
            <div style={{ position: 'relative' }}>
              <select style={selectStyle} aria-label="Program two">
                <option>Cybersecurity Specialist</option>
                <option>AI Professional Developer</option>
                <option>Data Science Analyst</option>
                <option>Cloud Architect</option>
              </select>
              <span
                className="material-symbols-outlined"
                style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#584144',
                  pointerEvents: 'none',
                  fontSize: '1.25rem',
                }}
               aria-hidden="true">
                expand_more
              </span>
            </div>
          </div>
        </section>

        <section
          style={{
            background: '#f6f3f2',
            borderRadius: '1rem',
            padding: '1rem',
            marginBottom: '2.5rem',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginBottom: '1.5rem',
              paddingTop: '0.5rem',
            }}
          >
            <div style={{ textAlign: 'center', padding: '0 0.5rem' }}>
              <div style={{ height: '4px', background: 'rgba(173,44,77,0.2)', borderRadius: '9999px', marginBottom: '0.75rem' }} />
              <span
                style={{
                  display: 'block',
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#ad2c4d',
                  marginBottom: '0.25rem',
                }}
              >
                Path A
              </span>
              <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, lineHeight: 1.3 }}>IT Support</span>
            </div>
            <div style={{ textAlign: 'center', padding: '0 0.5rem' }}>
              <div style={{ height: '4px', background: 'rgba(255,187,0,0.3)', borderRadius: '9999px', marginBottom: '0.75rem' }} />
              <span
                style={{
                  display: 'block',
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#7b5800',
                  marginBottom: '0.25rem',
                }}
              >
                Path B
              </span>
              <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, lineHeight: 1.3 }}>Cybersecurity</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {rows.map((row) => (
              <div key={row.label} style={{ borderTop: '1px solid rgba(222,191,194,0.1)', paddingTop: '1rem' }}>
                <span
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: 'rgba(88,65,68,0.6)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em',
                    marginBottom: '0.5rem',
                  }}
                >
                  {row.label}
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', textAlign: 'center' }}>
                  <p
                    style={{
                      fontSize: '0.875rem',
                      margin: 0,
                      fontWeight: row.highlight ? 700 : 500,
                      color: row.highlight ? '#8c0f37' : '#1c1b1b',
                    }}
                  >
                    {row.a}
                  </p>
                  <p
                    style={{
                      fontSize: '0.875rem',
                      margin: 0,
                      fontWeight: row.highlight ? 700 : 500,
                      color: row.highlight ? '#8c0f37' : '#1c1b1b',
                    }}
                  >
                    {row.b}
                  </p>
                </div>
              </div>
            ))}

            <div style={{ borderTop: '1px solid rgba(222,191,194,0.1)', paddingTop: '1rem', paddingBottom: '0.5rem' }}>
              <span
                style={{
                  display: 'block',
                  textAlign: 'center',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: 'rgba(88,65,68,0.6)',
                  textTransform: 'uppercase',
                  marginBottom: '0.5rem',
                }}
              >
                Difficulty
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem' }}>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{ width: '8px', height: '8px', borderRadius: '9999px', background: '#ffbb00', display: 'block' }}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '9999px', background: '#ffbb00', display: 'block' }} />
                  <span style={{ width: '8px', height: '8px', borderRadius: '9999px', background: '#ffbb00', display: 'block' }} />
                  <span style={{ width: '8px', height: '8px', borderRadius: '9999px', background: '#e5e2e1', display: 'block' }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <Link
          href="/apply"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '3.5rem',
            borderRadius: '0.75rem',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: '#fff',
            textDecoration: 'none',
            background: 'linear-gradient(to right, #8c0f37, #ad2c4d)',
            boxShadow: '0 10px 25px -5px rgba(140,15,55,0.25)',
            fontSize: '0.9375rem',
          }}
        >
          Apply to Best Match
        </Link>
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
