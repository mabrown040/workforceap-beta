import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
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
    title: 'Verified skills',
    desc: 'All graduates complete skills assessments and earn certifications from Google, IBM, Microsoft, AWS, and CompTIA.',
  },
  {
    icon: Users,
    title: 'Pipeline with purpose',
    desc: 'Access motivated candidates from underserved communities, career changers, and veterans.',
  },
  {
    icon: Headphones,
    title: 'Post-hire support',
    desc: 'We provide 90-day post-hire support to strengthen onboarding and retention.',
  },
];

const PROGRAMS = [
  { name: 'IT Support', cert: 'IBM Professional Certificate', level: 'Entry-level', salary: '$55K–$72K', icon: Briefcase },
  { name: 'Cybersecurity', cert: 'Google / CompTIA pathway', level: 'Entry to mid', salary: '$75K–$112K', icon: ShieldCheck },
  { name: 'Cloud (AWS)', cert: 'AWS Cloud Technology', level: 'Entry to mid', salary: '$95K–$145K', icon: Cloud },
  { name: 'Data Analytics', cert: 'Google Data Analytics', level: 'Entry-level', salary: '$72K–$102K', icon: BarChart3 },
  { name: 'Software Developer', cert: 'IBM', level: 'Entry-level', salary: '$78K–$98K', icon: Code },
  { name: 'Project Management', cert: 'Microsoft', level: 'Entry to mid', salary: '$82K–$112K', icon: FolderKanban },
];

const HOW_IT_WORKS = [
  { num: 1, title: 'Share your hiring need', desc: 'Tell us about the role, target skills, and timeline. We use that information to match talent from our pipeline.', icon: FileText },
  { num: 2, title: 'Review matched candidates', desc: 'Receive pre-screened applicants who hold relevant certifications and fit your requirements.', icon: Search },
  { num: 3, title: 'Interview and hire', desc: 'Your team runs the interview process and makes the hiring decision. No placement fees.', icon: UserCheck },
  { num: 4, title: 'Support onboarding', desc: 'We stay involved for 90 days so the new hire and your team both have support.', icon: Handshake },
];

const EMPLOYER_COMMITMENTS = [
  {
    icon: ShieldCheck,
    title: 'Pre-screened pipeline',
    desc: 'Every candidate completes skills assessment and workforce readiness before we refer them. You get vetted talent, not cold resumes.',
  },
  {
    icon: Award,
    title: 'Industry credentials',
    desc: 'Google, IBM, AWS, Microsoft, and CompTIA — the same certifications you hire against. No generic certificates.',
  },
  {
    icon: Handshake,
    title: '90-day post-hire support',
    desc: 'We stay involved after the hire with onboarding check-ins and support.',
  },
];

const PARTNERSHIP_OPTIONS = [
  {
    title: 'Post a role',
    features: ['Share current openings', 'Access active students and alumni', 'Receive direct candidate introductions'],
    cta: 'Hire talent',
    href: '#employer-contact',
    featured: false,
  },
  {
    title: 'Become a hiring partner',
    features: ['First access to graduating cohorts', 'Input on curriculum design', 'Co-branded success stories', 'Quarterly hiring events'],
    cta: 'Hire talent',
    href: '#employer-contact',
    featured: true,
  },
  {
    title: 'Plan a workforce conversation',
    features: ['Upskilling exploration', 'Custom pathway discussion', 'Group and cohort planning'],
    cta: 'Contact WorkforceAP',
    href: '#employer-contact',
    featured: false,
  },
];

