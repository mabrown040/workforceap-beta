import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import Image from 'next/image';
import {
  Monitor,
  Wifi,
  ClipboardList,
  HeartPulse,
  Factory,
  HardHat,
  Award,
  Laptop,
  Handshake,
  Users,
  Building2,
} from 'lucide-react';
import Footer from '@/components/Footer';

export const metadata: Metadata = buildPageMetadata({
  title: 'Home',
  description:
    'Career training and industry certifications. Employer-aligned. No cost to qualifying participants. Launching in Austin, building toward more. Tech, Data, AI, Healthcare, Manufacturing, and Skilled Trades.',
  path: '/',
});

const AUDIENCE_PATHS = [
  {
    title: 'For members',
    summary: 'Explore no-cost training, certifications, and job placement support.',
    primaryHref: '/apply',
    primaryLabel: 'Apply',
    secondaryHref: '/programs',
    secondaryLabel: 'Explore programs',
  },
  {
    title: 'For employers',
    summary: 'Hire certified, job-ready talent and shape your future pipeline.',
    primaryHref: '/employers',
    primaryLabel: 'Hire talent',
    secondaryHref: '/contact',
    secondaryLabel: 'Contact WorkforceAP',
  },
  {
    title: 'For partners',
    summary: 'Refer community members and coordinate around one shared workforce journey.',
    primaryHref: '/contact',
    primaryLabel: 'Contact WorkforceAP',
    secondaryHref: '/what-we-do',
    secondaryLabel: 'What WorkforceAP offers',
  },
];

