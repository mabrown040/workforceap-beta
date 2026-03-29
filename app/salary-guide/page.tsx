import type { Metadata } from 'next';
import Link from 'next/link';
import { Lightbulb, TrendingUp, MapPin, CheckCircle, Handshake, DollarSign } from 'lucide-react';
import { buildPageMetadata } from '@/app/seo';
import Footer from '@/components/Footer';
import StitchHero from '@/components/marketing/StitchHero';
import StitchPage from '@/components/marketing/StitchPage';
import ProgramsDecisionJourneyNav from '@/components/ProgramsDecisionJourneyNav';
import { buildSalaryGuideRows, salaryGuideSummaryStats } from '@/lib/content/programSalaryOutcomes';

export const metadata: Metadata = buildPageMetadata({
  title: 'Salary Guide',
  description:
    'Program-by-program starting salary ranges aligned with our programs catalog. Austin-first framing: understand fit, ramp, and realistic outcomes.',
  path: '/salary-guide',
});

const insights = [
  {
    Icon: Lightbulb,
    title: 'Higher ranges usually mean a steeper ramp',
    desc: 'Cloud, AI engineering, and data science tracks sit higher because they demand deeper technical completion.',
  },
  {
    Icon: CheckCircle,
    title: 'Entry ranges still move careers forward',
    desc: 'IT support, Digital Literacy, and early CompTIA paths can be the fastest route to real job momentum.',
  },
  {
    Icon: TrendingUp,
    title: 'Salary is not the only filter',
    desc: 'Use this guide with fit, timeline, readiness, and support. Finished programs outperform stalled ambition.',
  },
  {
    Icon: MapPin,
    title: 'Austin-first framing',
    desc: 'We ground the guide in Austin reality while acknowledging employer, location, and proof still shape actual offers.',
  },
  {
    Icon: Handshake,
    title: 'Placement support matters',
    desc: 'Resume coaching, interview prep, and employer connection all change the eventual salary conversation.',
  },
  {
    Icon: DollarSign,
    title: 'Compensation is bigger than base',
    desc: 'Benefits, bonuses, and growth potential still matter. The clean shell now leaves space to make that case clearly.',
  },
];

export default function SalaryGuidePage() {
  const salaryRows = buildSalaryGuideRows();
  const guideStats = salaryGuideSummaryStats(salaryRows);

  return (
    <StitchPage>
      <StitchHero
        badge="Career Outcomes"
        title={
          <>
            Salary guidance with
            <br />
            <span className="stitch-title-highlight">real context, not just big numbers</span>
          </>
        }
        description="This route now matches the rest of the Stitch system while preserving the same data logic and salary ranges."
        meta={
          <div className="stitch-stat-grid">
            <div className="stitch-card stitch-stat-card"><strong>{guideStats.highestSalary}</strong><span>{guideStats.highestProgram}</span></div>
            <div className="stitch-card stitch-stat-card"><strong>{guideStats.avgMidpointLabel}</strong><span>Typical midpoint</span></div>
            <div className="stitch-card stitch-stat-card"><strong>{String(guideStats.over100Count)}</strong><span>Tracks topping ~$100K</span></div>
          </div>
        }
      />

      <section className="stitch-section">
        <div className="stitch-surface">
          <ProgramsDecisionJourneyNav current="salary" />

          <div className="salary-guide-fit-context wa-mt-6">
            <p className="salary-guide-fit-lead">
              Salary is one factor. The right program fits your timeline, readiness, and tech comfort, not just the top of the range.
            </p>
            <div className="salary-guide-decision-steps">
              <p><strong>Use this sequence:</strong> take the pathfinder quiz, compare programs side by side, then apply when ready.</p>
            </div>
            <div className="salary-guide-fit-links stitch-actions">
              <Link href="/find-your-path" className="btn btn-primary btn-sm">Find your best-fit programs</Link>
              <Link href="/program-comparison" className="btn btn-outline btn-sm">Compare programs</Link>
            </div>
          </div>

          <h2 className="wa-text-3xl wa-font-bold wa-mt-8 wa-mb-3">Program starting ranges</h2>
          <p className="salary-guide-table-intro">
            Same published ranges as each program card on /programs. Framed for early-career use so you can compare tracks without switching visual systems.
          </p>
          <p className="salary-guide-ramp-legend"><strong>Ramp:</strong> Easier = quicker first credential. Steeper = more depth, higher payoff.</p>

          <div className="salary-guide-table-wrap wa-mt-6">
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
                      <td>{row.salary}</td>
                      <td><span style={{ background: row.color, color: 'white', padding: '.3rem .75rem', borderRadius: '50px', fontSize: '.8rem', fontWeight: 600 }}>{row.level}</span></td>
                      <td><span className="salary-ramp-badge">{row.ramp}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="salary-guide-cards wa-mt-6">
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

          <div className="stitch-grid-3 wa-mt-8">
            {insights.map((item) => {
              const Icon = item.Icon;
              return (
                <div key={item.title} className="stitch-card">
                  <Icon className="wa-text-[#ffb2bc]" size={24} />
                  <strong className="wa-block wa-mt-3">{item.title}</strong>
                  <p className="wa-mt-2">{item.desc}</p>
                </div>
              );
            })}
          </div>

          <p className="salary-guide-methodology wa-mt-8">
            <strong>How we set the ranges:</strong> We start from market data and employer conversations, then publish conservative bands on each program page.
          </p>
        </div>
      </section>

      <section className="stitch-section">
        <div className="stitch-cta-band">
          <div className="stitch-kicker">Your Next Step</div>
          <h2>You have the numbers. Now use the fit tools.</h2>
          <p>Move from salary curiosity into program selection without dropping out of the same visual system.</p>
          <div className="stitch-actions">
            <Link href="/find-your-path" className="btn btn-outline">Find your fit</Link>
            <Link href="/program-comparison" className="btn btn-outline">Compare programs</Link>
            <Link href="/apply" className="btn btn-primary">Start training</Link>
          </div>
        </div>
      </section>

      <Footer />
    </StitchPage>
  );
}
