import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import { Flame } from 'lucide-react';
import PageHero from '@/components/PageHero';
import Footer from '@/components/Footer';
import { getProgramExtra } from '@/lib/content/programExtras';
import { getProgramComparisonTracks } from '@/lib/content/programComparisonTracks';

export const metadata: Metadata = buildPageMetadata({
  title: 'Compare Programs',
  description:
    'Compare WorkforceAP career tracks by duration, salary potential, certifications, and difficulty to find your best fit.',
  path: '/program-comparison',
});

const tracks = getProgramComparisonTracks();

export default function ProgramComparisonPage() {
  return (
    <div className="inner-page">
      <PageHero
        title="Compare Programs"
        subtitle="Side-by-side: duration, salary, demand, and fit. Find the right career track for your goals."
      >
        <div className="programs-decision-cta" style={{ marginTop: '1rem' }}>
          <Link href="/find-your-path" className="btn btn-primary">
            Not sure? Take the 2-minute pathfinder quiz →
          </Link>
        </div>
      </PageHero>

      <section className="content-section">
        <div className="container">
          <div className="program-comparison-decision-guide">
            <h2 className="program-comparison-guide-title">How to Choose</h2>
            <p className="program-comparison-guide-lead">Pick based on what matters most to you:</p>
            <ul className="program-comparison-guide-list">
              <li>
                <strong>Time:</strong> Digital Literacy is the fastest on-ramp; most tracks run about 3–5 months at ~10 hours
                a week (your pace may vary).
              </li>
              <li>
                <strong>Difficulty (⭐–⭐⭐⭐):</strong> ⭐ = beginner-friendly. ⭐⭐⭐ = steeper curve, usually higher Austin-area
                earning potential.
              </li>
              <li>
                <strong>Tech comfort:</strong> Starting from basics? Digital Literacy or IT Support. Already comfortable?
                Cloud, Cybersecurity, or Data Analytics are strong Austin bets.
              </li>
              <li>
                <strong>Salary vs. ramp:</strong> Higher ranges usually mean more depth. Pick the track you can finish —
                that beats chasing the biggest number and stalling out.
              </li>
            </ul>
          </div>

          <div className="program-comparison-table-wrap">
            <table className="comparison-table program-table">
              <thead>
                <tr>
                  <th>Track</th>
                  <th>Duration</th>
                  <th>Difficulty</th>
                  <th>Avg. Starting Salary</th>
                  <th>Job Demand</th>
                  <th>Certifications</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tracks.map((t) => (
                  <tr key={t.slug}>
                    <td>
                      <Link href={`/programs/${t.slug}`}>
                        <strong>{t.shortName}</strong>
                      </Link>
                    </td>
                    <td>{t.duration}</td>
                    <td>{t.difficulty}</td>
                    <td>{t.salary}</td>
                    <td>
                      <span className="demand-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Flame size={14} className="text-current" aria-hidden />
                        {t.demand}
                      </span>
                    </td>
                    <td>{t.certs}</td>
                    <td>
                      <Link
                        href={`/apply?program=${t.slug}`}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                      >
                        Apply
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="program-cards" role="list" aria-label="Program comparison cards">
            {tracks.map((t) => {
              const extra = getProgramExtra(t.slug);
              return (
                <li key={t.slug}>
                  <article
                    className="program-comparison-card"
                    aria-labelledby={`program-card-title-${t.slug}`}
                  >
                    <div className="program-comparison-card__header">
                      <Link
                        id={`program-card-title-${t.slug}`}
                        href={`/programs/${t.slug}`}
                        className="program-comparison-card__title"
                      >
                        {t.shortName}
                      </Link>
                    <Link
                      href={`/apply?program=${t.slug}`}
                      className="btn btn-secondary program-comparison-card__apply"
                      aria-label={`Apply to ${t.shortName}`}
                    >
                      Apply
                    </Link>
                    </div>
                    {extra?.bestFor && (
                      <p className="program-comparison-card__best-for">
                        <strong>Best for:</strong> {extra.bestFor}
                      </p>
                    )}
                    {extra?.jobOutcomes && extra.jobOutcomes.length > 0 && (
                      <p className="program-comparison-card__outcomes">
                        <strong>Roles:</strong> {extra.jobOutcomes.join(' · ')}
                      </p>
                    )}
                    <div className="program-comparison-card__stats">
                      <span>{t.duration}</span>
                      <span className="program-comparison-card__stats-sep" aria-hidden="true">
                        |
                      </span>
                      <span aria-label={`Difficulty rating ${t.difficulty}`}>{t.difficulty}</span>
                      <span className="program-comparison-card__stats-sep" aria-hidden="true">
                        |
                      </span>
                      <span>{t.salary}</span>
                    </div>
                    <div className="program-comparison-card__demand">
                      <span className="program-comparison-card__demand-label">Job demand</span>
                      <span className="demand-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Flame size={14} className="text-current" aria-hidden />
                        {t.demand}
                      </span>
                    </div>
                    <p className="program-comparison-card__certs">
                      <span className="program-comparison-card__certs-label">Certifications</span>
                      {t.certs}
                    </p>
                  </article>
                </li>
              );
            })}
          </ul>

          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <Link href="/salary-guide" className="btn btn-outline">
              View Full Salary Guide
            </Link>
            &nbsp;&nbsp;
            <Link href="/apply" className="btn btn-primary">
              Apply Now
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
