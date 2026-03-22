import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import PageHero from '@/components/PageHero';
import PhotoHighlight from '@/components/PhotoHighlight';
import Footer from '@/components/Footer';
import EmployerContactForm from './EmployerContactForm';
import {
  ShieldCheck,
  Users,
  Headphones,
  FileText,
  Search,
  UserCheck,
  Handshake,
  Briefcase,
  Award,
  Cloud,
  BarChart3,
  Code,
  FolderKanban,
} from 'lucide-react';

export const metadata: Metadata = buildPageMetadata({
  title: 'Hire WorkforceAP Graduates | Pre-Screened Tech Talent',
  description:
    'Access pre-screened, certified tech talent. WorkforceAP graduates hold industry credentials from Google, IBM, AWS, CompTIA. Post jobs free or become a hiring partner. Currently serving Austin with plans to expand.',
  path: '/employers',
});

const WHY_HIRE = [
  {
    icon: ShieldCheck,
    title: 'Verified Skills',
    desc: 'All graduates complete skills assessments and earn certifications from Google, IBM, Microsoft, AWS, CompTIA.',
  },
  {
    icon: Users,
    title: 'Diverse Pipeline',
    desc: 'Access motivated candidates from underserved communities, career changers, and veterans.',
  },
  {
    icon: Headphones,
    title: 'Ongoing Support',
    desc: 'We provide 90-day post-hire support to ensure successful onboarding.',
  },
];

/** Illustrative roles — salary bands match published ranges on /programs and /salary-guide (not a separate “employer-only” story). */
const PROGRAMS = [
  { name: 'IT Support Specialist', cert: 'IBM IT Support Professional Certificate', level: 'Entry-level', salary: '$55K–$72K', icon: Briefcase },
  { name: 'Cybersecurity Analyst', cert: 'Google Cybersecurity Professional Certificate', level: 'Entry to mid', salary: '$75K–$112K', icon: ShieldCheck },
  { name: 'Cloud Consultant path', cert: 'AWS Cloud Technology (Amazon)', level: 'Mid to high', salary: '$95K–$145K', icon: Cloud },
  { name: 'Data Analyst', cert: 'Google Data Analytics Professional Certificate', level: 'Entry to mid', salary: '$72K–$102K', icon: BarChart3 },
  { name: 'Software Developer', cert: 'IBM Software Developer Professional Certificate', level: 'Entry to mid', salary: '$78K–$98K', icon: Code },
  { name: 'Project Manager', cert: 'Microsoft Project Management Professional Certificate', level: 'Mid', salary: '$82K–$112K', icon: FolderKanban },
];

const HOW_IT_WORKS = [
  { num: 1, title: 'Post Your Opening', desc: 'Add your job to our employer portal. Free. We match it to our pipeline.', icon: FileText },
  { num: 2, title: 'Review Matched Candidates', desc: 'Receive pre-screened applicants who hold relevant certifications and fit your requirements.', icon: Search },
  { num: 3, title: 'Interview & Hire', desc: 'You conduct interviews and make the hire. No placement fees.', icon: UserCheck },
  { num: 4, title: '90-Day Support', desc: 'We support your new hire’s onboarding. You get a team member who’s set up to succeed.', icon: Handshake },
];

const EMPLOYER_COMMITMENTS = [
  {
    icon: ShieldCheck,
    title: 'Pre-Screened Pipeline',
    desc: 'Every candidate completes skills assessment and workforce readiness before we refer them. You get vetted talent, not cold resumes.',
  },
  {
    icon: Award,
    title: 'Industry Credentials',
    desc: 'Google, IBM, AWS, Microsoft, CompTIA — the same certifications you hire against. No generic certificates.',
  },
  {
    icon: Handshake,
    title: '90-Day Post-Hire Support',
    desc: 'We stay involved after the hire. Onboarding, check-ins, and support so your new team member succeeds.',
  },
];

