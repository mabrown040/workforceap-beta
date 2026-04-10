import Link from 'next/link';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import ShareButtons from '@/components/apply/ShareButtons';

export type ConfirmationStep = {
  num: string;
  title: string;
  desc: string;
};

export default function ApplyConfirmationMobile({ steps }: { steps: ConfirmationStep[] }) {
  return (
    <div className="marketing-mobile marketing-mobile-pb-for-bottom-nav" style={{ background: 'var(--color-surface)', color: 'var(--color-on-surface)', minHeight: '100vh' }}>
      <main
        style={{
          paddingTop: '1.25rem',
          paddingLeft: '1.5rem',
          paddingRight: '1.5rem',
          maxWidth: '390px',
          margin: '0 auto',
          minHeight: '100vh',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link
              href="/apply"
              style={{
                color: '#ad2c4d',
                padding: '0.5rem',
                marginLeft: '-0.5rem',
                borderRadius: '9999px',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
              }}
              aria-label="Back to apply"
            >
              <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
            </Link>
            <p style={{ fontWeight: 900, letterSpacing: '-0.03em', color: '#ad2c4d', fontSize: '1.125rem', margin: 0 }}>
              Apply
            </p>
          </div>
          <span style={{ color: '#584144', fontWeight: 700, letterSpacing: '-0.02em', fontSize: '1rem' }}>Success</span>
        </div>
        <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '3rem' }}>
          <div
            style={{
              width: '6rem',
              height: '6rem',
              borderRadius: '9999px',
              background: 'linear-gradient(135deg, #8c0f37, #ad2c4d)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem',
              boxShadow: '0 20px 40px -12px rgba(140,15,55,0.35)',
            }}
          >
            <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '3rem', '--ms-wght': 600 }}>
              check
            </span>
          </div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 900, color: 'var(--color-on-surface)', letterSpacing: '-0.02em', margin: '0 0 0.75rem' }}>
            Application Received!
          </h1>
          <p style={{ color: '#584144', fontSize: '1rem', lineHeight: 1.6, margin: 0, maxWidth: '280px' }}>
            We will reach out within 3–5 business days to confirm next steps.
          </p>
        </section>

        <section
          style={{
            background: '#f6f3f2',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            marginBottom: '2rem',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '8rem',
              height: '8rem',
              background: 'rgba(140,15,55,0.05)',
              borderRadius: '9999px',
              marginRight: '-4rem',
              marginTop: '-4rem',
              filter: 'blur(24px)',
            }}
          />
          <h2 style={{ fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#8c0f37', margin: '0 0 1.5rem' }}>
            What happens next
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {steps.map((step) => (
              <div key={step.num} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div
                  style={{
                    flexShrink: 0,
                    width: '2rem',
                    height: '2rem',
                    borderRadius: '0.5rem',
                    background: '#e5e2e1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#8c0f37',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                  }}
                >
                  {step.num}
                </div>
                <div style={{ paddingTop: '2px' }}>
                  <p style={{ color: 'var(--color-on-surface)', fontWeight: 600, fontSize: '0.875rem', margin: 0 }}>{step.title}</p>
                  <p style={{ color: '#584144', fontSize: '0.75rem', margin: '0.25rem 0 0' }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ textAlign: 'center' }}>
            <p
              style={{
                fontSize: '0.75rem',
                fontWeight: 500,
                color: '#584144',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#7b5800', '--ms-fill': 1 }}>
                stars
              </span>
              Join 2,000+ people who trained with us.
            </p>
          </div>
          <Link
            href="/programs"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '1rem',
              background: 'linear-gradient(to right, #8c0f37, #ad2c4d)',
              color: '#fff',
              borderRadius: '0.75rem',
              fontWeight: 700,
              fontSize: '1rem',
              textDecoration: 'none',
              boxShadow: '0 10px 25px -5px rgba(140,15,55,0.2)',
            }}
          >
            Explore Programs while you wait
          </Link>
        </section>

        <section style={{ marginTop: '2.5rem' }}>
          <p
            style={{
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#584144',
              textAlign: 'center',
              margin: '0 0 1rem',
            }}
          >
            Spread the word
          </p>
          <ShareButtons />
        </section>

        <div style={{ marginTop: '2rem', background: '#f0edec', borderRadius: '0.75rem', padding: '1rem' }}>
          <p style={{ fontSize: '0.875rem', textAlign: 'center', color: '#584144', margin: 0 }}>
            <strong style={{ color: 'var(--color-on-surface)' }}>Questions?</strong>{' '}
            <a href="tel:+15127771808" style={{ color: '#8c0f37', fontWeight: 600, textDecoration: 'none' }}>
              (512) 777-1808
            </a>
            {' or '}
            <a href="mailto:info@workforceap.org" style={{ color: '#8c0f37', fontWeight: 600, textDecoration: 'none' }}>
              email us
            </a>
          </p>
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
