import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import ProgramsContent from './ProgramsContent';
import ProgramsDecisionJourneyNav from '@/components/ProgramsDecisionJourneyNav';
import ExperimentedCtaLink from '@/components/analytics/ExperimentedCtaLink';
import { WORKFORCEAP_PROGRAM_CATALOG_SIZE } from '@/lib/content/programs';

export const metadata: Metadata = buildPageMetadata({
  title: 'Free Career Training Programs — Nationwide Certifications',
  description: `Explore ${WORKFORCEAP_PROGRAM_CATALOG_SIZE} free career training programs with industry certifications from IBM, Google, AWS, Microsoft, and CompTIA. No-cost certifications for qualifying residents nationwide.`,
  path: '/programs',
});

export default function ProgramsPage() {
  return (
    <div className="inner-page programs-page">

      {/* ══════════════════════════════════════════════
          MOBILE LAYOUT ≤640px — Stitch-aligned
          ══════════════════════════════════════════════ */}
      <div className="md:wa-hidden" style={{ background: '#fcf9f8', minHeight: '100vh', paddingBottom: '8rem' }}>
        {/* Top App Bar */}
        <header className="fixed top-0 w-full flex justify-between items-center px-5 h-16 z-50" style={{ background: 'rgba(252,249,248,0.88)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(222,191,194,0.2)' }}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined" style={{ color: '#8c0f37' }}>menu</span>
            <span className="font-black tracking-tighter text-lg" style={{ color: '#ad2c4d' }}>WorkforceAP</span>
          </div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#e5e2e1' }}>
            <span className="material-symbols-outlined text-sm" style={{ color: '#584144' }}>person</span>
          </div>
        </header>

        <main className="pt-20 px-5">
          {/* Editorial Hero Title */}
          <div className="mb-7 mt-3">
            <h1 className="text-4xl font-black tracking-tighter leading-none" style={{ color: '#1c1b1b' }}>
              Master Your <br />
              <span className="italic" style={{ color: '#ad2c4d' }}>Future</span>
            </h1>
            <div className="h-1 w-12 mt-3 rounded-full" style={{ background: '#ffbb00' }} />
          </div>

          {/* Horizontal Filter Chips */}
          <div className="flex overflow-x-auto gap-2 mb-7 -mx-5 px-5" style={{ scrollbarWidth: 'none' }}>
            {['All Programs', 'AI & Software Dev', 'Cloud & Data', 'IT & Cybersecurity', 'Business', 'Healthcare'].map((label, i) => (
              <button key={label} className="flex-none px-5 py-2 rounded-full text-sm font-semibold tracking-wide" style={i === 0 ? { background: '#ad2c4d', color: '#fff' } : { background: '#f6f3f2', color: '#584144' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Featured Digital Literacy Card */}
          <section className="mb-9">
            <div className="relative overflow-hidden rounded-xl p-5 text-white flex flex-col justify-between" style={{ background: 'linear-gradient(135deg, #8c0f37, #ad2c4d)', minHeight: 200 }}>
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16" style={{ background: 'rgba(255,255,255,0.05)', filter: 'blur(20px)' }} />
              <div>
                <span className="inline-block px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest mb-3" style={{ background: '#ffbb00', color: '#1c1b1b' }}>Start Here</span>
                <h2 className="text-2xl font-bold tracking-tight">Digital Literacy</h2>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,203,209,0.9)' }}>Essential skills for the modern workforce</p>
              </div>
              <div className="flex items-center justify-between mt-5">
                <div className="flex gap-5">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase opacity-70 font-medium">Duration</span>
                    <span className="text-sm font-bold">4 weeks</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase opacity-70 font-medium">Cost</span>
                    <span className="text-sm font-bold">$0 cost</span>
                  </div>
                </div>
                <Link href="/programs/digital-literacy" className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#fff', color: '#8c0f37' }}>
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
              </div>
            </div>
          </section>

          {/* 2-Column Program Grid */}
          <div className="grid grid-cols-2 gap-4 mb-10">
            {[
              { cat: 'IT & Cybersecurity', title: 'Cybersecurity Analyst', dur: '12–24 Weeks', slug: 'cybersecurity-analyst' },
              { cat: 'AI & Software Dev', title: 'Python for Data Science', dur: '16 Weeks', slug: 'python-for-data-science' },
              { cat: 'Cloud & Data', title: 'AWS Cloud Practitioner', dur: '6 Weeks', slug: 'aws-cloud-practitioner' },
              { cat: 'Business', title: 'Agile Project Management', dur: '12 Weeks', slug: 'agile-project-management' },
              { cat: 'AI & Software Dev', title: 'Full-Stack JavaScript', dur: '16 Weeks', slug: 'full-stack-js' },
              { cat: 'Cloud & Data', title: 'Data Analytics', dur: '10 Weeks', slug: 'data-analytics-professional-certificate-google' },
            ].map(({ cat, title, dur, slug }) => (
              <Link href={`/programs/${slug}`} key={title} className="rounded-xl p-4 flex flex-col justify-between border" style={{ background: '#fff', borderColor: 'rgba(222,191,194,0.15)', minHeight: 192, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider block mb-1" style={{ color: '#7b5800' }}>{cat}</span>
                  <h3 className="text-sm font-bold leading-tight" style={{ color: '#1c1b1b' }}>{title}</h3>
                </div>
                <div className="mt-auto">
                  <p className="text-[10px] font-medium mb-3" style={{ color: '#584144' }}>{dur}</p>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: '#ffd9dd', color: '#8c0f37' }}>$0</span>
                    <span className="material-symbols-outlined text-lg" style={{ color: '#8c0f37' }}>arrow_outward</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* See all link */}
          <div className="text-center mt-4 mb-2">
            <Link href="/programs#all" className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: '#8c0f37' }}>
              See all programs
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </Link>
          </div>
        </main>

        {/* Sticky "Can't decide?" bottom bar */}
        <div className="fixed z-40 px-4" style={{ bottom: '5rem', left: 0, right: 0 }}>
          <Link href="/find-your-path" className="flex items-center justify-between rounded-xl p-4 shadow-2xl" style={{ background: '#1c1b1b', color: '#fff' }}>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined" style={{ color: '#ffbb00' }}>psychology</span>
              <span className="text-sm font-medium tracking-tight">Can&apos;t decide? Take 2-min quiz</span>
            </div>
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          DESKTOP LAYOUT ≥641px
          ══════════════════════════════════════════════ */}
      <div className="wa-hidden md:wa-block">

      {/* ── Hero Section ── */}
      <section className="content-section" style={{ paddingBottom: 0 }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div className="editorial-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem', alignItems: 'center' }}>
            {/* Left — 7 col */}
            <div className="programs-hero-left" style={{ gridColumn: '1 / 8' }}>
              <span
                className="text-label-upper"
                style={{ color: 'var(--color-gold)', marginBottom: '1rem', display: 'block' }}
              >
                Curated Excellence
              </span>
              <h1 className="text-display-lg" style={{ color: 'var(--color-on-surface)', marginBottom: '1.5rem' }}>
                Industry-Recognized{' '}
                <span style={{ color: 'var(--color-accent)', fontStyle: 'italic' }}>Certifications.</span>
              </h1>
              <p
                style={{
                  fontSize: '1.125rem',
                  color: 'var(--color-on-surface-variant)',
                  maxWidth: '42rem',
                  lineHeight: 1.7,
                }}
              >
                Bridging the education-to-career gap with {WORKFORCEAP_PROGRAM_CATALOG_SIZE} no-cost
                certification programs built alongside{' '}
                <strong>IBM</strong>, <strong>Google</strong>, and <strong>Amazon</strong>.
                Use fit, timeline, and readiness&mdash;not just the title&mdash;to choose your track.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '2rem', alignItems: 'center' }}>
                <ExperimentedCtaLink
                  experiment="programs_primary_cta"
                  variants={[
                    { id: 'control', label: 'Find Your Career \u2192', className: 'btn btn-primary', href: '/find-your-path' },
                    { id: 'quiz_first', label: 'Take 2-Min Quiz \u2192', className: 'btn btn-primary', href: '/find-your-path' },
                  ]}
                />
                <Link
                  href="/program-comparison"
                  style={{
                    color: 'var(--color-accent)',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    textDecoration: 'underline',
                    textUnderlineOffset: '4px',
                  }}
                >
                  Or compare programs side-by-side
                </Link>
              </div>
            </div>

            {/* Right — 5 col hero image */}
            <div className="programs-hero-right" style={{ gridColumn: '8 / -1', position: 'relative' }}>
              <div
                style={{
                  borderRadius: 'var(--radius-xl)',
                  overflow: 'hidden',
                  position: 'relative',
                  aspectRatio: '4 / 5',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
                }}
              >
                <Image
                  src="/images/hero-people.jpg"
                  alt="Professionals collaborating on certification programs"
                  fill
                  style={{ objectFit: 'cover' }}
                  priority
                />
                {/* Gradient overlay */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 60%)',
                    borderRadius: 'var(--radius-xl)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Decision Journey Nav ── */}
      <section className="content-section" style={{ paddingTop: '0.5rem', paddingBottom: 0 }}>
        <div className="container">
          <ProgramsDecisionJourneyNav current="programs" />
        </div>
      </section>

      {/* ── Program Cards (dynamic, from ProgramsContent) ── */}
      <ProgramsContent />

      {/* ── Journey Section — 4-step flow ── */}
      <section className="bg-surface-container-low" style={{ padding: '6rem 0' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 className="text-display-sm" style={{ color: 'var(--color-on-surface)', marginBottom: '1rem' }}>
              The Workforce Advancement Journey
            </h2>
            <p style={{ color: 'var(--color-on-surface-variant)', maxWidth: '32rem', margin: '0 auto' }}>
              From enrollment to employment, we support every step of your professional evolution.
            </p>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '2rem',
              position: 'relative',
            }}
            className="programs-journey-grid"
          >
            {[
              { num: '01', icon: 'assessment', title: 'Assessment', desc: 'Discover your strengths through our career path mapping tool.' },
              { num: '02', icon: 'workspace_premium', title: 'Certification', desc: 'Intensive, self-paced or cohort-based training with industry mentors.' },
              { num: '03', icon: 'trending_up', title: 'Career Readiness', desc: 'Resume workshops, mock interviews, and professional brand building.' },
              { num: '04', icon: 'handshake', title: 'Placement', desc: 'Direct connection to our network of 150+ employer partners.' },
            ].map((step) => (
              <div key={step.num} style={{ position: 'relative', textAlign: 'left', padding: '2rem 1.5rem' }}>
                <div
                  style={{
                    fontSize: '5rem',
                    fontWeight: 900,
                    color: 'var(--color-on-surface)',
                    opacity: 0.06,
                    position: 'absolute',
                    top: '0',
                    left: '1rem',
                    userSelect: 'none',
                    lineHeight: 1,
                  }}
                >
                  {step.num}
                </div>
                <div style={{ position: 'relative', zIndex: 1, paddingTop: '1.5rem' }}>
                  <span
                    className="material-symbols-outlined"
                    style={{
                      color: 'var(--color-accent)',
                      fontSize: '1.75rem',
                      marginBottom: '0.75rem',
                      display: 'block',
                      fontVariationSettings: "'FILL' 1",
                    }}
                  >
                    {step.icon}
                  </span>
                  <h4 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.5rem', color: 'var(--color-accent)' }}>
                    {step.title}
                  </h4>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="content-section" style={{ padding: '5rem 1rem' }}>
        <div
          style={{
            maxWidth: 800,
            margin: '0 auto',
            background: 'var(--color-accent)',
            borderRadius: 'var(--radius-xl)',
            padding: '4rem 3rem',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <h2
            className="text-display-sm"
            style={{ color: '#fff', marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}
          >
            Your Next Step Starts Here
          </h2>
          <p
            style={{
              color: 'rgba(255,203,209,0.9)',
              fontSize: '1.125rem',
              marginBottom: '2.5rem',
              maxWidth: '36rem',
              margin: '0 auto 2.5rem',
              position: 'relative',
              zIndex: 1,
            }}
          >
            Training and job-placement support at no cost to eligible members — programs built
            with employers so you can move into work in your field.
          </p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              justifyContent: 'center',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Link
              href="/apply"
              style={{
                background: 'var(--color-gold)',
                color: '#1c1b1b',
                padding: '1rem 2rem',
                borderRadius: 'var(--radius-md)',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontSize: '0.875rem',
                textDecoration: 'none',
              }}
            >
              Start Application
            </Link>
            <Link
              href="/contact"
              style={{
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff',
                padding: '1rem 2rem',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '0.875rem',
                textDecoration: 'none',
              }}
            >
              Talk to an Advisor
            </Link>
          </div>
        </div>
      </section>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 1023px) {
          .programs-hero-left { grid-column: 1 / -1 !important; }
          .programs-hero-right { grid-column: 1 / -1 !important; }
          .programs-hero-right > div { aspect-ratio: 16 / 9 !important; max-height: 320px; }
          .programs-journey-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .programs-journey-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      </div>{/* end desktop wrapper */}

      <MobileBottomNav />
      <Footer />
    </div>
  );
}
