import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';
import LocalizedLink from '@/components/LocalizedLink';
import { buildSalaryGuideRows, salaryGuideSummaryStats } from '@/lib/content/programSalaryOutcomes';
import type { SalaryGuideRow } from '@/lib/content/programSalaryOutcomes';
import SalaryTableWrapper from '@/components/portal/SalaryTableWrapper';
import DataTable from '@/components/portal/ui/DataTable';
import type { DataTableColumn } from '@/components/portal/ui/DataTable';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Salary Guide',
  description:
    'Program-by-program starting salary ranges (aligned with our /programs catalog). Understand fit, ramp, and realistic outcomes — not just the biggest number.',
  path: '/salary-guide',
});
}

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
    desc: 'Most members see meaningful increases inside 2-3 years once they are in-role. Pick a track you can complete; we help match ramp to your life.',
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
    program: 'AI Professional Practitioner',
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

const SALARY_TABLE_COLUMNS: DataTableColumn<SalaryGuideRow>[] = [
  {
    key: 'program',
    header: 'Program',
    cellDataLabel: 'Program',
    cell: (r) => <strong>{r.program}</strong>,
  },
  {
    key: 'duration',
    header: 'Duration',
    cellDataLabel: 'Duration',
    cell: (r) => r.duration,
  },
  {
    key: 'salary',
    header: 'Starting Salary',
    cellDataLabel: 'Starting Salary',
    cell: (r) => (
      <span style={{ fontWeight: 700, color: 'var(--color-on-surface)' }}>{r.salary}</span>
    ),
  },
  {
    key: 'level',
    header: 'Level',
    cellDataLabel: 'Level',
    cell: (r) => (
      <span
        style={{
          background: r.color,
          color: 'white',
          padding: '.3rem .75rem',
          borderRadius: '50px',
          fontSize: '.8rem',
          fontWeight: 600,
        }}
      >
        {r.level}
      </span>
    ),
  },
  {
    key: 'ramp',
    header: 'Ramp',
    cellDataLabel: 'Ramp',
    cell: (r) => <span className="salary-ramp-badge">{r.ramp}</span>,
  },
];

