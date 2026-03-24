import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import Link from 'next/link';
import Image from 'next/image';
import { getActivePrograms } from '@/lib/platform/programCatalog';
import { Laptop, GraduationCap, Briefcase, Handshake, Users, Building2 } from 'lucide-react';
import Footer from '@/components/Footer';

export const metadata: Metadata = buildPageMetadata({
  title: 'Free Tech Career Training in Austin, TX | Workforce Advancement Project',
  description:
    'Get no-cost career certification training in Tech, Data, AI, Cybersecurity, Healthcare, and Skilled Trades. Employer-aligned programs. Apply today — WorkforceAP serves Austin and beyond.',
  path: '/',
});

export default async function HomePage() {
  const activePrograms = await getActivePrograms();
  const featured = activePrograms.filter((p) => p.featured);
  const homeProgramShowcase = (featured.length ? featured : activePrograms).slice(0, 8);
  const programCount = activePrograms.length;

  const journeySteps = [
    { num: 1, title: 'Apply', desc: 'Short online form — about 10 minutes. We respond within 24–48 hours.' },
    { num: 2, title: 'Overview', desc: 'Meet a counselor. Learn which program fits you — no exam, no gatekeeping.' },
    { num: 3, title: 'Interview', desc: '30 minutes. We confirm mutual fit and answer your questions.' },
    { num: 4, title: 'Membership', desc: 'Join free — no cost to members.' },
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
          <div className="hero-no-cost-badge">✦ No-cost training for members</div>
          <p className="hero-subtitle">
            Career training and certifications in Tech, Data, AI, Healthcare, Manufacturing, and Skilled Trades. Launching in Austin. Employer-aligned. Building toward more.
          </p>
          <div className="hero-actions hero-actions-prominent">
            <Link href="/apply" className="btn btn-accent btn-large">
              Apply now — about 10 minutes
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
            <div className="stat"><span className="stat-number">$0</span><span className="stat-label">Cost to Members</span></div>
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
                No-cost industry certifications and counselor support for members — from intake through job search.
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

          <div className="home-partners-cta animate-on-scroll" style={{ marginTop: '2.5rem' }}>
            <h3 className="home-partners-cta__title">Refer your community</h3>
            <p className="home-partners-cta__text">
              Do you work with job-seekers at a church, community center, or workforce program? WorkforceAP partners refer
              clients and track their progress through a dedicated partner portal. No cost, no paperwork — just outcomes
              you can report.
            </p>
            <div className="home-audience-links" style={{ marginTop: '1rem' }}>
              <Link href="/partner-signup" className="btn btn-primary btn-sm">
                Register your organization →
              </Link>
              <Link href="/login?redirectTo=/partner" className="btn btn-outline btn-sm">
                Already a partner? Sign in →
              </Link>
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
          <ol className="home-outcome-journey" aria-label="What you receive in sequence">
            <li className="home-outcome-step animate-on-scroll">
              <span className="home-outcome-step__icon" aria-hidden>
                <Laptop size={28} strokeWidth={2} />
              </span>
              <p className="home-outcome-step__title">Loaner laptop</p>
              <p className="home-outcome-step__desc">Start equipped, not behind</p>
            </li>
            <li className="home-outcome-step animate-on-scroll">
              <span className="home-outcome-step__icon" aria-hidden>
                <GraduationCap size={28} strokeWidth={2} />
              </span>
              <p className="home-outcome-step__title">Career training</p>
              <p className="home-outcome-step__desc">Industry certs from Google, IBM, AWS</p>
            </li>
            <li className="home-outcome-step animate-on-scroll">
              <span className="home-outcome-step__icon" aria-hidden>
                <Briefcase size={28} strokeWidth={2} />
              </span>
              <p className="home-outcome-step__title">Job placement</p>
              <p className="home-outcome-step__desc">Employer-aligned placements</p>
            </li>
            <li className="home-outcome-step animate-on-scroll">
              <span className="home-outcome-step__icon" aria-hidden>
                <Handshake size={28} strokeWidth={2} />
              </span>
              <p className="home-outcome-step__title">90-day support</p>
              <p className="home-outcome-step__desc">Support after you&apos;re hired</p>
            </li>
          </ol>
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
            <p>
              Eleven milestones from apply to outcomes — same path as our{' '}
              <Link href="/how-it-works" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                full How it works
              </Link>{' '}
              page, shown here at a glance.
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
            <Link href="/how-it-works" className="btn btn-secondary">See Full Process</Link>
          </div>
        </div>
      </section>

      {/* Social proof — real destinations, no placeholder quotes */}
      <section className="home-social-proof" aria-labelledby="home-social-proof-heading">
        <div className="container">
          <h2 id="home-social-proof-heading" className="home-section-title">
            Stories &amp; proof points
          </h2>
          <p className="home-social-proof-lead">
            We don&apos;t use fabricated employer quotes. For real updates, graduate-focused writing, and who stands behind the work, use the links below.
          </p>
          <div className="home-social-proof-actions">
            <Link href="/blog" className="btn btn-primary btn-sm">
              Blog &amp; updates
            </Link>
            <Link href="/leadership" className="btn btn-outline btn-sm">
              Leadership &amp; board
            </Link>
            <Link href="/what-we-do" className="btn btn-outline btn-sm">
              What we do
            </Link>
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
              <span className="section-label">Available talent</span>
              <h3>Programs we certify members on</h3>
              <p>
                {programCount} active program{programCount === 1 ? '' : 's'} — Tech, Healthcare, Manufacturing, and Skilled Trades.
                Paths are managed in admin and stay aligned with what employers see.
              </p>
              <ul className="home-program-showcase" style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem' }}>
                {homeProgramShowcase.map((p) => (
                  <li
                    key={p.slug}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      padding: '0.45rem 0',
                      borderBottom: '1px solid rgba(0,0,0,0.06)',
                      fontSize: '0.9rem',
                    }}
                  >
                    <Link href={`/programs/${p.slug}`} style={{ fontWeight: 600, color: 'inherit', textDecoration: 'none' }}>
                      {p.static?.title ?? p.name}
                    </Link>
                    <span style={{ color: 'var(--color-gray-600)', whiteSpace: 'nowrap' }}>{p.category}</span>
                  </li>
                ))}
              </ul>
              <div className="programs-preview-actions">
                <Link href="/find-your-path" className="btn btn-primary btn-sm">Find Your Fit (2-min quiz)</Link>
                <Link href="/programs" className="btn btn-outline btn-sm">
                  View all {programCount} program{programCount === 1 ? '' : 's'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What to do next — decisive, intentional */}
      <section className="footer-cta">
        <div className="container">
          <h2>Your Next Step</h2>
          <p>Apply now — about 10 minutes. We respond within 24–48 hours. Real certifications. Employer connections. no cost to members.</p>
          <Link href="/apply" className="btn btn-primary btn-large">Start Your Application</Link>
          <p className="footer-cta-sub"><Link href="/find-your-path">Not sure yet? Take the pathfinder quiz first.</Link></p>
        </div>
      </section>

      <Footer variant="home" />
    </div>
  );
}
