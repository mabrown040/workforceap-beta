import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import Footer from '@/components/Footer';
import EmployerContactForm from './EmployerContactForm';

export const metadata: Metadata = buildPageMetadata({
  title: 'Hire Certified Tech Graduates | WorkforceAP',
  description:
    'Access pre-screened, certified tech talent. WorkforceAP graduates hold industry credentials from Google, IBM, AWS, CompTIA. Post jobs or become a hiring partner. Serving employers nationwide.',
  path: '/employers',
});

const WHY_HIRE = [
  {
    icon: 'person_search',
    title: 'Ready-to-Hire Talent',
    desc: 'All graduates complete skills assessments and earn certifications from Google, IBM, Microsoft, AWS, CompTIA. Ready to contribute from day one.',
  },
  {
    icon: 'business_center',
    title: 'Certified Credentials',
    desc: 'Every candidate in our network has undergone rigorous training vetted by our academic and professional partners.',
  },
  {
    icon: 'handshake',
    title: 'Collaborative Models',
    desc: 'Customized training pathways designed in partnership with employers to ensure curriculum aligns with specific organizational needs.',
  },
];

const PROGRAMS = [
  { name: 'IT Support', cert: 'IBM Professional Certificate', level: 'Entry-level', salary: '$55K\u2013$72K', icon: 'computer' },
  { name: 'Cybersecurity', cert: 'Google / CompTIA pathway', level: 'Entry to mid', salary: '$75K\u2013$112K', icon: 'security' },
  { name: 'Cloud (AWS)', cert: 'AWS Cloud Technology', level: 'Entry to mid', salary: '$95K\u2013$145K', icon: 'cloud_queue' },
  { name: 'Data Analytics', cert: 'Google Data Analytics', level: 'Entry-level', salary: '$72K\u2013$102K', icon: 'analytics' },
  { name: 'Software Developer', cert: 'IBM', level: 'Entry-level', salary: '$78K\u2013$98K', icon: 'code' },
  { name: 'Project Management', cert: 'Microsoft', level: 'Entry to mid', salary: '$82K\u2013$112K', icon: 'folder_managed' },
];

const HOW_IT_WORKS = [
  { num: 1, title: 'Post Your Opening', desc: 'Add your job to our employer portal. We match it to our pipeline.', icon: 'description' },
  { num: 2, title: 'Review Matched Candidates', desc: 'Receive pre-screened applicants who hold relevant certifications.', icon: 'search' },
  { num: 3, title: 'Interview & Hire', desc: 'You conduct interviews and make the hire. No placement fees.', icon: 'how_to_reg' },
  { num: 4, title: '90-Day Support', desc: 'We support your new hire\u2019s onboarding for long-term success.', icon: 'handshake' },
];

const PARTNERSHIP_OPTIONS = [
  {
    title: 'Job Postings',
    features: ['Post unlimited jobs', 'Access to active members and alumni', 'Direct candidate introductions'],
    cta: 'Get Started',
    href: '#employer-contact',
    featured: false,
  },
  {
    title: 'Hiring Partner (Preferred)',
    features: ['First access to graduating cohorts', 'Input on curriculum design', 'Co-branded success stories', 'Quarterly hiring events'],
    cta: 'Become a Partner',
    href: '#employer-contact',
    featured: true,
  },
  {
    title: 'Corporate Training',
    features: ['Upskill your existing workforce', 'Custom training programs', 'Group enrollment discounts'],
    cta: 'Learn More',
    href: '#employer-contact',
    featured: false,
  },
];

