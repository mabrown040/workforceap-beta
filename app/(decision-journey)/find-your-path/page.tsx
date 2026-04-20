import type { Metadata } from 'next';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import FindYourPathClient from './FindYourPathClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Find Your Path — Program Quiz',
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
      {/* Hero */}
      <section style={{
        padding: 'clamp(2rem, 6vw, 5rem) 1.25rem 2rem',
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
            Career Path Quiz
          </span>
          <h1 className="text-display-lg" style={{ marginBottom: '1rem' }}>Find Your Path</h1>
          <p style={{
            color: 'var(--color-on-surface-variant)', fontSize: '1.125rem', lineHeight: 1.7, marginBottom: '0.75rem',
          }}>
            Not sure where to start? Answer a few quick questions and get program recommendations matched to your interests, experience, and goals — no guesswork required.
          </p>
          <p style={{
            color: 'var(--color-on-surface-variant)', fontSize: '1rem', lineHeight: 1.65, marginBottom: '1.5rem', fontStyle: 'italic',
          }}>
            You don&apos;t need to have it all figured out — that&apos;s what this is for. Just answer honestly and we&apos;ll point you toward the right first step.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            <a href="#find-your-path-quiz" className="btn btn-primary">
              Take the 2-minute quiz
            </a>
            <Link href="/apply" className="btn btn-outline">
              Already know your path? Apply now
            </Link>
          </div>
        </div>
      </section>

      {/* Decision Path Tabs + Quiz */}
      <section id="find-your-path-quiz" style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1.25rem 4rem' }}>
        <div className="find-path-layout" style={{
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
                src="/images/hero-people.jpg"
                alt="Members collaborating on career training"
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

      <style>{`
        @media (max-width: 900px) {
          .find-path-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
