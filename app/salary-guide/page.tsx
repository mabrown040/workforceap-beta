import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import { Lightbulb, TrendingUp, MapPin, CheckCircle, Handshake, DollarSign } from 'lucide-react';
import MainNav from '@/components/MainNav';
import Footer from '@/components/Footer';
import ProgramsDecisionJourneyNav from '@/components/ProgramsDecisionJourneyNav';
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
    title: 'Entry ranges are not "lesser" options',
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
    <div className="wa-min-h-screen wa-bg-white dark:wa-bg-[#141313] wa-text-gray-900 dark:wa-text-[#e6e1e1] salary-guide-page">
      <MainNav />

      {/* Hero */}
      <section className="wa-pt-32 wa-pb-16 wa-px-6 md:wa-px-12">
        <div className="wa-max-w-5xl wa-mx-auto wa-text-center">
          <div className="wa-inline-flex wa-items-center wa-gap-2 wa-bg-[rgba(113,51,62,0.1)] dark:wa-bg-[rgba(113,51,62,0.2)] wa-border wa-border-[rgba(173,44,77,0.15)] wa-px-4 wa-py-1.5 wa-rounded-full wa-mb-6">
            <span className="wa-w-2 wa-h-2 wa-rounded-full wa-bg-[#ad2c4d] wa-inline-block" />
            <span className="wa-text-[10px] wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-[#ad2c4d] dark:wa-text-[#ffb2bc]">Career Outcomes</span>
          </div>
          <h1 className="wa-text-5xl md:wa-text-6xl wa-font-extrabold wa-tracking-tight wa-leading-none wa-mb-4">
            WorkforceAP{' '}
            <span style={{ backgroundImage: 'linear-gradient(to right, #ad2c4d, #ffb2bc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Salary Guide
            </span>
          </h1>
          <p className="wa-text-xl wa-text-gray-600 dark:wa-text-[#debfc2] wa-max-w-2xl wa-mx-auto">
            Starting salary ranges by program — same numbers you see on /programs. Use this with fit, timeline, and ramp; Austin is our launch wedge, not a ceiling on where you can work.
          </p>
        </div>
      </section>

      <section className="wa-pb-24 wa-px-6 md:wa-px-12">
        <div className="container">
          <ProgramsDecisionJourneyNav current="salary" />

          <div className="salary-guide-fit-context">
            <p className="salary-guide-fit-lead">
              Salary is one factor. The right program fits your timeline, readiness, and tech comfort — not just the top of the range. Higher bands usually mean a steeper ramp. Faster, lower-band credentials still move hiring conversations forward; a finished program beats a stalled one.
            </p>
            <div className="salary-guide-decision-steps">
              <p><strong>How to use this guide:</strong> Take the pathfinder quiz to narrow your fit → compare programs side-by-side → apply when ready.</p>
            </div>
            <div className="salary-guide-fit-links">
              <Link href="/find-your-path" className="btn btn-primary btn-sm">Find your best-fit programs (2-min quiz)</Link>
              <Link href="/program-comparison" className="btn btn-outline btn-sm">Compare programs</Link>
            </div>
          </div>

          {/* Stats row */}
          <div className="wa-grid wa-grid-cols-1 md:wa-grid-cols-3 wa-gap-4 wa-my-8">
            {[
              { value: guideStats.highestSalary, label: 'Top of published range', sub: guideStats.highestProgram },
              { value: guideStats.avgMidpointLabel, label: 'Typical midpoint (all 19)', sub: 'Average of range midpoints' },
              { value: String(guideStats.over100Count), label: 'Tracks topping ~$100K', sub: 'High end of range at/above $100K' },
            ].map((s) => (
              <div key={s.label} className="wa-bg-white/5 wa-border wa-border-white/10 wa-rounded-2xl wa-backdrop-blur wa-p-6 wa-text-center">
                <div className="wa-text-3xl wa-font-extrabold" style={{ backgroundImage: 'linear-gradient(to right, #ad2c4d, #ffb2bc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{s.value}</div>
                <div className="wa-text-sm wa-font-semibold dark:wa-text-[#e6e1e1] wa-mt-1">{s.label}</div>
                <div className="wa-text-xs dark:wa-text-[#a68a8d] wa-mt-0.5">{s.sub}</div>
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

          {/* Insight cards — glassmorphism */}
          <div className="wa-grid wa-grid-cols-1 sm:wa-grid-cols-2 lg:wa-grid-cols-3 wa-gap-4 wa-my-8">
            {insights.map((item) => {
              const Icon = item.Icon;
              return (
                <div key={item.title} className="wa-bg-white/5 wa-border wa-border-white/10 wa-rounded-2xl wa-backdrop-blur wa-p-6">
                  <div className="wa-mb-3 wa-text-[#ad2c4d]"><Icon size={24} /></div>
                  <strong className="dark:wa-text-[#e6e1e1]">{item.title}</strong>
                  <p className="wa-text-sm dark:wa-text-[#debfc2] wa-mt-1 wa-leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>

          <p className="salary-guide-methodology">
            <strong>How we set the ranges:</strong> We start from Lightcast / BLS-style market data and employer conversations, then publish conservative bands on each program page. This guide copies those bands so you are never comparing a &quot;marketing number&quot; here against a different number there.
          </p>

          {/* Bottom CTA */}
          <div className="wa-bg-[rgba(173,44,77,0.08)] wa-border wa-border-[rgba(173,44,77,0.2)] wa-rounded-2xl wa-p-10 wa-text-center wa-mt-12">
            <h3 className="wa-text-2xl wa-font-bold dark:wa-text-[#e6e1e1] wa-mb-2">Your Next Step</h3>
            <p className="dark:wa-text-[#debfc2] wa-mb-6">You now have the numbers. Use the pathfinder to find your fit, or compare programs. When you&rsquo;re ready — apply.</p>
            <div className="wa-flex wa-flex-wrap wa-gap-3 wa-justify-center">
              <Link href="/find-your-path" className="wa-inline-flex wa-items-center wa-px-6 wa-py-3 wa-border wa-border-[rgba(173,44,77,0.5)] wa-text-[#ffb2bc] wa-rounded-xl wa-font-semibold wa-no-underline hover:wa-bg-[rgba(173,44,77,0.1)] wa-transition-colors">Find your fit (2-min quiz)</Link>
              <Link href="/program-comparison" className="wa-inline-flex wa-items-center wa-px-6 wa-py-3 wa-border wa-border-[rgba(173,44,77,0.5)] wa-text-[#ffb2bc] wa-rounded-xl wa-font-semibold wa-no-underline hover:wa-bg-[rgba(173,44,77,0.1)] wa-transition-colors">Compare programs</Link>
              <Link href="/apply" className="wa-inline-flex wa-items-center wa-px-6 wa-py-3 wa-bg-gradient-to-r wa-from-[#ad2c4d] wa-to-[#c9364f] wa-text-white wa-rounded-xl wa-font-bold wa-no-underline hover:wa-opacity-90 wa-transition-opacity">Start training — free for members</Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
