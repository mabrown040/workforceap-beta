import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import FindYourPathClient from './FindYourPathClient';
import MobileBottomNav from '@/components/MobileBottomNav';
import ExperimentedCtaLink from '@/components/analytics/ExperimentedCtaLink';

export const metadata: Metadata = buildPageMetadata({
  title: 'Find Your Path — Career Quiz',
  description:
    'Take our 2-minute quiz to discover which WorkforceAP program best fits your interests, experience, and goals. No-cost training for members.',
  path: '/find-your-path',
});

export default function FindYourPathPage() {
  return (
    <div className="inner-page" style={{ background: 'var(--color-background-dark)', color: 'var(--color-on-surface)' }}>
      {/* Desktop layout — hidden on mobile */}
      <div className="wa-hidden wa-md:block">

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
            <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>explore</span>
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
            <FindYourPathClient />
          </div>

          {/* Desktop sidebar */}
          <aside style={{
            display: 'flex', flexDirection: 'column', gap: '1.5rem',
            position: 'sticky', top: '2rem',
          }}>
            {/* Why this matters tip card */}
            <div style={{
              background: 'var(--surface-container)', borderRadius: 'var(--radius-xl)',
              padding: '1.5rem', border: '1px solid var(--surface-container-highest)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: 'var(--color-gold)' }}>tips_and_updates</span>
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
                style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(30%) brightness(0.8)' }}
              />
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, transparent 40%, rgba(18,20,22,0.85) 100%)',
              }} />
              <span style={{
                position: 'absolute', bottom: '1rem', left: '1rem',
                color: 'white', fontSize: '0.8rem', fontWeight: 600,
              }}>
                WAP Austin Campus
              </span>
            </div>
          </aside>
        </div>
      </section>

      </div>{/* end hidden md:block desktop wrapper */}

      {/* ══════════════════════════════════════════════
          MOBILE LAYOUT ≤640px — Stitch-aligned
          ══════════════════════════════════════════════ */}
      <div className="wa-md:hidden" style={{ background: '#fcf9f8', minHeight: '100vh', paddingBottom: '6rem' }}>
        {/* Clean mobile header */}
        <header className="sticky top-0 w-full z-50 flex justify-between items-center px-5 py-4" style={{ background: 'rgba(252,249,248,0.88)', backdropFilter: 'blur(12px)', boxShadow: '0 24px 40px rgba(28,27,27,0.04)' }}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined" style={{ color: '#ad2c4d' }}>close</span>
            <span className="text-lg font-black tracking-tight" style={{ color: '#ad2c4d' }}>Career Path Quiz</span>
          </div>
          <span className="material-symbols-outlined" style={{ color: '#584144' }}>more_vert</span>
        </header>

        <main className="flex-1 w-full px-5 pt-7 pb-28">
          {/* Progress Section */}
          <section className="mb-9">
            <div className="flex justify-between items-end mb-2">
              <h2 className="font-bold text-3xl tracking-tighter" style={{ color: '#1c1b1b' }}>Find Your Path</h2>
              <span className="text-xs font-bold uppercase tracking-[0.05em]" style={{ color: '#584144' }}>1 of 5</span>
            </div>
            <p className="text-sm mb-5" style={{ color: '#584144' }}>5 questions · 2 minutes</p>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#e5e2e1' }}>
              <div className="h-full w-[20%] rounded-full" style={{ background: '#ad2c4d' }} />
            </div>
          </section>

          {/* Question Card */}
          <div className="rounded-xl p-7 mb-7 relative overflow-hidden" style={{ background: '#fff', boxShadow: '0 24px 40px rgba(28,27,27,0.04)' }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16" style={{ background: 'rgba(140,15,55,0.05)' }} />
            <h3 className="font-bold text-xl leading-snug relative z-10" style={{ color: '#1c1b1b' }}>What interests you most?</h3>
          </div>

          {/* Full-Width Answer Options */}
          <div className="flex flex-col gap-3 mb-8">
            {[
              { icon: 'computer', label: 'Working with computers and technology', sub: 'Technology', active: true },
              { icon: 'health_and_safety', label: 'Healthcare & Science', sub: 'Life Sciences', active: false },
              { icon: 'construction', label: 'Advanced Manufacturing', sub: 'Industrial', active: false },
              { icon: 'groups', label: 'Business & People', sub: 'Corporate', active: false },
            ].map(({ icon, label, sub, active }) => (
              <button key={icon} className="w-full flex items-center gap-4 p-5 rounded-xl text-left transition-all active:scale-95" style={active ? { background: 'rgba(255,217,221,0.5)', border: '2px solid #ad2c4d' } : { background: '#f6f3f2', border: '1px solid transparent' }}>
                <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={active ? { background: '#ad2c4d', color: '#fff' } : { background: '#e5e2e1', color: '#584144' }}>
                  <span className="material-symbols-outlined text-2xl">{icon}</span>
                </div>
                <div>
                  <span className="block font-semibold" style={{ color: active ? '#8c0f37' : '#1c1b1b' }}>{label}</span>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#8b7073' }}>{sub}</span>
                </div>
              </button>
            ))}
          </div>
        </main>

        {/* Back / Continue nav */}
        <nav className="fixed bottom-0 left-0 w-full flex justify-between items-center px-7 py-5 pb-9 z-50 rounded-t-xl" style={{ background: 'rgba(252,249,248,0.94)', backdropFilter: 'blur(12px)', boxShadow: '0 -4px 24px rgba(28,27,27,0.04)' }}>
          <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.05em] px-5 py-2" style={{ color: 'rgba(140,15,55,0.7)' }}>
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back
          </button>
          <button className="flex items-center gap-2 px-8 py-3 rounded-lg text-xs font-bold uppercase tracking-[0.05em] shadow-lg text-white" style={{ background: '#8c0f37' }}>
            Continue
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </nav>
      </div>

      <MobileBottomNav />
      <Footer />
    </div>
  );
}
