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

export default function HomePage() {
  const journeySteps = [
    { num: 1, title: 'Apply', desc: '5-minute form. We respond within 24–48 hours.' },
    { num: 2, title: 'Overview', desc: 'Meet a counselor. Learn which program fits you — no exam, no gatekeeping.' },
    { num: 3, title: 'Interview', desc: '30 minutes. We confirm mutual fit and answer your questions.' },
    { num: 4, title: 'Membership', desc: 'Join free — no cost to qualifying participants.' },
    { num: 5, title: 'Assessment', desc: 'Skills and goals. We match you to the right path.' },
    { num: 6, title: 'Readiness', desc: 'Soft skills and job-search basics — what employers expect.' },
    { num: 7, title: 'Resources', desc: 'Tools, network, loaner laptop on completion.' },
    { num: 8, title: 'Training', desc: 'Industry certification courses. Same credentials employers hire for.' },
    { num: 9, title: 'Certify', desc: 'Earn credentials. Proof that sticks on your resume.' },
    { num: 10, title: 'Placement', desc: 'We support you until you land. Resume, interviews, employer intros.' },
  ];

  return (
    <div className="homepage">
      {/* Hero */}
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
            Empowering People. <br />
            <span className="accent">Advancing Futures.</span>
          </h1>
          <div className="hero-no-cost-badge">✦ No-cost training for qualifying participants</div>
          <p className="hero-subtitle">
            Career training and certifications in Tech, Data, AI, Healthcare, Manufacturing, and Skilled Trades. Launching in Austin. Employer-aligned. Building toward more.
          </p>
          <div className="hero-actions hero-actions-prominent">
            <Link href="/apply" className="btn btn-accent btn-large">
              Apply Now — It Takes 5 Minutes
            </Link>
            <Link href="/find-your-path" className="btn btn-ghost">
              Find Your Path →
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

      {/* Stats — trust-bearing, category-defining */}
      <section className="stats-bar">
        <div className="stats-container">
          <p className="stats-trust-line">Employer-aligned. No participant debt. Success = you get hired.</p>
          <div className="stats-row">
            <div className="stat"><span className="stat-number">19</span><span className="stat-label">Programs</span></div>
            <div className="stat"><span className="stat-number">$0</span><span className="stat-label">Cost to Qualifying Participants</span></div>
            <div className="stat"><span className="stat-number">16–20</span><span className="stat-label">Weeks to Certification</span></div>
            <div className="stat"><span className="stat-number">24–48h</span><span className="stat-label">Response Time</span></div>
            <div className="stat"><span className="stat-number">100%</span><span className="stat-label">Job Search Support</span></div>
          </div>
        </div>
      </section>

      {/* Who we serve — members, employers, partners */}
      <section className="home-audiences" aria-labelledby="home-audiences-heading">
        <div className="container">
          <h2 id="home-audiences-heading" className="home-section-title">
            Who WorkforceAP is for
          </h2>
          <p className="home-audiences-lead">
            One training-and-placement operating model with clear front doors. Austin is where we are proving it first.
          </p>
          <div className="home-audiences-grid">
            <div className="home-audience-card animate-on-scroll">
              <span className="home-audience-icon" aria-hidden>
                <Users size={28} />
              </span>
              <h3>Members &amp; job seekers</h3>
              <p>
                No-cost industry certifications and counselor support for qualifying participants — from intake through job search.
              </p>
              <div className="home-audience-links">
                <Link href="/apply" className="btn btn-primary btn-sm">
                  Apply
                </Link>
                <Link href="/find-your-path" className="btn btn-outline btn-sm">
                  2-min quiz
                </Link>
              </div>
            </div>
            <div className="home-audience-card animate-on-scroll">
              <span className="home-audience-icon" aria-hidden>
                <Building2 size={28} />
              </span>
              <h3>Employers</h3>
              <p>
                Post roles, review certify-ready candidates, and hire from a pipeline trained on the credentials you already recognize.
              </p>
              <div className="home-audience-links">
                <Link href="/employers" className="btn btn-primary btn-sm">
                  Employer overview
                </Link>
                <Link href="/jobs" className="btn btn-outline btn-sm">
                  Public job board
                </Link>
              </div>
            </div>
            <div className="home-audience-card animate-on-scroll">
              <span className="home-audience-icon" aria-hidden>
                <Handshake size={28} />
              </span>
              <h3>Community partners</h3>
              <p>
                Churches, nonprofits, and referral organizations: track referrals, stay in the loop on milestones, and send people to a single apply path.
              </p>
              <div className="home-audience-links">
                <Link href="/partners" className="btn btn-primary btn-sm">
                  Partner with us
                </Link>
                <Link href="/contact" className="btn btn-outline btn-sm">
                  Contact
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For You: fit + what you get — orchestrated persuasion */}
      <section className="home-for-you">
        <div className="container">
          <h2 className="home-section-title">For you, if you&rsquo;re ready to launch</h2>
          <p className="home-for-you-lead">
            Underserved individuals, adult learners, veterans. No prior tech required. We&rsquo;re currently serving the Austin area — our launch community — and building toward more. If that&rsquo;s you, here&rsquo;s what you get:
          </p>
          <div className="wyg-grid">
            <div className="wyg-card animate-on-scroll">
              <span className="wyg-icon"><Award size={28} className="text-current" /></span>
              <h3>Industry Certifications</h3>
              <p>Google, IBM, Microsoft, Amazon, CompTIA — the same credentials employers hire against. Real credentials, not completion certificates.</p>
            </div>
            <div className="wyg-card animate-on-scroll">
              <span className="wyg-icon"><Laptop size={28} className="text-current" /></span>
              <h3>Loaner Laptop</h3>
              <p>Earn a refurbished laptop on completion. Hardware is never a barrier.</p>
            </div>
            <div className="wyg-card animate-on-scroll">
              <span className="wyg-icon"><Handshake size={28} className="text-current" /></span>
              <h3>Job Placement</h3>
              <p>Resume support, interview prep, employer connections from day one through hire. We don&rsquo;t disappear after you certify.</p>
            </div>
          </div>
          <div className="home-for-you-cta">
            <Link href="/find-your-path" className="btn btn-outline">Not sure which program fits? Take the 2-min quiz →</Link>
          </div>
        </div>
      </section>

      {/* How it works — applicant-benefit-driven, confidence-building */}
      <section className="process-flow-section">
        <div className="process-flow-inner">
          <div className="process-flow-header animate-on-scroll">
            <h2>Your Journey With Us</h2>
            <p>Clear steps. No surprises. We tell you what happens at each stage so you can move forward with confidence.</p>
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
            <Link href="/how-it-works" className="btn btn-secondary">See Full Process</Link>
          </div>
        </div>
      </section>

      {/* Why trust: leadership depth, local roots, broader ambition */}
      <section className="about-section home-trust-anchor">
        <div className="container">
          <div className="about-grid">
            <div className="about-content">
              <span className="section-label">Who We Are</span>
              <h2>25+ Years Breaking Barriers</h2>
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
                <Link href="/leadership" className="btn btn-primary">Meet Our Team</Link>
                <Link href="/what-we-do" className="btn btn-outline">Full Mission &amp; Vision</Link>
              </div>
            </div>
            <div className="programs-preview">
              <span className="section-label">Programs</span>
              <h3>Careers That Pay — From $48K to $145K</h3>
              <p>19 programs across Tech, Healthcare, Manufacturing, and Skilled Trades. Each path leads to real roles: IT support, cybersecurity, data analytics, project management, medical coding, and more.</p>
              <ul className="program-categories">
                <li><span className="cat-icon"><Monitor size={20} className="text-current" /></span> Digital Literacy &amp; AI</li>
                <li><span className="cat-icon"><Wifi size={20} className="text-current" /></span> Information Technology</li>
                <li><span className="cat-icon"><ClipboardList size={20} className="text-current" /></span> Project Management</li>
                <li><span className="cat-icon"><HeartPulse size={20} className="text-current" /></span> Medical Coding</li>
                <li><span className="cat-icon"><Factory size={20} className="text-current" /></span> Manufacturing</li>
                <li><span className="cat-icon"><HardHat size={20} className="text-current" /></span> Core Construction</li>
              </ul>
              <div className="programs-preview-actions">
                <Link href="/find-your-path" className="btn btn-primary btn-sm">Find Your Fit (2-min quiz)</Link>
                <Link href="/programs" className="btn btn-outline btn-sm">View All 19 Programs</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What to do next — decisive, intentional */}
      <section className="footer-cta">
        <div className="container">
          <h2>Your Next Step</h2>
          <p>Apply now — under 10 minutes. We respond within 24–48 hours. Real certifications. Employer connections. No cost to qualifying participants.</p>
          <Link href="/apply" className="btn btn-primary btn-large">Start Your Application</Link>
          <p className="footer-cta-sub"><Link href="/find-your-path">Not sure yet? Take the pathfinder quiz first.</Link></p>
        </div>
      </section>

      <Footer variant="home" />
    </div>
  );
}
