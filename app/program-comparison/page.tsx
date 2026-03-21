import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import { Flame } from 'lucide-react';
import PageHero from '@/components/PageHero';
import Footer from '@/components/Footer';
import { getProgramExtra } from '@/lib/content/programExtras';

export const metadata: Metadata = buildPageMetadata({
  title: 'Compare Programs',
  description:
    'Compare WorkforceAP career tracks by duration, salary potential, certifications, and difficulty to find your best fit.',
  path: '/program-comparison',
});

type ComparisonTrack = {
  name: string;
  slug: string;
  duration: string;
  difficulty: string;
  salary: string;
  demand: 'High' | 'Very High';
  certs: string;
};

const tracks: ComparisonTrack[] = [
  {
    name: 'IT Support',
    slug: 'it-support-professional-certificate-ibm',
    duration: '16–20 wks',
    difficulty: '⭐⭐',
    salary: '$55,000',
    demand: 'High',
    certs: 'CompTIA A+, Google IT',
  },
  {
    name: 'Cybersecurity',
    slug: 'cybersecurity-professional-certificate-google',
    duration: '16–20 wks',
    difficulty: '⭐⭐⭐',
    salary: '$75,000',
    demand: 'Very High',
    certs: 'Security+, IBM Cyber',
  },
  {
    name: 'Cloud Computing',
    slug: 'aws-cloud-technology-amazon',
    duration: '16–20 wks',
    difficulty: '⭐⭐⭐',
    salary: '$95,000',
    demand: 'Very High',
    certs: 'AWS CCP, Azure',
  },
  {
    name: 'Data Analytics',
    slug: 'data-analytics-professional-certificate-google',
    duration: '16–20 wks',
    difficulty: '⭐⭐⭐',
    salary: '$72,000',
    demand: 'Very High',
    certs: 'Google Data, IBM DS',
  },
  {
    name: 'Project Management',
    slug: 'project-management-professional-certificate-microsoft',
    duration: '16–20 wks',
    difficulty: '⭐⭐⭐',
    salary: '$82,000',
    demand: 'High',
    certs: 'PMP, CAPM',
  },
  {
    name: 'Digital Literacy / AI',
    slug: 'digital-literacy-empowerment-class',
    duration: '6–8 wks',
    difficulty: '⭐',
    salary: '$48,000',
    demand: 'High',
    certs: 'IBM SkillsBuild',
  },
  {
    name: 'Medical Coding',
    slug: 'health-information-technology-mchit',
    duration: '16–20 wks',
    difficulty: '⭐⭐',
    salary: '$52,000',
    demand: 'High',
    certs: 'CPC (AAPC)',
  },
  {
    name: 'Trades / Manufacturing',
    slug: 'construction-readiness-certificate-osha-10',
    duration: '16–20 wks',
    difficulty: '⭐⭐',
    salary: '$55,000',
    demand: 'High',
    certs: 'OSHA 10, NCCER',
  },
];

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
              <li><strong>Time:</strong> Digital Literacy is 6–8 weeks; most tech tracks are 16–20 weeks.</li>
              <li><strong>Difficulty (⭐–⭐⭐⭐):</strong> ⭐ = beginner-friendly. ⭐⭐⭐ = steeper learning curve, higher payoff.</li>
              <li><strong>Tech comfort:</strong> Starting from basics? Digital Literacy or IT Support. Already comfortable? Cloud, Cybersecurity, or Data.</li>
              <li><strong>Salary vs. ramp:</strong> Higher salaries often mean more demanding programs. Choose a path you can commit to.</li>
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
                  <tr key={t.name}>
                    <td>
                      <Link href={`/programs/${t.slug}`}>
                        <strong>{t.name}</strong>
                      </Link>
                    </td>
                    <td>{t.duration}</td>
                    <td>{t.difficulty}</td>
                    <td>{t.salary}</td>
                    <td>
                      <span className="demand-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        {t.demand === 'Very High' && <Flame size={14} className="text-current" aria-hidden />}
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
                <li key={t.name}>
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
                        {t.name}
                      </Link>
                    <Link
                      href={`/apply?program=${t.slug}`}
                      className="btn btn-secondary program-comparison-card__apply"
                      aria-label={`Apply to ${t.name}`}
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
                        {t.demand === 'Very High' && <Flame size={14} className="text-current" aria-hidden />}
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
