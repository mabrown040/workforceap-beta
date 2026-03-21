import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import { Lightbulb, TrendingUp, MapPin, CheckCircle, Handshake, DollarSign } from 'lucide-react';
import PageHero from '@/components/PageHero';
import PhotoHighlight from '@/components/PhotoHighlight';
import Footer from '@/components/Footer';

export const metadata: Metadata = buildPageMetadata({
  title: 'Salary Guide',
  description:
    'Entry-level salaries by program: $48K to $145K. Understand fit, ramp, and realistic outcomes — not just the biggest number. Use with our pathfinder to choose right.',
  path: '/salary-guide',
});

const salaryData = [
  { program: 'AWS Cloud Technology (Amazon)', duration: '3-5 Mo', salary: '$144,345', level: 'High', ramp: 'Steeper', color: '#4a9b4f' },
  { program: 'AI Professional Developer Certificate (IBM)', duration: '3-5 Mo', salary: '$134,047', level: 'High', ramp: 'Steeper', color: '#4a9b4f' },
  { program: 'Data Science (IBM)', duration: '3-5 Mo', salary: '$124,388', level: 'High', ramp: 'Steeper', color: '#4a9b4f' },
  { program: 'UX Design (Google)', duration: '3-5 Mo', salary: '$112,198', level: 'High', ramp: 'Moderate', color: '#4a9b4f' },
  { program: 'Project Management (Microsoft)', duration: '3-5 Mo', salary: '$102,682', level: 'Mid-High', ramp: 'Moderate', color: '#2b7bb9' },
  { program: 'Cybersecurity Professional Certificate (Google)', duration: '3-5 Mo', salary: '$102,652', level: 'Mid-High', ramp: 'Moderate', color: '#2b7bb9' },
  { program: 'IT Automation with Python', duration: '3-5 Mo', salary: '$88,976', level: 'Mid', ramp: 'Moderate', color: '#a47f38' },
  { program: 'Software Developer (IBM)', duration: '4-6 Mo', salary: '$88,976', level: 'Mid', ramp: 'Moderate', color: '#a47f38' },
  { program: 'Digital Marketing & E-Commerce', duration: '3-5 Mo', salary: '$69,348', level: 'Entry', ramp: 'Easier', color: '#888' },
  { program: 'Data Analytics (Google)', duration: '3-5 Mo', salary: '$68,487', level: 'Entry', ramp: 'Easier', color: '#888' },
  { program: 'CompTIA Security+', duration: '3-5 Mo', salary: '~$70,000', level: 'Entry', ramp: 'Moderate', color: '#888' },
  { program: 'CompTIA A+', duration: '3-5 Mo', salary: '$63,909', level: 'Entry', ramp: 'Easier', color: '#888' },
  { program: 'CompTIA Network+', duration: '3-5 Mo', salary: '$63,909', level: 'Entry', ramp: 'Easier', color: '#888' },
  { program: 'IT Support (IBM)', duration: '3-5 Mo', salary: '$63,909', level: 'Entry', ramp: 'Easier', color: '#888' },
];

const insights = [
  { Icon: Lightbulb, title: 'Highest Paying ($100K+)', desc: 'AWS, AI Developer, Data Science — steeper ramp. Best if you can invest 4–6 months and enjoy technical depth. Big payoff, bigger commitment.' },
  { Icon: CheckCircle, title: 'Entry Paths ($48K–$72K) — Strategically Smart', desc: 'IT Support, CompTIA A+, Data Analytics, Digital Marketing. Faster to complete. Strong first credential. Many graduates use these as a stepping stone, then stack certs for higher roles. Not consolation prizes — smart plays.' },
  { Icon: TrendingUp, title: 'Career Growth', desc: 'Most graduates see 20–40% increases within 2–3 years. Pick a path you can finish; we help you match ramp to your situation.' },
  { Icon: MapPin, title: 'Where We Operate', desc: 'U.S. national benchmarks. Austin tech salaries run 5–10% above. We\'re launching in Austin; expanding over time.' },
  { Icon: Handshake, title: 'Job Placement Support', desc: 'Resume support, interview prep, employer intros. We don\'t disappear after you certify.' },
  { Icon: DollarSign, title: 'Total Compensation', desc: 'Beyond salary: signing bonuses, stock options, health/dental, performance bonuses.' },
];

export default function SalaryGuidePage() {
  return (
    <div className="inner-page salary-guide-page">
      <PageHero
        title="WorkforceAP Salary Guide"
        subtitle="Entry-level salaries: $48K to $145K. Use this with fit, timeline, and ramp — not just the biggest number."
      />

      <PhotoHighlight
        imageUrl="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1400&q=80"
        label="Decision Support"
        title="Salary + Fit + Outcomes"
        description="Real numbers from real market data. The right program fits your timeline, tech comfort, and goals — salary is one factor, not the only one."
      />

      <section className="content-section salary-guide-page">
        <div className="container">
          <div className="salary-guide-fit-context">
            <p className="salary-guide-fit-lead">
              Salary is one factor. The right program fits your timeline and tech comfort. Higher pay often means a steeper ramp. Entry paths ($48K–$72K) can be smarter first steps — faster to complete, strong foundation.
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
              { value: '$144K', label: 'Highest Starting Salary', sub: 'AWS Cloud Technology' },
              { value: '$72K', label: 'Avg. Starting Salary', sub: 'Across all programs' },
              { value: '7', label: 'Programs Over $100K', sub: 'High-earning tracks' },
            ].map((s) => (
              <div key={s.label} className="salary-guide-stat-card">
                <div className="salary-guide-stat-value">{s.value}</div>
                <div className="salary-guide-stat-label">{s.label}</div>
                <div className="salary-guide-stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>

          <h2 style={{ marginBottom: '.5rem' }}>Program Starting Salaries</h2>
          <p className="salary-guide-table-intro">Entry-level (0–1 year). Sources: ZipRecruiter, Glassdoor, PayScale — Feb 2026 U.S. benchmarks. Austin runs 5–10% above. Launching in Austin; numbers hold as we expand.</p>
          <p className="salary-guide-ramp-legend"><strong>Ramp:</strong> Easier = quicker, good first credential. Steeper = more depth, higher payoff.</p>

          {/* Desktop: table | Mobile: hidden (cards shown instead) */}
          <div className="salary-guide-table-wrap">
            <div className="salary-table-wrapper">
              <table className="salary-table">
              <thead>
                <tr><th>Program</th><th>Duration</th><th>Starting Salary</th><th>Level</th><th>Ramp</th></tr>
              </thead>
              <tbody>
                {salaryData.map((row) => (
                  <tr key={row.program}>
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
            {salaryData.map((row) => (
              <article key={row.program} className="salary-guide-card">
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

          <div className="salary-guide-insights" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '2.5rem' }}>
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
            <strong>Sources:</strong> ZipRecruiter, Glassdoor, PayScale — February 2026 U.S. market data. Entry-level (0–1 year experience). Actual pay varies by location, company, and skills. We use these benchmarks to set realistic expectations, not to hype.
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
