import type { Metadata } from 'next';
import LocalizedLink from '@/components/LocalizedLink';
import Image from 'next/image';
import { buildPageMetadataAsync } from '@/app/seo';
import FindYourPathClient from './FindYourPathClient';
import { getProgramBySlug } from '@/lib/content/programs';
import { getProgramExtra } from '@/lib/content/programExtras';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Find Your Path — Program Quiz',
  description:
    'Take our quick 3-question quiz to discover which WorkforceAP programs best fit your interests, experience, and goals — a starting point for conversations with your advisor. No-cost training for qualifying members.',
  path: '/find-your-path',
});
}

const fallbackProgramSlugs = [
  'digital-literacy-empowerment-class',
  'it-support-professional-certificate-ibm',
  'project-management-professional-certificate-microsoft',
] as const;

export default function FindYourPathPage() {
  const fallbackPrograms = fallbackProgramSlugs
    .map((slug) => getProgramBySlug(slug))
    .filter((program) => Boolean(program))
    .map((program) => ({
      program: program!,
      extra: getProgramExtra(program!.slug),
    }));

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
          <span className="marketing-pill-chip-accent" style={{ marginBottom: '1rem' }}>
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
            You don&rsquo;t need to have it all figured out — that&rsquo;s what this is for. Just answer honestly and we&rsquo;ll point you toward the right first step.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            <a href="#find-your-path-quiz" className="btn btn-primary">
              Take the 2-minute, 3-question quiz
            </a>
            <LocalizedLink href="/apply" className="btn btn-outline">
              Already know your path? Apply now
            </LocalizedLink>
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
            <div
              style={{
                marginBottom: '1.5rem',
                padding: '1.25rem 1.5rem',
                borderRadius: 'var(--radius-xl)',
                background: 'var(--surface-container)',
                border: '1px solid var(--surface-container-highest)',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <p className="text-label-upper" style={{ color: 'var(--color-accent)', margin: '0 0 0.4rem' }}>
                    Quick-start options
                  </p>
                  <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Not sure where to begin? Start with a common fit.</h2>
                </div>
                <LocalizedLink href="/programs" style={{ color: 'var(--color-accent)', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: '4px' }}>
                  Browse the full catalog
                </LocalizedLink>
              </div>
              <p style={{ margin: '0 0 1rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
                You can still move forward without the quiz. These are common starting points for beginners, job-seekers who need a faster path, and members exploring business-facing work.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.875rem' }}>
                {fallbackPrograms.map(({ program, extra }) => (
                  <div
                    key={program.slug}
                    style={{
                      padding: '1rem',
                      borderRadius: '0.875rem',
                      background: 'var(--surface-container-low)',
                      border: '1px solid var(--outline-variant)',
                    }}
                  >
                    <p className="text-label-upper" style={{ color: 'var(--color-accent)', margin: '0 0 0.35rem' }}>
                      {program.categoryLabel}
                    </p>
                    <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>{program.title}</h3>
                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.55 }}>
                      {extra?.bestFor ?? `${program.duration} program with practical training and a clear next-step path.`}
                    </p>
                    <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
                      {program.duration}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <LocalizedLink href={`/programs/${program.slug}`} style={{ color: 'var(--color-accent)', fontWeight: 700, textDecoration: 'none' }}>
                        View details →
                      </LocalizedLink>
                      <LocalizedLink href={`/apply?program=${program.slug}`} style={{ color: 'var(--color-on-surface)', fontWeight: 700, textDecoration: 'none' }}>
                        Apply
                      </LocalizedLink>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
                <span className="material-symbols-outlined marketing-chip-text--gold" style={{ fontSize: '1.25rem' }} aria-hidden="true">tips_and_updates</span>
                <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Why this matters</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
                Your answers help us suggest programs that fit your timeline, comfort level, and career goals — a starting point for the conversation, not a final decision. Three short questions; your results stay saved locally.
              </p>
            </div>

            {/* Archive image card */}
            <div style={{
              borderRadius: 'var(--radius-xl)', overflow: 'hidden',
              position: 'relative', height: '200px',
            }}>
              <Image
                src="/images/hero-people.webp"
                alt="Members collaborating on career training"
                fill
                sizes="(min-width: 1024px) 280px, 100vw"
                style={{ objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, transparent 50%, rgba(18,20,22,0.7) 100%)',
                pointerEvents: 'none',
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