export default function EmployersPage() {
  return (
    <div className="inner-page">
      <section className="page-hero employers-hero">
        <div className="page-hero-content">
          <h1>Hire talent from WorkforceAP&apos;s certified pipeline</h1>
          <p>
            This page is for employers. WorkforceAP offers pre-screened candidates, recognized credentials, and post-hire support so your team can hire with more confidence.
          </p>
          <div className="hero-actions" style={{ marginTop: '1.5rem', marginBottom: 0 }}>
            <Link href="#employer-contact" className="btn btn-accent btn-large">
              Hire talent
            </Link>
            <Link href="/contact" className="btn btn-ghost btn-large">
              Contact WorkforceAP
            </Link>
            <Link href="/programs" className="btn btn-ghost btn-large">
              Explore programs
            </Link>
          </div>
        </div>
      </section>

      <section className="content-section" style={{ paddingBottom: 0 }}>
        <div className="container">
          <div className="mission-vision-grid">
            <div className="mv-card animate-on-scroll">
              <h2>Who this is for</h2>
              <p>Hiring managers, talent teams, and employer partners who want a clearer route to entry-level and early-career talent.</p>
            </div>
            <div className="mv-card animate-on-scroll">
              <h2>What WorkforceAP offers</h2>
              <p>A vetted pipeline of members who complete training, workforce readiness, certification, and coordinated support before referral.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="content-section employers-why-section">
        <div className="container">
          <div className="section-header animate-on-scroll" style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2>Why employers use WorkforceAP</h2>
            <p className="section-subtitle" style={{ marginBottom: 0 }}>
              Less noise, more signal, and a stronger handoff into hiring.
            </p>
          </div>
          <div className="employers-three-col">
            {WHY_HIRE.map((item) => (
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

      <PhotoHighlight
        imageUrl="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1400&q=80"
        label="Employer Partnerships"
        title="A clearer hiring journey"
        description="Employers do not need to decode the program model on every page. This route keeps the next action focused on hiring talent or starting a partnership conversation."
      />

      <section className="content-section employers-programs-section">
        <div className="container">
          <div className="section-header animate-on-scroll" style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2>Programs behind the talent pipeline</h2>
            <p className="section-subtitle" style={{ marginBottom: 0 }}>
              Use this snapshot to understand the types of roles members are preparing for.
            </p>
            <p className="section-subtitle" style={{ marginTop: '0.75rem', marginBottom: 0, fontSize: '0.9rem', maxWidth: '640px', marginInline: 'auto' }}>
              Ranges match our published program outcomes. For deeper detail, review the <Link href="/programs">program catalog</Link> and <Link href="/salary-guide">salary guide</Link>.
            </p>
          </div>
          <div className="employers-program-cards">
            {PROGRAMS.map((prog) => (
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

      <section className="content-section employers-how-section">
        <div className="container">
          <div className="section-header animate-on-scroll" style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2>How to hire talent through WorkforceAP</h2>
            <p className="section-subtitle" style={{ marginBottom: 0 }}>
              Four steps from first conversation to onboarding support.
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

      <section className="content-section employers-commitments-section">
        <div className="container">
          <div className="section-header animate-on-scroll" style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2>What employers can expect</h2>
            <p className="section-subtitle" style={{ marginBottom: 0 }}>
              Clear expectations, consistent credentials, and support beyond the handoff.
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

      <section className="content-section employers-partnership-section">
        <div className="container">
          <div className="section-header animate-on-scroll" style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2>Choose the right employer path</h2>
            <p className="section-subtitle" style={{ marginBottom: 0 }}>
              Keep the next action simple: hire talent or contact WorkforceAP.
            </p>
          </div>
          <div className="employers-partnership-cards">
            {PARTNERSHIP_OPTIONS.map((opt) => (
              <div
                key={opt.title}
                className={`employers-partnership-card animate-on-scroll ${opt.featured ? 'featured' : ''}`}
              >
                {opt.featured && <span className="employers-partnership-badge">Recommended</span>}
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

      <section id="employer-contact" className="content-section employers-contact-section">
        <div className="container">
          <div className="employers-contact-inner">
            <div className="employers-contact-content animate-on-scroll">
              <h2>What to do next</h2>
              <p>
                Share your hiring need here if you want candidate introductions. If you need a broader conversation first, contact WorkforceAP directly.
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
                <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--color-gray-600)', lineHeight: 1.5 }}>
                  The web form on this page delivers to <strong>info@workforceap.org</strong>. Use Michael&apos;s email when you already have a direct relationship.
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