const PARTNERSHIP_OPTIONS = [
  {
    title: 'Job Postings (Free)',
    features: ['Post unlimited jobs', 'Access to active students and alumni', 'Direct candidate introductions'],
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
      {/* Hero */}
      <section className="page-hero employers-hero">
        <div className="page-hero-content">
          <h1>Hire Certified, Job-Ready Tech Talent</h1>
          <p>
            Pre-screened graduates with industry credentials — Google, IBM, AWS, CompTIA. Workforce readiness built in. 90-day post-hire support so your hire succeeds.
          </p>
          <div className="hero-actions" style={{ marginTop: '1.5rem', marginBottom: 0 }}>
            <Link href="/employer" className="btn btn-accent btn-large">
              Post a Job (Free)
            </Link>
            <Link href="#employer-contact" className="btn btn-ghost btn-large">
              Become a Hiring Partner
            </Link>
            <a href="tel:5127771808" className="btn btn-ghost btn-large">
              Call (512) 777-1808
            </a>
          </div>
        </div>
      </section>

      {/* Why Hire Our Graduates */}
      <section className="content-section employers-why-section">
        <div className="container">
          <div className="section-header animate-on-scroll" style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2>Why Hire Our Graduates</h2>
            <p className="section-subtitle" style={{ marginBottom: 0 }}>
              Pre-screened, certified, and supported talent ready for your team
            </p>
          </div>
          <div className="employers-three-col">
            {WHY_HIRE.map((item, idx) => (
              <div key={item.title} className="employers-why-card animate-on-scroll">
                <span className="employers-why-icon">
                  <item.icon size={32} className="text-current" />
                </span>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Photo Highlight */}
      <PhotoHighlight
        imageUrl="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1400&q=80"
        label="Employer Partnerships"
        title="Job-Ready Tech Talent"
        description="Our graduates hold industry certifications, complete workforce readiness training, and are backed by 90-day post-hire support. We're currently serving the Austin area and building toward expansion."
      />

      {/* Available Talent - Program Cards */}
      <section className="content-section employers-programs-section">
        <div className="container">
          <div className="section-header animate-on-scroll" style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2>Available Talent</h2>
            <p className="section-subtitle" style={{ marginBottom: 0 }}>
              Graduate profiles by program and certification
            </p>
          </div>
          <div className="employers-program-cards">
            {PROGRAMS.map((prog, idx) => (
              <div key={prog.name} className="employers-program-card animate-on-scroll">
                <span className="employers-program-icon">
                  <prog.icon size={24} className="text-current" />
                </span>
                <h3>{prog.name}</h3>
                <p className="employers-program-cert">{prog.cert}</p>
                <div className="employers-program-meta">
                  <span>{prog.level}</span>
                  <span className="employers-program-salary">{prog.salary}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="employers-programs-footnote">
            Ranges are the same published starting bands as our public program catalog — see{' '}
            <Link href="/programs">Programs</Link> and <Link href="/salary-guide">Salary guide</Link> for full context.
            Actual offers depend on employer, proof, and market.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="content-section employers-how-section">
        <div className="container">
          <div className="section-header animate-on-scroll" style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2>How It Works</h2>
            <p className="section-subtitle" style={{ marginBottom: 0 }}>
              Four simple steps from posting to partnership
            </p>
          </div>
          <div className="employers-how-steps">
            {HOW_IT_WORKS.map((step, idx) => (
              <div key={step.num} className="employers-how-step animate-on-scroll">
                <div className="employers-how-num">{step.num}</div>
                <div className="employers-how-content">
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
                {idx < HOW_IT_WORKS.length - 1 && (
                  <div className="employers-how-arrow" aria-hidden="true">
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Partner With Us — commitments, not placeholders */}
      <section className="content-section employers-commitments-section">
        <div className="container">
          <div className="section-header animate-on-scroll" style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2>Why Employers Partner With Us</h2>
            <p className="section-subtitle" style={{ marginBottom: 0 }}>
              Pre-screened, certified, and supported — we deliver talent that fits
            </p>
          </div>
          <div className="employers-three-col">
            {EMPLOYER_COMMITMENTS.map((item) => (
              <div key={item.title} className="employers-why-card animate-on-scroll">
                <span className="employers-why-icon">
                  <item.icon size={32} className="text-current" />
                </span>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hiring Partnership Options */}
      <section className="content-section employers-partnership-section">
        <div className="container">
          <div className="section-header animate-on-scroll" style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2>Hiring Partnership Options</h2>
            <p className="section-subtitle" style={{ marginBottom: 0 }}>
              Choose the level that fits your hiring needs
            </p>
          </div>
          <div className="employers-partnership-cards">
            {PARTNERSHIP_OPTIONS.map((opt) => (
              <div
                key={opt.title}
                className={`employers-partnership-card animate-on-scroll ${opt.featured ? 'featured' : ''}`}
              >
                {opt.featured && <span className="employers-partnership-badge">Most Popular</span>}
                <h3>{opt.title}</h3>
                <ul>
                  {opt.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <Link href={opt.href} className="btn btn-primary">
                  {opt.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section id="employer-contact" className="content-section employers-contact-section">
        <div className="container">
          <div className="employers-contact-inner">
            <div className="employers-contact-content animate-on-scroll">
              <h2>Ready to Hire?</h2>
              <p>
                Let&rsquo;s discuss your hiring needs and how WorkforceAP can help. Fill out the form or reach out
                directly.
              </p>
              <div
                className="employers-direct-contact"
                style={{
                  marginTop: '2rem',
                  padding: '1.5rem',
                  background: 'var(--color-light)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-gray-200)',
                }}
              >
                <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Direct contact</p>
                <p style={{ marginBottom: '0.25rem' }}>
                  <strong>Michael Brown</strong>
                </p>
                <p style={{ marginBottom: '0.25rem' }}>
                  <a href="mailto:michael.brown@workforceap.org" style={{ color: 'var(--color-accent)' }}>
                    michael.brown@workforceap.org
                  </a>
                </p>
                <p>
                  <a href="tel:5127771808" style={{ color: 'var(--color-accent)' }}>
                    (512) 777-1808
                  </a>
                </p>
              </div>
            </div>
            <div className="employers-contact-form-wrap animate-on-scroll">
              <EmployerContactForm />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
