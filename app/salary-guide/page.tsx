import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import { Lightbulb, TrendingUp, MapPin, CheckCircle, Handshake, DollarSign } from 'lucide-react';
import PageHero from '@/components/PageHero';
import PhotoHighlight from '@/components/PhotoHighlight';
import Footer from '@/components/Footer';
import { buildSalaryGuideRows, salaryGuideSummaryStats } from '@/lib/content/programSalaryOutcomes';

export const metadata: Metadata = buildPageMetadata({
  title: 'Salary Guide',
  description:
    'Program-by-program starting salary ranges (aligned with our /programs catalog). Austin-first framing: understand fit, ramp, and realistic outcomes — not just the biggest number.',
  path: '/salary-guide',
});

const insights = [
  {
    Icon: Lightbulb,
    title: 'Higher ranges = deeper programs',
    desc: 'Cloud, AI engineering, and data science tracks sit at the top of the range for a reason — more depth, more commitment. Worth it if you will finish.',
  },
  {
    Icon: CheckCircle,
    title: 'Entry ranges are not “lesser” options',
    desc: 'IT Support, Digital Literacy, and several CompTIA paths get you credentialed faster. Plenty of people stack from there. The win is momentum.',
  },
  {
    Icon: TrendingUp,
    title: 'Career growth',
    desc: 'Most graduates see meaningful increases inside 2–3 years once they are in-role. Pick a track you can complete; we help match ramp to your life.',
  },
  {
    Icon: MapPin,
    title: 'Austin is the wedge',
    desc: 'We anchor examples to Austin hiring and cost-of-living reality. National data is a starting point; your offer depends on employer, proof, and fit.',
  },
  {
    Icon: Handshake,
    title: 'Job placement support',
    desc: 'Resume support, interview prep, employer intros. We do not disappear after you certify.',
  },
  {
    Icon: DollarSign,
    title: 'Total compensation',
    desc: 'Beyond base pay: bonuses, equity at some firms, benefits. Negotiate with the full picture.',
  },
];

export default function SalaryGuidePage() {
  const salaryRows = buildSalaryGuideRows();
  const guideStats = salaryGuideSummaryStats(salaryRows);

  return (
    <div className="inner-page salary-guide-page">
      <PageHero
        title="WorkforceAP Salary Guide"
        subtitle="Starting salary ranges by program — same numbers you see on /programs. Use this with fit, timeline, and ramp; Austin is our launch wedge, not a ceiling on where you can work."
      />

      <PhotoHighlight
        imageUrl="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1400&q=80"
        label="Decision Support"
        title="Salary + Fit + Outcomes"
        description="Ranges are grounded in market data and cross-checked against what we publish on each program page — so you are not comparing two different stories."
      />

      <section className="content-section salary-guide-page">
        <div className="container">
          <div className="salary-guide-fit-context">
            <p className="salary-guide-fit-lead">
              Salary is one factor. The right program fits your timeline and tech comfort. Higher ranges usually mean a steeper ramp. Lower ranges are often faster to complete — and a strong first credential beats a “dream” program you never finish.
            </p>
            <div className="salary-guide-decision-steps">
              <p><strong>How to use this guide:</strong> Take the pathfinder quiz to narrow your fit → compare programs side-by-side → apply when ready.</p>
            </div>
            <div className="salary-guide-fit-links">
              <Link href="/find-your-path" className="btn btn-primary btn-sm">Find your best-fit programs (2-min quiz)</Link>
              <Link href="/program-comparison" className="btn btn-outline btn-sm">Compare programs</Link>
            </div>
          </div>

          <div className="salary-guide-stats-row">
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

          <h2 style={{ marginBottom: '.5rem' }}>Program starting ranges (all 19)</h2>
          <p className="salary-guide-table-intro">
            Same published ranges as each program card on /programs. Framed for early-career (roughly 0–1 year in-role). Austin-area offers often land a little higher than the U.S. midpoint — use this table to compare tracks, not to predict your exact offer.
          </p>
          <p className="salary-guide-ramp-legend"><strong>Ramp:</strong> Easier = quicker, good first credential. Steeper = more depth, higher payoff.</p>

          {/* Desktop: table | Mobile: hidden (cards shown instead) */}
          <div className="salary-guide-table-wrap">
            <div className="salary-table-wrapper">
              <table className="salary-table">
              <thead>
                <tr><th>Program</th><th>Duration</th><th>Starting Salary</th><th>Level</th><th>Ramp</th></tr>
              </thead>
              <tbody>
                {salaryRows.map((row) => (
                  <tr key={row.slug}>
                    <td><strong>{row.program}</strong></td>
                    <td>{row.duration}</td>
                    <td style={{ fontWeight: 700, color: '#1a1a1a' }}>{row.salary}</td>
                    <td><span style={{ background: row.color, color: 'white', padding: '.3rem .75rem', borderRadius: '50px', fontSize: '.8rem', fontWeight: 600 }}>{row.level}</span></td>
                    <td><span className="salary-ramp-badge">{row.ramp}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Mobile only: card layout — no horizontal scroll */}
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

          <div className="salary-guide-insights salary-guide-insights-grid">
            {insights.map((item) => {
              const Icon = item.Icon;
              return (
              <div key={item.title} style={{ background: '#f8f8f8', borderRadius: '8px', padding: '1.5rem' }}>
                <div style={{ marginBottom: '.5rem' }}><Icon size={24} className="text-current" /></div>
                <strong>{item.title}</strong>
                <p style={{ color: '#555', fontSize: '.9rem', marginTop: '.4rem' }}>{item.desc}</p>
              </div>
              );
            })}
          </div>

          <p className="salary-guide-methodology">
            <strong>How we set the ranges:</strong> We start from Lightcast / BLS-style market data and employer conversations, then publish conservative bands on each program page. This guide copies those bands so you are never comparing a “marketing number” here against a different number there.
          </p>

          <div className="salary-guide-ctas">
            <h3 className="salary-guide-cta-title">Your Next Step</h3>
            <p className="salary-guide-cta-desc">You now have the numbers. Use the pathfinder to find your fit, or compare programs. When you&rsquo;re ready — apply.</p>
            <div className="salary-guide-cta-buttons">
              <Link href="/find-your-path" className="btn btn-outline salary-guide-cta-btn">Find your fit (2-min quiz)</Link>
              <Link href="/program-comparison" className="btn btn-outline salary-guide-cta-btn">Compare programs</Link>
              <Link href="/apply" className="btn btn-primary btn-large salary-guide-cta-btn">Apply Now</Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