export default function SalaryGuidePage() {
  const salaryRows = buildSalaryGuideRows();
  const guideStats = salaryGuideSummaryStats(salaryRows);

  return (
    <div className="mdx">
    <div
      className="inner-page salary-guide-page marketing-stack marketing-stack--enter"
      style={{ background: 'var(--color-background-dark)', color: 'var(--color-on-surface)' }}
    >
        {/* ===== Hero ===== */}
        <section className="mdx-stage" style={{ padding: '5rem 2rem 3rem', maxWidth: '1400px', margin: '0 auto' }}>
          <span className="mdx-pill" style={{ marginBottom: '1rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }} aria-hidden="true">analytics</span>
            Salary Intelligence
          </span>
          <h1 className="text-display-lg" style={{ marginBottom: '1rem' }}>Program <span className="mdx-grad-accent">Salary Guide</span></h1>
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '1.125rem', lineHeight: 1.7, maxWidth: '640px' }}>
            Starting salary ranges for all 20 programs — the same numbers shown on each program page. Salary matters, but so does fit, time commitment, support available, and how steep the skill ramp is. Use this guide to weigh all of it.
          </p>
        </section>

        {/* ===== Bento Grid: Featured chart + side stats ===== */}
        <section style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem 3rem' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem',
          }}>
            {/* Featured AI/ML salary chart card (8-col) */}
            <div className="mdx-card" style={{
              padding: '2rem',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                  <span className="mdx-eyebrow">Featured</span>
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
              <div className="mdx-card" style={{
                padding: '1.5rem',
                flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
              }}>
                <span className="material-symbols-outlined marketing-chip-text--gold" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }} aria-hidden="true">apartment</span>
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

          <div className="salary-guide-fit-context" style={{ marginTop: '2rem' }}>
            <p className="salary-guide-fit-lead">
              Salary is one factor. The right program fits your timeline, readiness, and tech comfort — not just the top of the range. Higher bands usually mean a steeper ramp.
            </p>
            <div className="salary-guide-fit-links" style={{ marginTop: '1rem' }}>
              <LocalizedLink href="/find-your-path" className="mdx-btn mdx-btn--primary btn-sm">Find your best-fit programs (2-min quiz)</LocalizedLink>
              <LocalizedLink href="/program-comparison" className="mdx-btn mdx-btn--ghost btn-sm">Compare programs</LocalizedLink>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="salary-guide-stats-row" style={{ marginTop: '2rem' }}>
            {[
              { value: guideStats.highestSalary, label: 'Top of published range', sub: guideStats.highestProgram },
              { value: guideStats.avgMidpointLabel, label: 'Typical midpoint (all 20)', sub: 'Average of range midpoints' },
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
          <h2 style={{ marginTop: '3rem', marginBottom: '1.5rem' }}>Program starting ranges (all 20)</h2>
          <p className="salary-guide-table-intro">
            Same published ranges as each program card on /programs. Framed for early-career (roughly 0-1 year in-role).
          </p>
          <p className="salary-guide-ramp-legend"><strong>Ramp:</strong> Easier = quicker, good first credential. Steeper = more depth, higher payoff.</p>

          {/* Desktop: table | Mobile: hidden (cards shown instead) */}
          <div className="salary-guide-table-wrap">
            <SalaryTableWrapper>
              <DataTable<SalaryGuideRow>
                variant="admin"
                tableClassName="salary-table"
                scrollX={false}
                columns={SALARY_TABLE_COLUMNS}
                rows={salaryRows}
                rowKey={(r) => r.slug}
              />
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
              Most members see meaningful increases inside 2-3 years. Here is the typical career arc.
            </p>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem',
            }}>
              {GROWTH_PHASES.map((phase) => (
                <div key={phase.num} className="mdx-card" style={{
                  padding: '1.75rem', position: 'relative', overflow: 'hidden',
                }}>
                  <span style={{
                    position: 'absolute', top: '-0.25rem', right: '0.5rem',
                    fontSize: '4.5rem', fontWeight: 900, lineHeight: 1,
                    color: 'var(--surface-container-highest)', opacity: 0.5,
                    pointerEvents: 'none', userSelect: 'none',
                  }}>{phase.num}</span>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <span className="mdx-eyebrow">Phase {phase.num}</span>
                    <h4 style={{ fontWeight: 700, marginTop: '0.5rem', marginBottom: '0.5rem' }}>{phase.title}</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>{phase.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ===== Download CTA ===== */}
          <div className="mdx-card" style={{
            padding: '2.5rem', textAlign: 'center', marginBottom: '2rem',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'var(--color-accent)', marginBottom: '0.75rem', display: 'block' }} aria-hidden="true">download</span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Ready to take the next step?</h3>
            <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto' }}>
              Apply with no application fee — every member gets a career advisor, resume support, interview prep, and employer introductions. No cost to members who qualify through scholarship/grant funded membership, no obligation.
            </p>
            <LocalizedLink href="/apply" className="mdx-btn mdx-btn--primary">
              Apply Now
            </LocalizedLink>
          </div>

          <p className="salary-guide-methodology">
            <strong>How we set the ranges:</strong> We start from Lightcast / BLS-style market data and employer conversations, then publish conservative bands on each program page. This guide copies those bands so you are never comparing a &quot;marketing number&quot; here against a different number there.
          </p>

          {/* Bottom CTAs */}
          <div className="salary-guide-ctas">
            <h3 className="salary-guide-cta-title">What to do next</h3>
            <p className="salary-guide-cta-desc">Now that you have the numbers, bring in the other factors. Take the quiz to find programs that fit your timeline and experience level, or browse all programs and compare side-by-side. When you are ready — apply.</p>
            <div className="salary-guide-cta-buttons">
              <LocalizedLink href="/career-quiz" className="mdx-btn mdx-btn--ghost salary-guide-cta-btn">Find Your Path</LocalizedLink>
              <LocalizedLink href="/programs" className="mdx-btn mdx-btn--ghost salary-guide-cta-btn">Explore Programs</LocalizedLink>
              <LocalizedLink href="/program-comparison" className="mdx-btn mdx-btn--ghost salary-guide-cta-btn">Compare Programs</LocalizedLink>
              <LocalizedLink href="/apply" className="mdx-btn mdx-btn--primary btn-large salary-guide-cta-btn">Apply Now</LocalizedLink>
            </div>
          </div>
        </section>

    </div>
    </div>
  );
}
