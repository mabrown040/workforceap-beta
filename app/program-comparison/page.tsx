import type { Metadata } from 'next';
import Link from 'next/link';
import PageHero from '@/components/PageHero';
import PhotoHighlight from '@/components/PhotoHighlight';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Compare Programs',
};

const tracks = [
  { name: 'IT Support', duration: '16–20 wks', difficulty: '⭐⭐', salary: '$55,000', demand: '🔥 High', certs: 'CompTIA A+, Google IT' },
  { name: 'Cybersecurity', duration: '16–20 wks', difficulty: '⭐⭐⭐', salary: '$75,000', demand: '🔥🔥 Very High', certs: 'Security+, IBM Cyber' },
  { name: 'Cloud Computing', duration: '16–20 wks', difficulty: '⭐⭐⭐', salary: '$95,000', demand: '🔥🔥 Very High', certs: 'AWS CCP, Azure' },
  { name: 'Data Analytics', duration: '16–20 wks', difficulty: '⭐⭐⭐', salary: '$72,000', demand: '🔥🔥 Very High', certs: 'Google Data, IBM DS' },
  { name: 'Project Management', duration: '16–20 wks', difficulty: '⭐⭐⭐', salary: '$82,000', demand: '🔥 High', certs: 'PMP, CAPM' },
  { name: 'Digital Literacy / AI', duration: '6–8 wks', difficulty: '⭐', salary: '$48,000', demand: '🔥 High', certs: 'IBM SkillsBuild' },
  { name: 'Medical Coding', duration: '16–20 wks', difficulty: '⭐⭐', salary: '$52,000', demand: '🔥 High', certs: 'CPC (AAPC)' },
  { name: 'Trades / Manufacturing', duration: '16–20 wks', difficulty: '⭐⭐', salary: '$55,000', demand: '🔥 High', certs: 'OSHA 10, NCCER' },
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
          <div style={{ overflowX: 'auto' }}>
            <table className="comparison-table">
              <thead>
                <tr><th>Track</th><th>Duration</th><th>Difficulty</th><th>Avg. Starting Salary</th><th>Job Demand</th><th>Certifications</th><th></th></tr>
              </thead>
              <tbody>
                {tracks.map((t) => (
                  <tr key={t.name}>
                    <td><strong>{t.name}</strong></td>
                    <td>{t.duration}</td>
                    <td>{t.difficulty}</td>
                    <td>{t.salary}</td>
                    <td>{t.demand}</td>
                    <td>{t.certs}</td>
                    <td><Link href="/apply" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Apply</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <Link href="/salary-guide" className="btn btn-outline">View Full Salary Guide</Link>
            &nbsp;&nbsp;
            <Link href="/apply" className="btn btn-primary">Apply Now</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