export default function EmployersPage() {
  return (
    <div className="inner-page">
      {/* Hero Section: Editorial Asymmetry */}
      <section className="content-section" style={{ paddingBottom: '2rem' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div className="editorial-grid" style={{ alignItems: 'center', gap: '3rem' }}>
            <div style={{ gridColumn: 'span 12' }} className="emp-hero-left">
              <span className="text-label-upper" style={{ display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', background: 'var(--surface-container-highest)', color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem' }}>
                Employer &amp; Partner Solutions
              </span>
              <h1 className="text-display-lg" style={{ color: 'var(--color-on-surface)', marginBottom: '2rem', lineHeight: 0.95 }}>
                Bridging the{' '}
                <span style={{ color: 'var(--color-accent)' }}>Talent Gap</span>{' '}
                Through Intentionality.
              </h1>
              <p style={{ fontSize: '1.25rem', color: 'var(--color-on-surface-variant)', maxWidth: '36rem', lineHeight: 1.6 }}>
                Access a pipeline of industry-certified, ready-to-hire professionals. We don&rsquo;t just find workers; we build the future workforce.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '2rem' }}>
                <Link
                  href="/employer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'var(--color-accent)',
                    color: '#fff',
                    padding: '1rem 2rem',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  View Talent Portal
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>arrow_forward</span>
                </Link>
                <Link
                  href="#employer-contact"
                  style={{
                    display: 'inline-block',
                    background: 'var(--color-gold)',
                    color: '#1c1b1b',
                    padding: '1rem 2rem',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  Partner With Us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition: Tonal Layering */}
      <section className="bg-surface-container-low" style={{ padding: '6rem 0' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            {WHY_HIRE.map((item) => (
              <div key={item.title} className="stitch-card" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--surface-container-lowest)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '2.25rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>
                  {item.icon}
                </span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--color-on-surface)' }}>{item.title}</h3>
                <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.7 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI + counselor model */}
      <section className="content-section" style={{ paddingBottom: 0 }}>
        <div className="container" style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <div className="stitch-card" style={{ padding: '1.5rem 2rem', display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>psychology</span>
            <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem', margin: 0 }}>
              <strong>AI-powered career support:</strong> Members use guided AI tools for resumes, interviews, and applications while a counselor keeps
              the human layer &mdash; so candidates arrive prepared without losing accountability.
            </p>
          </div>
        </div>
      </section>

      {/* Available Talent - Program Cards */}
      <section className="content-section">
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 className="text-display-sm" style={{ color: 'var(--color-on-surface)', marginBottom: '0.75rem' }}>Available Talent</h2>
            <p style={{ color: 'var(--color-on-surface-variant)', maxWidth: '40rem', margin: '0 auto' }}>
              Graduate profiles by program and certification. Ranges match our published program outcomes.
              See <Link href="/programs" style={{ color: 'var(--color-accent)' }}>program pages</Link> and the{' '}
              <Link href="/salary-guide" style={{ color: 'var(--color-accent)' }}>salary guide</Link> for detail.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {PROGRAMS.map((prog) => (
              <div key={prog.name} className="stitch-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>{prog.icon}</span>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>{prog.name}</h3>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>{prog.cert}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid rgba(88,65,68,0.1)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{prog.level}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-accent)' }}>{prog.salary}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-surface-container-low" style={{ padding: '6rem 0' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 className="text-display-sm" style={{ color: 'var(--color-on-surface)', marginBottom: '0.75rem' }}>How It Works</h2>
            <p style={{ color: 'var(--color-on-surface-variant)' }}>Four simple steps from posting to partnership</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem' }}>
            {HOW_IT_WORKS.map((step) => (
              <div key={step.num} className="stitch-card" style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: 'var(--color-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.25rem', margin: '0 auto 1rem' }}>
                  {step.num}
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'var(--color-accent)', marginBottom: '0.75rem', display: 'block', fontVariationSettings: "'FILL' 1" }}>{step.icon}</span>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-on-surface)' }}>{step.title}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partnership Options - Bento Grid */}
      <section className="content-section">
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 className="text-display-sm" style={{ color: 'var(--color-on-surface)', marginBottom: '0.75rem' }}>
              Solutions Scaled for Impact
            </h2>
            <p style={{ color: 'var(--color-on-surface-variant)' }}>Choose the level that fits your hiring needs</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {PARTNERSHIP_OPTIONS.map((opt) => (
              <div
                key={opt.title}
                className={opt.featured ? 'stitch-card-elevated' : 'stitch-card'}
                style={{
                  padding: '2.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.5rem',
                  position: 'relative',
                  ...(opt.featured ? { border: '2px solid var(--color-accent)' } : {}),
                }}
              >
                {opt.featured && (
                  <span className="text-label-upper" style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'var(--color-accent)', color: '#fff', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.6rem' }}>
                    Most Popular
                  </span>
                )}
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>{opt.title}</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                  {opt.features.map((f) => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={opt.href}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    background: opt.featured ? 'var(--color-accent)' : 'var(--surface-container-high)',
                    color: opt.featured ? '#fff' : 'var(--color-on-surface)',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-lg)',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    textDecoration: 'none',
                  }}
                >
                  {opt.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section id="employer-contact" className="content-section">
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ background: 'var(--color-accent)', borderRadius: 'var(--radius-xl)', padding: '4rem 3rem', display: 'flex', flexWrap: 'wrap', gap: '3rem', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
            <div style={{ flex: '1 1 400px', position: 'relative', zIndex: 1 }}>
              <h2 className="text-display-sm" style={{ color: '#fff', marginBottom: '1.5rem' }}>
                Ready to Transform Your Hiring Process?
              </h2>
              <p style={{ color: 'rgba(255,203,209,0.9)', fontSize: '1.125rem', marginBottom: '1.5rem' }}>
                Join over 200+ partners building a more equitable and efficient workforce through Workforce Advancement Project.
              </p>
              <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#fff' }}>Direct contact</p>
                <p style={{ marginBottom: '0.25rem', color: 'rgba(255,255,255,0.9)' }}>
                  <strong>Michael Brown</strong>
                </p>
                <p style={{ marginBottom: '0.25rem' }}>
                  <a href="mailto:michael.brown@workforceap.org" style={{ color: 'var(--color-gold)' }}>michael.brown@workforceap.org</a>
                </p>
                <p>
                  <a href="tel:5127771808" style={{ color: 'var(--color-gold)' }}>(512) 777-1808</a>
                </p>
              </div>
            </div>
            <div style={{ flex: '1 1 400px', position: 'relative', zIndex: 1 }}>
              <EmployerContactForm />
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @media (min-width: 1024px) {
          .emp-hero-left { grid-column: 1 / 8 !important; }
        }
      `}</style>

      <Footer />
    </div>
  );
}