export default function HomePage() {
  const journeySteps = [
    { num: 1, title: 'Apply', desc: 'Short online form — about 10 minutes. We respond within 24–48 hours.' },
    { num: 2, title: 'Overview', desc: 'Meet a counselor. Learn which program fits you — no exam, no gatekeeping.' },
    { num: 3, title: 'Interview', desc: '30 minutes. We confirm mutual fit and answer your questions.' },
    { num: 4, title: 'Membership', desc: 'Join free — no cost to qualifying participants.' },
    { num: 5, title: 'Assessment', desc: 'Skills and goals. We match you to the right path.' },
    { num: 6, title: 'Readiness', desc: 'Soft skills and job-search basics — what employers expect.' },
    { num: 7, title: 'Resources', desc: 'Tools, network, and loaner laptop program when you complete training (program-dependent).' },
    { num: 8, title: 'Training', desc: 'Industry certification courses. Same credentials employers hire for.' },
    { num: 9, title: 'Certify', desc: 'Earn credentials. Proof that sticks on your resume.' },
    { num: 10, title: 'Placement', desc: 'We support you until you land — resume, interviews, and employer intros.' },
    {
      num: 11,
      title: 'Outcomes',
      desc: 'A role that pays, with room to grow. Many graduates see strong wage gains within a few years.',
    },
  ];

  return (
    <div className="homepage">
      <section className="hero" aria-label="Hero">
        <Image
          src="/images/austin-skyline.jpg"
          alt="Austin skyline at sunset"
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="hero-bg-image"
        />
        <div className="hero-overlay" />
        <div className="hero-container">
          <h1 className="hero-title">
            WorkforceAP connects <br />
            <span className="accent">members, employers, and partners.</span>
          </h1>
          <div className="hero-no-cost-badge">✦ Austin launch market · no-cost training for qualifying participants</div>
          <p className="hero-subtitle">
            Members get employer-aligned training and job placement support. Employers get certified talent. Partners get a trusted referral path with one clear next step for every audience.
          </p>
          <div className="hero-actions hero-actions-prominent">
            <Link href="/apply" className="btn btn-accent btn-large">
              Apply
            </Link>
            <Link href="/programs" className="btn btn-ghost">
              Explore programs →
            </Link>
          </div>
          <div className="trust-strip">
            <span>Trusted by partners including</span>
            <div className="trust-logos">
              <Image src="/images/Google_2015_logo.svg.png" alt="Google" width={80} height={27} loading="lazy" />
              <Image src="/images/att-logo.png" alt="AT&amp;T" width={60} height={24} loading="lazy" />
              <Image src="/images/coursera.png" alt="Coursera" width={100} height={24} loading="lazy" />
              <Image src="/images/microsoft-logo.svg" alt="Microsoft" width={100} height={24} loading="lazy" />
              <Image src="/images/ibm-logo.svg" alt="IBM" width={60} height={24} loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      <section className="stats-bar">
        <div className="stats-container">
          <p className="stats-trust-line">Employer-aligned. No participant debt. Clear paths for members, employers, and partners.</p>
          <div className="stats-row">
            <div className="stat"><span className="stat-number">19</span><span className="stat-label">Programs</span></div>
            <div className="stat"><span className="stat-number">$0</span><span className="stat-label">Cost to Qualifying Participants</span></div>
            <div className="stat"><span className="stat-number">16–20</span><span className="stat-label">Weeks to Certification</span></div>
            <div className="stat"><span className="stat-number">24–48h</span><span className="stat-label">Response Time</span></div>
            <div className="stat"><span className="stat-number">100%</span><span className="stat-label">Job Search Support</span></div>
          </div>
        </div>
      </section>

      <section className="home-audiences" aria-labelledby="home-audiences-heading">
        <div className="container">
          <h2 id="home-audiences-heading" className="home-section-title">
            Start from the right front door
          </h2>
          <p className="home-audiences-lead">
            Every public page should make the next step obvious. These are the three journeys WorkforceAP is designed to support.
          </p>
          <div className="home-audiences-grid">
            {AUDIENCE_PATHS.map((path, index) => (
              <div key={path.title} className="home-audience-card animate-on-scroll">
                <span className="home-audience-icon" aria-hidden>
                  {index === 0 ? <Users size={28} /> : index === 1 ? <Building2 size={28} /> : <Handshake size={28} />}
                </span>
                <h3>{path.title}</h3>
                <p>{path.summary}</p>
                <div className="home-audience-links">
                  <Link href={path.primaryHref} className="btn btn-primary btn-sm">
                    {path.primaryLabel}
                  </Link>
                  <Link href={path.secondaryHref} className="btn btn-outline btn-sm">
                    {path.secondaryLabel}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="home-for-you">
        <div className="container">
          <h2 className="home-section-title">For members: what WorkforceAP offers</h2>
          <p className="home-for-you-lead">
            If you are a job seeker, adult learner, or career changer in the Austin launch market, WorkforceAP is built to help you choose a program, earn a recognized credential, and move toward a better-paying role.
          </p>
          <div className="wyg-grid">
            <div className="wyg-card animate-on-scroll">
              <span className="wyg-icon"><Award size={28} className="text-current" /></span>
              <h3>Industry certifications</h3>
              <p>Google, IBM, Microsoft, Amazon, CompTIA — credentials employers already recognize.</p>
            </div>
            <div className="wyg-card animate-on-scroll">
              <span className="wyg-icon"><Laptop size={28} className="text-current" /></span>
              <h3>Support that removes barriers</h3>
              <p>Readiness coaching, tools, and a loaner laptop pathway so training stays accessible.</p>
            </div>
            <div className="wyg-card animate-on-scroll">
              <span className="wyg-icon"><Handshake size={28} className="text-current" /></span>
              <h3>Placement help through hire</h3>
              <p>Resume support, interview prep, and employer introductions from day one through job search.</p>
            </div>
          </div>
          <div className="home-for-you-cta">
            <Link href="/programs" className="btn btn-outline">Explore programs →</Link>
          </div>
        </div>
      </section>

      <section className="process-flow-section">
        <div className="process-flow-inner">
          <div className="process-flow-header animate-on-scroll">
            <h2>For members: what to do next</h2>
            <p>
              Start with the application, then move through the same guided journey shown on our{' '}
              <Link href="/how-it-works" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                How it works
              </Link>{' '}
              page.
            </p>
          </div>
          <div className="process-steps">
            {journeySteps.map((step, index) => (
              <div key={step.num} className="process-item">
                <div className="process-step" data-delay={String(index * 80)}>
                  <div className="step-number" aria-label={`Step ${step.num}`}>{step.num}</div>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
                {index < journeySteps.length - 1 && <div className="step-arrow" aria-hidden="true" />}
              </div>
            ))}
          </div>
          <div className="process-cta animate-on-scroll">
            <Link href="/apply" className="btn btn-secondary">Apply</Link>
          </div>
        </div>
      </section>

      <section className="home-social-proof" aria-labelledby="home-social-proof-heading">
        <div className="container">
          <h2 id="home-social-proof-heading" className="home-section-title">
            Proof, context, and partner confidence
          </h2>
          <p className="home-social-proof-lead">
            Use these pages when you want to understand the model, review leadership, or share WorkforceAP with another stakeholder.
          </p>
          <div className="home-social-proof-actions">
            <Link href="/what-we-do" className="btn btn-primary btn-sm">
              What WorkforceAP offers
            </Link>
            <Link href="/leadership" className="btn btn-outline btn-sm">
              Leadership &amp; board
            </Link>
            <Link href="/contact" className="btn btn-outline btn-sm">
              Contact WorkforceAP
            </Link>
          </div>
        </div>
      </section>

      <section className="about-section home-trust-anchor">
        <div className="container">
          <div className="about-grid">
            <div className="about-content">
              <span className="section-label">Who We Are</span>
              <h2>25+ years of workforce development experience</h2>
              <p>
                Founded by Michael Brown, PMP — a workforce leader who has trained thousands across the Austin Metro and statewide. Through Consulting Solutions.Net, Goodwill Career &amp; Technical Academy, Austin Area Urban League, Universal Tech Movement, and African American Youth Harvest Foundation, we deliver the wrap-around services that launch careers. Austin is our launch community; we&rsquo;re building toward national scale.
              </p>
              <div className="about-stats">
                <div className="about-stat"><span className="stat-num">25+</span><span className="stat-desc">Years Experience</span></div>
                <div className="about-stat"><span className="stat-num">2,000+</span><span className="stat-desc">Trained</span></div>
                <div className="about-stat"><span className="stat-num">Austin</span><span className="stat-desc">Launch Community</span></div>
              </div>
              <div className="partner-logos-small">
                <Image src="/images/Google_2015_logo.svg.png" alt="Google" width={80} height={27} />
                <Image src="/images/att-logo.png" alt="AT&amp;T" width={60} height={24} />
                <Image src="/images/coursera.png" alt="Coursera" width={100} height={24} />
                <Image src="/images/microsoft-logo.svg" alt="Microsoft" width={100} height={24} />
                <Image src="/images/ibm-logo.svg" alt="IBM" width={60} height={24} />
              </div>
              <div className="about-actions">
                <Link href="/what-we-do" className="btn btn-primary">What WorkforceAP offers</Link>
                <Link href="/contact" className="btn btn-outline">Contact WorkforceAP</Link>
              </div>
            </div>
            <div className="programs-preview">
              <span className="section-label">Programs</span>
              <h3>Distinct routes, one operating model</h3>
              <p>Members explore programs and apply. Employers hire talent. Partners send referrals and stay connected to progress. Every path starts from a clearer public experience.</p>
              <ul className="program-categories">
                <li><span className="cat-icon"><Monitor size={20} className="text-current" /></span> Digital Literacy &amp; AI</li>
                <li><span className="cat-icon"><Wifi size={20} className="text-current" /></span> Information Technology</li>
                <li><span className="cat-icon"><ClipboardList size={20} className="text-current" /></span> Project Management</li>
                <li><span className="cat-icon"><HeartPulse size={20} className="text-current" /></span> Medical Coding</li>
                <li><span className="cat-icon"><Factory size={20} className="text-current" /></span> Manufacturing</li>
                <li><span className="cat-icon"><HardHat size={20} className="text-current" /></span> Core Construction</li>
              </ul>
              <div className="programs-preview-actions">
                <Link href="/programs" className="btn btn-primary btn-sm">Explore programs</Link>
                <Link href="/employers" className="btn btn-outline btn-sm">Hire talent</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="footer-cta">
        <div className="container">
          <h2>Choose your next step</h2>
          <p>Apply if you are ready to start. Explore programs if you need to compare options. Hire talent if you are an employer. Contact WorkforceAP if you need guidance.</p>
          <div className="hero-actions" style={{ justifyContent: 'center', marginTop: '1.5rem' }}>
            <Link href="/apply" className="btn btn-primary btn-large">Apply</Link>
            <Link href="/programs" className="btn btn-outline btn-large">Explore programs</Link>
            <Link href="/contact" className="btn btn-outline btn-large">Contact WorkforceAP</Link>
          </div>
        </div>
      </section>

      <Footer variant="home" />
    </div>
  );
}
