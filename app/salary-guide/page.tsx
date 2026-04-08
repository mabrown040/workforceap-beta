import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import Footer from '@/components/Footer';
import ProgramsDecisionJourneyNav from '@/components/ProgramsDecisionJourneyNav';
import MobileBottomNav from '@/components/MobileBottomNav';
import { buildSalaryGuideRows, salaryGuideSummaryStats } from '@/lib/content/programSalaryOutcomes';
import SalaryTableWrapper from '@/components/portal/SalaryTableWrapper';

export const metadata: Metadata = buildPageMetadata({
  title: 'Salary Guide',
  description:
    'Program-by-program starting salary ranges (aligned with our /programs catalog). Understand fit, ramp, and realistic outcomes — not just the biggest number.',
  path: '/salary-guide',
});

const insights = [
  {
    icon: 'lightbulb',
    title: 'Higher ranges = deeper programs',
    desc: 'Cloud, AI engineering, and data science tracks sit at the top of the range for a reason — more depth, more commitment. Worth it if you will finish.',
  },
  {
    icon: 'check_circle',
    title: 'Entry ranges are not "lesser" options',
    desc: 'IT Support, Digital Literacy, and several CompTIA paths get you credentialed faster. Plenty of people stack from there. The win is momentum.',
  },
  {
    icon: 'trending_up',
    title: 'Career growth',
    desc: 'Most graduates see meaningful increases inside 2-3 years once they are in-role. Pick a track you can complete; we help match ramp to your life.',
  },
  {
    icon: 'location_on',
    title: 'Grounded in national data',
    desc: 'We anchor ranges to national hiring and cost-of-living data. Your offer depends on employer, location, proof, and fit.',
  },
  {
    icon: 'handshake',
    title: 'Job placement support',
    desc: 'Resume support, interview prep, employer intros. We do not disappear after you certify.',
  },
  {
    icon: 'payments',
    title: 'Total compensation',
    desc: 'Beyond base pay: bonuses, equity at some firms, benefits. Negotiate with the full picture.',
  },
];

const GROWTH_PHASES = [
  { num: '01', title: 'Foundation', desc: 'Complete your certification program and land your first role. Focus on demonstrating competence.' },
  { num: '02', title: 'Specialization', desc: 'Build depth in your niche. Stack additional certifications. Salary typically increases 15-25%.' },
  { num: '03', title: 'Leadership', desc: 'Move into senior IC or management roles. Mentor others. Compensation reflects your impact.' },
  { num: '04', title: 'Mastery', desc: 'Industry expert. Multiple career options. Many alumni return to WorkforceAP as mentors or instructors.' },
];

const MOBILE_SALARY_CARDS = [
  {
    category: 'AI & Software',
    program: 'AI Professional Developer',
    entry: '$85k – $105k',
    mid: '$115k – $145k',
    certs: ['IBM', 'Python', 'PyTorch'],
    borderColor: '#8c0f37',
  },
  {
    category: 'IT and Cyber',
    program: 'Cybersecurity Architect',
    entry: '$92k – $112k',
    mid: '$130k – $165k',
    certs: ['CompTIA Security+', 'CISSP'],
    borderColor: '#ffbb00',
  },
  {
    category: 'Cloud',
    program: 'AWS Solutions Associate',
    entry: '$78k – $95k',
    mid: '$110k – $140k',
    certs: ['AWS Certified', 'Terraform'],
    borderColor: '#ad2c4d',
  },
  {
    category: 'Business',
    program: 'Data Analytics Manager',
    entry: '$82k – $98k',
    mid: '$125k – $155k',
    certs: ['Tableau', 'SQL Expert'],
    borderColor: '#7b5800',
  },
];

