import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import PageHero from '@/components/PageHero';
import PhotoHighlight from '@/components/PhotoHighlight';
import Footer from '@/components/Footer';
import { UI_ICONS } from '@/lib/content/programIcons';

export const metadata: Metadata = buildPageMetadata({
  title: 'Salary Guide',
  description:
    'Review salary ranges and career outlook for WorkforceAP training pathways and certifications.',
  path: '/salary-guide',
});

const salaryData = [
  { program: 'AWS Cloud Technology (Amazon)', duration: '3-5 Mo', salary: '$144,345', level: 'High', color: '#4a9b4f' },
  { program: 'AI Professional Developer Certificate (IBM)', duration: '3-5 Mo', salary: '$134,047', level: 'High', color: '#4a9b4f' },
  { program: 'Data Science (IBM)', duration: '3-5 Mo', salary: '$124,388', level: 'High', color: '#4a9b4f' },
  { program: 'UX Design (Google)', duration: '3-5 Mo', salary: '$112,198', level: 'High', color: '#4a9b4f' },
  { program: 'Project Management (Microsoft)', duration: '3-5 Mo', salary: '$102,682', level: 'Mid-High', color: '#2b7bb9' },
  { program: 'Cybersecurity Professional Certificate (Google)', duration: '3-5 Mo', salary: '$102,652', level: 'Mid-High', color: '#2b7bb9' },
  { program: 'IT Automation with Python', duration: '3-5 Mo', salary: '$88,976', level: 'Mid', color: '#a47f38' },
  { program: 'Software Developer (IBM)', duration: '4-6 Mo', salary: '$88,976', level: 'Mid', color: '#a47f38' },
  { program: 'Digital Marketing & E-Commerce', duration: '3-5 Mo', salary: '$69,348', level: 'Entry', color: '#888' },
  { program: 'Data Analytics (Google)', duration: '3-5 Mo', salary: '$68,487', level: 'Entry', color: '#888' },
  { program: 'CompTIA Security+', duration: '3-5 Mo', salary: '~$70,000', level: 'Entry', color: '#888' },
  { program: 'CompTIA A+', duration: '3-5 Mo', salary: '$63,909', level: 'Entry', color: '#888' },
  { program: 'CompTIA Network+', duration: '3-5 Mo', salary: '$63,909', level: 'Entry', color: '#888' },
  { program: 'IT Support (IBM)', duration: '3-5 Mo', salary: '$63,909', level: 'Entry', color: '#888' },
];

const insights = [
  { Icon: UI_ICONS.lightbulb, title: 'Highest Paying Programs', desc: 'AWS Cloud Technology and AI Developer programs lead with $134K–$144K starting salaries.' },
  { Icon: UI_ICONS.trendingUp, title: 'Career Growth Potential', desc: 'Most graduates see 20–40% salary increases within 2–3 years.' },
  { Icon: UI_ICONS.target, title: 'Location Matters', desc: 'These are U.S. national averages. Austin tech salaries are 5–10% above national average.' },
  { Icon: UI_ICONS.check, title: 'Accessible Career Launch', desc: 'Programs are designed to help learners move into entry-level roles quickly with coaching and support.' },
  { Icon: UI_ICONS.handshake, title: 'Job Placement Support', desc: 'Our 90% job placement assistance rate means most graduates land roles quickly.' },
  { Icon: UI_ICONS.dollarSign, title: 'Total Compensation', desc: 'Beyond salary: signing bonuses, stock options, health/dental, and performance bonuses.' },
];

export default function SalaryGuidePage() {
  return (
    <div className="inner-page">
      <PageHero
        title="WorkforceAP Salary Guide"
        subtitle="Entry-level starting salaries range from $48K to $145K across our 19 programs."
      />

      <PhotoHighlight
        imageUrl="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1400&q=80"
        label="Earning Potential"
        title="Your Career, Your Salary"
        description="Our graduates earn competitive salaries. See what you could earn with industry-recognized certifications."
      />

      <section className="content-section">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
            {[
              { value: '$144K', label: 'Highest Starting Salary', sub: 'AWS Cloud Technology' },
              { value: '$72K', label: 'Avg. Starting Salary', sub: 'Across all programs' },
              { value: '7', label: 'Programs Over $100K', sub: 'High-earning tracks' },
            ].map((s) => (
              <div key={s.label} style={{ background: '#f8f8f8', borderRadius: '12px', padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ad2c4d' }}>{s.value}</div>
                <div style={{ fontWeight: 600, margin: '.5rem 0 .25rem' }}>{s.label}</div>
                <div style={{ color: '#666', fontSize: '.9rem' }}>{s.sub}</div>
              </div>
            ))}
          </div>

          <h2 style={{ marginBottom: '.5rem' }}>Program Starting Salaries</h2>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>Entry-level positions (0–1 year experience) based on February 2026 market data.</p>

          <div className="salary-table-wrapper">
            <table className="salary-table">
              <thead>
                <tr><th>Program</th><th>Duration</th><th>Starting Salary</th><th>Level</th></tr>
              </thead>
              <tbody>
                {salaryData.map((row) => (
                  <tr key={row.program}>
                    <td><strong>{row.program}</strong></td>
                    <td>{row.duration}</td>
                    <td style={{ fontWeight: 700, color: '#1a1a1a' }}>{row.salary}</td>
                    <td><span style={{ background: row.color, color: 'white', padding: '.3rem .75rem', borderRadius: '50px', fontSize: '.8rem', fontWeight: 600 }}>{row.level}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '2.5rem' }}>
            {insights.map((item) => {
              const Icon = item.Icon;
              return (
                <div key={item.title} style={{ background: '#f8f8f8', borderRadius: '8px', padding: '1.5rem' }}>
                  <div style={{ marginBottom: '.5rem' }}><Icon size={28} className="text-current" /></div>
                  <strong>{item.title}</strong>
                  <p style={{ color: '#555', fontSize: '.9rem', marginTop: '.4rem' }}>{item.desc}</p>
                </div>
              );
            })}
          </div>

          <p style={{ color: '#888', fontSize: '.8rem', marginTop: '2rem' }}>
            Salary figures based on February 2026 U.S. market data from ZipRecruiter, Glassdoor, and PayScale. Entry-level positions (0–1 year experience). Actual salaries vary by location, company size, and individual skills.
          </p>

          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <Link href="/apply" className="btn btn-primary btn-large">Apply Now</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
