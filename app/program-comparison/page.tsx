import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import PageHero from '@/components/PageHero';
import PhotoHighlight from '@/components/PhotoHighlight';
import Footer from '@/components/Footer';

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
  demand: string;
  certs: string;
};

const tracks: ComparisonTrack[] = [
  {
    name: 'IT Support',
    slug: 'it-support-professional-certificate-ibm',
    duration: '16–20 wks',
    difficulty: '⭐⭐',
    salary: '$55,000',
    demand: '🔥 High',
    certs: 'CompTIA A+, Google IT',
  },
  {
    name: 'Cybersecurity',
    slug: 'cybersecurity-professional-certificate-google',
    duration: '16–20 wks',
    difficulty: '⭐⭐⭐',
    salary: '$75,000',
    demand: '🔥🔥 Very High',
    certs: 'Security+, IBM Cyber',
  },
  {
    name: 'Cloud Computing',
    slug: 'aws-cloud-technology-amazon',
    duration: '16–20 wks',
    difficulty: '⭐⭐⭐',
    salary: '$95,000',
    demand: '🔥🔥 Very High',
    certs: 'AWS CCP, Azure',
  },
  {
    name: 'Data Analytics',
    slug: 'data-analytics-professional-certificate-google',
    duration: '16–20 wks',
    difficulty: '⭐⭐⭐',
    salary: '$72,000',
    demand: '🔥🔥 Very High',
    certs: 'Google Data, IBM DS',
  },
  {
    name: 'Project Management',
    slug: 'project-management-professional-certificate-microsoft',
    duration: '16–20 wks',
    difficulty: '⭐⭐⭐',
    salary: '$82,000',
    demand: '🔥 High',
    certs: 'PMP, CAPM',
  },
  {
    name: 'Digital Literacy / AI',
    slug: 'digital-literacy-empowerment-class',
    duration: '6–8 wks',
    difficulty: '⭐',
    salary: '$48,000',
    demand: '🔥 High',
    certs: 'IBM SkillsBuild',
  },
  {
    name: 'Medical Coding',
    slug: 'health-information-technology-mchit',
    duration: '16–20 wks',
    difficulty: '⭐⭐',
    salary: '$52,000',
    demand: '🔥 High',
    certs: 'CPC (AAPC)',
  },
  {
    name: 'Trades / Manufacturing',
    slug: 'construction-readiness-certificate-osha-10',
    duration: '16–20 wks',
    difficulty: '⭐⭐',
    salary: '$55,000',
    demand: '🔥 High',
    certs: 'OSHA 10, NCCER',
  },
];

export default function ProgramComparisonPage() {
  return (
    <div className="inner-page">
      <PageHero
        title="Compare Programs"
        subtitle="Find the right career track for your goals and timeline"
      />

      <PhotoHighlight
        imageUrl="https://images.unsplash.com/photo-1551434678-e076c223a692?w=1400&q=80"
        label="Side by Side"
        title="Find Your Perfect Program"
        description="Compare duration, difficulty, salary potential, and certifications across all our career tracks."
      />

      <section className="content-section">
        <div className="container">
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
                    <td>{t.demand}</td>
                    <td>{t.certs}</td>
                    <td>
                      <Link
                        href="/apply"
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
            {tracks.map((t) => (
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
                      href="/apply"
                      className="btn btn-secondary program-comparison-card__apply"
                      aria-label={`Apply to ${t.name}`}
                    >
                      Apply
                    </Link>
                  </div>
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
                    <span>{t.demand}</span>
                  </div>
                  <p className="program-comparison-card__certs">
                    <span className="program-comparison-card__certs-label">Certifications</span>
                    {t.certs}
                  </p>
                </article>
              </li>
            ))}
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
