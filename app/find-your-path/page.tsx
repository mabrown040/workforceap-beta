import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import FindYourPathClient from './FindYourPathClient';
import MobileBottomNav from '@/components/MobileBottomNav';
import ExperimentedCtaLink from '@/components/analytics/ExperimentedCtaLink';

export const metadata: Metadata = buildPageMetadata({
  title: 'Find Your Career Path — Program Quiz',
  description:
    'Take our 2-minute quiz to discover which WorkforceAP program best fits your interests, experience, and goals. No-cost training for qualifying members.',
  path: '/find-your-path',
});

export default function FindYourPathPage() {
  return (
    <div
      className="inner-page marketing-stack marketing-stack--enter"
      style={{ background: 'var(--color-background-dark)', color: 'var(--color-on-surface)' }}
    >
      {/* Desktop layout — hidden on mobile */}
      <div className="marketing-desktop">

      {/* Hero */}
      <section style={{
        padding: '5rem 2rem 3rem',
        maxWidth: '1400px',
        margin: '0 auto',
      }}>
        <div style={{ maxWidth: '720px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-full, 50px)',
            background: 'rgba(173,44,77,0.15)', border: '1px solid rgba(173,44,77,0.3)',
            color: 'var(--color-accent)', fontSize: '0.7rem', fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '1rem',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }} aria-hidden="true">explore</span>
            Academic Navigator
          </span>
          <h1 className="text-display-lg" style={{ marginBottom: '1rem' }}>Find Your Path</h1>
          <p style={{
            color: 'var(--color-on-surface-variant)', fontSize: '1.125rem', lineHeight: 1.7, marginBottom: '1.5rem',
          }}>
            Five questions, three ranked matches, plain-English why — tied to the same salary bands and program pages you will see
            elsewhere. If computers feel intimidating, we prioritize the Digital Literacy track first so you build confidence before heavier tech programs. Programs are available nationwide.
          </p>
          <ExperimentedCtaLink
            experiment="find_path_apply_cta"
            variants={[
              { id: 'control', label: 'Ready now? Start your application', className: 'btn btn-primary', href: '/apply' },
              { id: 'urgency', label: 'Apply now (10 minutes)', className: 'btn btn-primary', href: '/apply' },
            ]}
          />
        </div>
      </section>

      {/* Decision Path Tabs + Quiz */}
      <section style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem 4rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 300px',
          gap: '2.5rem',
          alignItems: 'start',
        }}>
          {/* Main quiz area */}
          <div>
            <FindYourPathClient idPrefix="fyp-desktop" />
          </div>

          {/* Desktop sidebar */}
          <aside style={{
            display: 'flex', flexDirection: 'column', gap: '1.5rem',
            position: 'sticky', top: 'calc(var(--main-nav-layout-height) + 1rem)',
          }}>
            {/* Why this matters tip card */}
            <div style={{
              background: 'var(--surface-container)', borderRadius: 'var(--radius-xl)',
              padding: '1.5rem', border: '1px solid var(--surface-container-highest)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: 'var(--color-gold)' }} aria-hidden="true">tips_and_updates</span>
                <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Why this matters</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
                Your answers help us match you with a program that fits your timeline, comfort level, and career goals. The quiz takes about 2 minutes and your results are saved locally.
              </p>
            </div>

            {/* Archive image card */}
            <div style={{
              borderRadius: 'var(--radius-xl)', overflow: 'hidden',
              position: 'relative', height: '200px',
            }}>
              <img
                src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=600&q=70"
                alt="Students collaborating"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, transparent 40%, rgba(18,20,22,0.85) 100%)',
              }} />
              <span style={{
                position: 'absolute', bottom: '1rem', left: '1rem',
                color: 'white', fontSize: '0.8rem', fontWeight: 600,
              }}>
                WorkforceAP Program
              </span>
            </div>
          </aside>
        </div>
      </section>

      </div>{/* end hidden md:block desktop wrapper */}

      {/* ══════════════════════════════════════════════
          MOBILE LAYOUT ≤640px — interactive quiz
          ══════════════════════════════════════════════ */}
      <div className="marketing-mobile marketing-mobile-pb-for-bottom-nav" style={{ background: 'var(--color-surface)', minHeight: '100vh' }}>
        {/* Mobile Hero */}
        <div style={{ padding: '4.5rem 1.25rem 1rem' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
            padding: '0.25rem 0.6rem', borderRadius: '9999px',
            background: 'rgba(173,44,77,0.12)', color: '#ad2c4d',
            fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase', marginBottom: '0.5rem',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '0.75rem' }} aria-hidden="true">explore</span>
            Academic Navigator
          </span>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-on-surface)', marginBottom: '0.375rem' }}>Find Your Path</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5, marginBottom: 0 }}>
            Five questions, three ranked matches — takes about 2 minutes.
          </p>
        </div>
        {/* Quiz */}
        <div style={{ padding: '0 1.25rem 2rem' }}>
          <FindYourPathClient idPrefix="fyp-mobile" />
        </div>
      </div>

      <MobileBottomNav />
      <Footer />
    </div>
  );
}
