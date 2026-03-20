import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import Image from 'next/image';
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
    "Access Austin's top emerging tech talent. WorkforceAP graduates are certified, job-ready, and supported. Post jobs free or become a hiring partner.",
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

const PROGRAMS = [
  { name: 'IT Support Specialist', cert: 'CompTIA A+', level: 'Entry-level', salary: '$42K–$55K', icon: Briefcase },
  { name: 'Cybersecurity Analyst', cert: 'Security+', level: 'Entry to mid', salary: '$55K–$75K', icon: ShieldCheck },
  { name: 'Cloud Practitioner', cert: 'AWS Certified', level: 'Entry-level', salary: '$50K–$70K', icon: Cloud },
  { name: 'Data Analyst', cert: 'Google Data Analytics', level: 'Entry-level', salary: '$48K–$65K', icon: BarChart3 },
  { name: 'Software Developer', cert: 'Full-stack training', level: 'Entry-level', salary: '$55K–$80K', icon: Code },
  { name: 'Project Manager', cert: 'CAPM/PMI', level: 'Entry to mid', salary: '$55K–$75K', icon: FolderKanban },
];

const HOW_IT_WORKS = [
  { num: 1, title: 'Post Your Opening', desc: 'Share job description and requirements', icon: FileText },
  { num: 2, title: 'Review Candidates', desc: 'We send pre-screened applicants who match', icon: Search },
  { num: 3, title: 'Interview & Hire', desc: 'You interview and select the best fit', icon: UserCheck },
  { num: 4, title: 'Ongoing Partnership', desc: "We support the new hire's first 90 days", icon: Handshake },
];

const TESTIMONIALS = [
  {
    quote: 'WorkforceAP graduates came prepared with real certifications and soft skills. The 90-day support made onboarding seamless.',
    name: 'Sarah Chen',
    company: 'Tech Solutions Inc.',
    logo: null,
  },
  {
    quote: 'We hired three graduates for our IT support team. They hit the ground running and have become valuable team members.',
    name: 'Marcus Johnson',
    company: 'Austin Digital Services',
    logo: null,
  },
  {
    quote: 'Partnering with WorkforceAP gave us access to motivated, diverse talent we wouldn\'t have found otherwise.',
    name: 'Jennifer Martinez',
    company: 'CloudFirst Technologies',
    logo: null,
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
          <h1>Hire Pre-Screened, Job-Ready Talent</h1>
          <p>
            WorkforceAP graduates complete rigorous training and earn industry-recognized certifications. Ready to
            contribute from day one.
          </p>
          <div className="hero-actions" style={{ marginTop: '1.5rem', marginBottom: 0 }}>
            <Link href="/employer" className="btn btn-accent btn-large">
              Employer Portal
            </Link>
            <Link href="#employer-contact" className="btn btn-ghost btn-large">
              Contact Us
            </Link>
            <a href="tel:5127771808" className="btn btn-ghost btn-large">
              Schedule a Call
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
        title="Austin&rsquo;s Emerging Tech Talent"
        description="Our graduates bring industry certifications, workforce readiness training, and the drive to succeed. Partner with us to build your team."
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

      {/* Employer Testimonials */}
      <section className="content-section employers-testimonials-section">
        <div className="container">
          <div className="section-header animate-on-scroll" style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2>What Employers Say</h2>
            <p className="section-subtitle" style={{ marginBottom: 0 }}>
              Placeholder testimonials — real stories coming soon
            </p>
          </div>
          <div className="employers-testimonials-grid">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="employers-testimonial-card animate-on-scroll">
                <span className="employers-quote-mark">&ldquo;</span>
                <p className="employers-testimonial-text">{t.quote}</p>
                <div className="employers-testimonial-author">
                  <strong>{t.name}</strong>
                  <span>{t.company}</span>
                </div>
                {t.logo && (
                  <div className="employers-testimonial-logo">
                    <Image src={t.logo} alt="" width={80} height={32} />
                  </div>
                )}
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