export default function SalaryGuidePage() {
  const salaryRows = buildSalaryGuideRows();
  const guideStats = salaryGuideSummaryStats(salaryRows);

  return (
    <div
      className="inner-page salary-guide-page marketing-stack marketing-stack--enter"
      style={{ background: 'var(--color-background-dark)', color: 'var(--color-on-surface)' }}
    >

      {/* ===== MOBILE VIEW (≤640px) ===== */}
      <div className="marketing-mobile marketing-mobile-pb-for-bottom-nav" style={{ background: 'var(--color-surface)', color: 'var(--color-on-surface)', minHeight: '100vh' }}>
        <div style={{ paddingTop: '1.5rem', paddingLeft: '1.5rem', paddingRight: '1.5rem', maxWidth: '390px', margin: '0 auto' }}>
          {/* Hero */}
          <section style={{ marginTop: '2rem', marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--color-on-surface)', lineHeight: 1.1, marginBottom: '1rem' }}>Your Earning Potential.</h2>
            <p style={{ color: '#584144', fontSize: '1rem', lineHeight: 1.6 }}>
              Salary bands from Lightcast/BLS data for graduates of our programs.
            </p>
          </section>

          {/* Category Filter Chips */}
          <section style={{ marginBottom: '2rem', marginLeft: '-1.5rem', marginRight: '-1.5rem', paddingLeft: '1.5rem', paddingRight: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' } as React.CSSProperties}>
            {(
              [
                { label: 'All', primary: true },
                { label: 'IT and Cyber', primary: false },
                { label: 'AI and Software', primary: false },
                { label: 'Cloud', primary: false },
                { label: 'Business', primary: false },
                { label: 'Healthcare', primary: false },
              ] as const
            ).map(({ label, primary }) => (
              <Link
                key={label}
                href="/programs#program-catalog"
                style={{
                  flexShrink: 0,
                  padding: '0.625rem 1.25rem',
                  borderRadius: '9999px',
                  background: primary ? '#ad2c4d' : '#ebe7e7',
                  color: primary ? 'white' : '#584144',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}
              >
                {label}
              </Link>
            ))}
          </section>

          {/* Salary Card List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {MOBILE_SALARY_CARDS.slice(0, 3).map((card) => (
              <div key={card.program} style={{ background: 'white', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', borderLeft: `4px solid ${card.borderColor}` }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  <span style={{ display: 'inline-block', padding: '0.25rem 0.5rem', background: 'rgba(255,187,0,0.10)', color: '#6c4d00', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', width: 'fit-content', borderRadius: '0.25rem' }}>{card.category}</span>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-on-surface)', letterSpacing: '-0.02em', lineHeight: 1.3, margin: 0 }}>{card.program}</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ background: '#f6f3f2', padding: '0.75rem', borderRadius: '0.5rem' }}>
                    <span style={{ display: 'block', fontSize: '0.625rem', textTransform: 'uppercase', fontWeight: 700, color: '#584144', letterSpacing: '0.07em', marginBottom: '0.25rem' }}>Entry Level</span>
                    <p style={{ color: '#8c0f37', fontWeight: 700, fontSize: '1.125rem', lineHeight: 1, margin: 0 }}>{card.entry}</p>
                  </div>
                  <div style={{ background: 'rgba(140,15,55,0.05)', padding: '0.75rem', borderRadius: '0.5rem' }}>
                    <span style={{ display: 'block', fontSize: '0.625rem', textTransform: 'uppercase', fontWeight: 700, color: '#8c0f37', letterSpacing: '0.07em', marginBottom: '0.25rem' }}>Mid Level</span>
                    <p style={{ color: '#8c0f37', fontWeight: 900, fontSize: '1.125rem', lineHeight: 1, margin: 0 }}>{card.mid}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {card.certs.map((cert) => (
                    <span key={cert} style={{ background: '#e5e2e1', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 500, color: '#584144' }}>{cert}</span>
                  ))}
                </div>
              </div>
            ))}

            {/* Advisor CTA Card — placed after 3rd data card per Stitch design */}
            <div style={{ position: 'relative', overflow: 'hidden', background: '#8c0f37', color: 'white', borderRadius: '0.75rem', padding: '2rem', marginBottom: '1rem' }}>
              <div style={{ position: 'absolute', right: '-3rem', top: '-3rem', width: '12rem', height: '12rem', background: '#ad2c4d', borderRadius: '9999px', opacity: 0.3 }}></div>
              <h4 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '0.5rem', position: 'relative', zIndex: 1 }}>Maximize Your Growth.</h4>
              <p style={{ color: '#ffd9dd', fontSize: '0.875rem', marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}>Free career coaching for every member. Our advisors help you negotiate offers and land the role that fits your goals — at $0 cost to you.</p>
              <Link href="/apply" style={{ background: 'white', color: '#8c0f37', fontWeight: 700, padding: '0.75rem 1.5rem', borderRadius: '0.375rem', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', position: 'relative', zIndex: 1, display: 'inline-block', textDecoration: 'none' }}>
                Speak to an Advisor
              </Link>
            </div>

            {MOBILE_SALARY_CARDS.slice(3).map((card) => (
              <div key={card.program} style={{ background: 'white', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', borderLeft: `4px solid ${card.borderColor}` }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  <span style={{ display: 'inline-block', padding: '0.25rem 0.5rem', background: 'rgba(255,187,0,0.10)', color: '#6c4d00', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', width: 'fit-content', borderRadius: '0.25rem' }}>{card.category}</span>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-on-surface)', letterSpacing: '-0.02em', lineHeight: 1.3, margin: 0 }}>{card.program}</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ background: '#f6f3f2', padding: '0.75rem', borderRadius: '0.5rem' }}>
                    <span style={{ display: 'block', fontSize: '0.625rem', textTransform: 'uppercase', fontWeight: 700, color: '#584144', letterSpacing: '0.07em', marginBottom: '0.25rem' }}>Entry Level</span>
                    <p style={{ color: '#8c0f37', fontWeight: 700, fontSize: '1.125rem', lineHeight: 1, margin: 0 }}>{card.entry}</p>
                  </div>
                  <div style={{ background: 'rgba(140,15,55,0.05)', padding: '0.75rem', borderRadius: '0.5rem' }}>
                    <span style={{ display: 'block', fontSize: '0.625rem', textTransform: 'uppercase', fontWeight: 700, color: '#8c0f37', letterSpacing: '0.07em', marginBottom: '0.25rem' }}>Mid Level</span>
                    <p style={{ color: '#8c0f37', fontWeight: 900, fontSize: '1.125rem', lineHeight: 1, margin: 0 }}>{card.mid}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {card.certs.map((cert) => (
                    <span key={cert} style={{ background: '#e5e2e1', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 500, color: '#584144' }}>{cert}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Disclaimer */}
          <footer style={{ marginTop: '3rem', marginBottom: '5rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.625rem', fontWeight: 500, color: 'rgba(88,65,68,0.60)', textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1.6 }}>
              Data provided by Lightcast and Bureau of Labor Statistics. Figures represent national averages and vary by geographic location and individual experience.
            </p>
          </footer>
        </div>

        <Footer />
        <MobileBottomNav />
      </div>

      {/* ===== DESKTOP VIEW (>640px) ===== */}
      <div className="marketing-desktop">
        {/* ===== Hero ===== */}
        <section style={{ padding: '5rem 2rem 3rem', maxWidth: '1400px', margin: '0 auto' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-full, 50px)',
            background: 'rgba(173,44,77,0.15)', border: '1px solid rgba(173,44,77,0.3)',
            color: 'var(--color-accent)', fontSize: '0.7rem', fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '1rem',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }} aria-hidden="true">analytics</span>
            Salary Intelligence
          </span>
          <h1 className="text-display-lg" style={{ marginBottom: '1rem' }}>2025 Salary Intelligence</h1>
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '1.125rem', lineHeight: 1.7, maxWidth: '640px' }}>
            Starting salary ranges by program — same numbers you see on /programs. Use this with fit, timeline, and ramp to find your best path forward.
          </p>
        </section>

        {/* ===== Bento Grid: Featured chart + side stats ===== */}
        <section style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem 3rem' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem',
          }}>
            {/* Featured AI/ML salary chart card (8-col) */}
            <div style={{
              background: 'var(--surface-container)', borderRadius: 'var(--radius-xl)',
              padding: '2rem', border: '1px solid var(--surface-container-highest)',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Featured</span>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>AI / Machine Learning Salary Bands</h3>
                </div>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '1.5rem' }} aria-hidden="true">smart_toy</span>
              </div>
              {/* Visual salary bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {salaryRows.filter(r => r.program.toLowerCase().includes('ai') || r.program.toLowerCase().includes('data') || r.program.toLowerCase().includes('cloud')).slice(0, 5).map((row) => (
                  <div key={row.slug} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', minWidth: '140px', textAlign: 'right' }}>{row.program}</span>
                    <div style={{ flex: 1, height: '24px', background: 'var(--surface-container-highest)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                      <div style={{
                        height: '100%', borderRadius: '4px',
                        background: `linear-gradient(90deg, var(--color-accent), var(--color-gold))`,
                        width: '75%',
                        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '0.5rem',
                      }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'white' }}>{row.salary}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Side stats column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Cost of Living stat */}
              <div style={{
                background: 'var(--surface-container)', borderRadius: 'var(--radius-xl)',
                padding: '1.5rem', border: '1px solid var(--surface-container-highest)',
                flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: 'var(--color-gold)', marginBottom: '0.5rem' }} aria-hidden="true">apartment</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cost of Living Factor</span>
                <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-on-surface)', marginTop: '0.25rem' }}>National</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginTop: '0.25rem' }}>Ranges anchored to national data</span>
              </div>
              {/* Market Heat */}
              <div style={{
                background: 'var(--color-accent)', borderRadius: 'var(--radius-xl)',
                padding: '1.5rem', color: 'white', flex: 1,
                display: 'flex', flexDirection: 'column', justifyContent: 'center',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }} aria-hidden="true">local_fire_department</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>Market Heat</span>
                <span style={{ fontSize: '2rem', fontWeight: 900, marginTop: '0.25rem' }}>{guideStats.over100Count} Tracks</span>
                <span style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: '0.25rem' }}>Top out above $100K</span>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Decision Nav ===== */}
        <section className="content-section salary-guide-page" style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem' }}>
          <ProgramsDecisionJourneyNav current="salary" />

          <div className="salary-guide-fit-context" style={{ marginTop: '2rem' }}>
            <p className="salary-guide-fit-lead">
              Salary is one factor. The right program fits your timeline, readiness, and tech comfort — not just the top of the range. Higher bands usually mean a steeper ramp.
            </p>
            <div className="salary-guide-fit-links" style={{ marginTop: '1rem' }}>
              <Link href="/find-your-path" className="btn btn-primary btn-sm">Find your best-fit programs (2-min quiz)</Link>
              <Link href="/program-comparison" className="btn btn-outline btn-sm">Compare programs</Link>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="salary-guide-stats-row" style={{ marginTop: '2rem' }}>
            {[
              { value: guideStats.highestSalary, label: 'Top of published range', sub: guideStats.highestProgram },
              { value: guideStats.avgMidpointLabel, label: 'Typical midpoint (all 19)', sub: 'Average of range midpoints' },
              {
                value: String(guideStats.over100Count),
                label: 'Tracks topping ~$100K',
                sub: 'High end of range at/above $100K',
              },
            ].map((s) => (
              <div key={s.label} className="salary-guide-stat-card">
                <div className="salary-guide-stat-value">{s.value}</div>
                <div className="salary-guide-stat-label">{s.label}</div>
                <div className="salary-guide-stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* ===== Role Cards Grid ===== */}
          <h2 style={{ marginTop: '3rem', marginBottom: '1.5rem' }}>Program starting ranges (all 19)</h2>
          <p className="salary-guide-table-intro">
            Same published ranges as each program card on /programs. Framed for early-career (roughly 0-1 year in-role).
          </p>
          <p className="salary-guide-ramp-legend"><strong>Ramp:</strong> Easier = quicker, good first credential. Steeper = more depth, higher payoff.</p>

          {/* Desktop: table | Mobile: hidden (cards shown instead) */}
          <div className="salary-guide-table-wrap">
            <SalaryTableWrapper>
              <table className="salary-table">
                <thead>
                  <tr><th>Program</th><th>Duration</th><th>Starting Salary</th><th>Level</th><th>Ramp</th></tr>
                </thead>
                <tbody>
                  {salaryRows.map((row) => (
                    <tr key={row.slug}>
                      <td data-label="Program"><strong>{row.program}</strong></td>
                      <td data-label="Duration">{row.duration}</td>
                      <td data-label="Starting Salary" style={{ fontWeight: 700, color: 'var(--color-on-surface)' }}>{row.salary}</td>
                      <td data-label="Level"><span style={{ background: row.color, color: 'white', padding: '.3rem .75rem', borderRadius: '50px', fontSize: '.8rem', fontWeight: 600 }}>{row.level}</span></td>
                      <td data-label="Ramp"><span className="salary-ramp-badge">{row.ramp}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SalaryTableWrapper>
          </div>

          {/* Mobile only: card layout */}
          <div className="salary-guide-cards">
            {salaryRows.map((row) => (
              <article key={row.slug} className="salary-guide-card">
                <div className="salary-guide-card__main">
                  <h3 className="salary-guide-card__program">{row.program}</h3>
                  <div className="salary-guide-card__salary">{row.salary}</div>
                </div>
                <div className="salary-guide-card__meta">
                  <span>{row.duration}</span>
                  <span style={{ background: row.color, color: 'white', padding: '0.2rem 0.5rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 600 }}>{row.level}</span>
                  <span className="salary-ramp-badge">{row.ramp}</span>
                </div>
              </article>
            ))}
          </div>

          {/* Insights grid */}
          <div className="salary-guide-insights salary-guide-insights-grid" style={{ marginTop: '3rem' }}>
            {insights.map((item) => (
              <div key={item.title} style={{ background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg, 12px)', padding: '1.5rem' }}>
                <div style={{ marginBottom: '.5rem' }}><span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--color-accent)' }} aria-hidden="true">{item.icon}</span></div>
                <strong>{item.title}</strong>
                <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '.9rem', marginTop: '.4rem' }}>{item.desc}</p>
              </div>
            ))}
          </div>

          {/* ===== Growth Trajectory ===== */}
          <div style={{ marginTop: '4rem', marginBottom: '3rem' }}>
            <h2 className="text-display-sm" style={{ marginBottom: '0.5rem' }}>Growth Trajectory</h2>
            <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '2rem', maxWidth: '600px' }}>
              Most graduates see meaningful increases inside 2-3 years. Here is the typical career arc.
            </p>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem',
            }}>
              {GROWTH_PHASES.map((phase) => (
                <div key={phase.num} style={{
                  background: 'var(--surface-container)', borderRadius: 'var(--radius-xl)',
                  padding: '1.75rem', position: 'relative', overflow: 'hidden',
                  border: '1px solid var(--surface-container-highest)',
                }}>
                  <span style={{
                    position: 'absolute', top: '-0.25rem', right: '0.5rem',
                    fontSize: '4.5rem', fontWeight: 900, lineHeight: 1,
                    color: 'var(--surface-container-highest)', opacity: 0.5,
                    pointerEvents: 'none', userSelect: 'none',
                  }}>{phase.num}</span>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Phase {phase.num}</span>
                    <h4 style={{ fontWeight: 700, marginTop: '0.5rem', marginBottom: '0.5rem' }}>{phase.title}</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>{phase.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ===== Download CTA ===== */}
          <div style={{
            background: 'var(--surface-container)', borderRadius: 'var(--radius-xl)',
            padding: '2.5rem', textAlign: 'center', marginBottom: '2rem',
            border: '1px solid var(--surface-container-highest)',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'var(--color-accent)', marginBottom: '0.75rem', display: 'block' }} aria-hidden="true">download</span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Start Your Career Track</h3>
            <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto' }}>
              Apply for free to unlock your personalized salary roadmap, counselor support, and employer connections.
            </p>
            <Link href="/apply" className="btn btn-primary">
              Apply for Free
            </Link>
          </div>

          <p className="salary-guide-methodology">
            <strong>How we set the ranges:</strong> We start from Lightcast / BLS-style market data and employer conversations, then publish conservative bands on each program page. This guide copies those bands so you are never comparing a &quot;marketing number&quot; here against a different number there.
          </p>

          {/* Bottom CTAs */}
          <div className="salary-guide-ctas">
            <h3 className="salary-guide-cta-title">Your Next Step</h3>
            <p className="salary-guide-cta-desc">You now have the numbers. Use the pathfinder to find your fit, or compare programs. When you&rsquo;re ready — apply.</p>
            <div className="salary-guide-cta-buttons">
              <Link href="/find-your-path" className="btn btn-outline salary-guide-cta-btn">Find your fit (2-min quiz)</Link>
              <Link href="/program-comparison" className="btn btn-outline salary-guide-cta-btn">Compare programs</Link>
              <Link href="/apply" className="btn btn-primary btn-large salary-guide-cta-btn">Apply Now</Link>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}
