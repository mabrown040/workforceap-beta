import Link from 'next/link';
import Image from 'next/image';
import Footer from '@/components/Footer';
import PhotoHighlight from '@/components/PhotoHighlight';

export default function HomePage() {
  const journeySteps = [
    { num: 1, title: 'Apply', desc: 'Quick online application' },
    { num: 2, title: 'Interview', desc: 'Meet your counselor' },
    { num: 3, title: 'Train', desc: 'Industry certifications' },
    { num: 4, title: 'Certify', desc: 'Earn credentials' },
    { num: 5, title: 'Get Hired', desc: 'Job placement assistance' },
  ];

  return (
    <div className="homepage">
      {/* Hero */}
      <section className="hero" aria-label="Hero">
        <div className="hero-overlay" />
        <div className="hero-container">
          <div className="hero-badge">&#x2B50; Austin Career Programs &bull; WorkforceAP</div>
          <h1 className="hero-title">Empowering People.<br /><span className="accent">Advancing Futures.</span></h1>
          <p className="hero-subtitle">Career training and industry certifications designed to launch careers in technology, data, AI, and skilled trades.</p>
          <div className="hero-actions">
            <Link href="/apply" className="btn btn-primary">Apply Now</Link>
            <Link href="/programs" className="btn btn-ghost">Explore Programs</Link>
          </div>
          <div className="trust-strip">
            <span>Trusted by partners including</span>
            <div className="trust-logos">
              <Image src="/images/Google_2015_logo.svg.png" alt="Google" width={80} height={27} loading="lazy" />
              <Image src="/images/att-logo.png" alt="AT&amp;T" width={60} height={24} loading="lazy" />
              <Image src="/images/coursera.png" alt="Coursera" width={100} height={24} loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="stats-bar">
        <div className="stats-container">
          <div className="stat"><span className="stat-number">19</span><span className="stat-label">Programs</span></div>
          <div className="stat"><span className="stat-number">16–20</span><span className="stat-label">Weeks to Certification</span></div>
          <div className="stat"><span className="stat-number">24h</span><span className="stat-label">Response Time</span></div>
          <div className="stat"><span className="stat-number">100%</span><span className="stat-label">Job Search Support</span></div>
        </div>
      </section>

      {/* Mission Photo Highlight */}
      <PhotoHighlight
        imageUrl="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1400&q=80"
        label="Our Mission"
        title="Breaking Systemic Barriers"
        description="We provide digital literacy, artificial intelligence, occupational, and professional certification training to underserved individuals, adult learners, and veteran populations."
        buttonText="Learn About Our Mission"
        buttonHref="/what-we-do"
      />

      {/* Vision & Mission */}
      <section className="vision-mission-section">
        <div className="container">
          <div className="vm-grid">
            <div className="vm-image">
              <Image src="/images/hero-people.jpg" alt="WorkforceAP Training" width={600} height={400} loading="lazy" />
            </div>
            <div className="vm-content">
              <span className="section-label">Our Vision &amp; Mission</span>
              <p>To empower individuals by delivering wrap-around services and resources which includes assessment, workforce readiness, resume enhancement, occupational training, stackable career pathways, industry-recognized certificates, and job placement assistance.</p>
              <Link href="/what-we-do" className="link-arrow">Learn More &#8594;</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Process Flow */}
      <section className="process-flow-section">
        <div className="process-flow-inner">
          <div className="process-flow-header animate-on-scroll">
            <h2>Your Journey With Us</h2>
            <p>From application to employment &mdash; see how it works</p>
          </div>
          <div className="process-steps">
            {journeySteps.map((step, index) => (
              <div key={step.num} className="process-item">
                <div className="process-step" data-delay={String(index * 80)}>
                  <div className="step-number" aria-label={`Step ${step.num}`}>{step.num}</div>
                  <h4>{step.title}</h4>
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

      {/* About Section */}
      <section className="about-section">
        <div className="container">
          <div className="about-grid">
            <div className="about-content">
              <span className="section-label">Who We Are</span>
              <h2>25+ Years Breaking Barriers</h2>
              <p>Founded by Michael Brown, PMP &mdash; a veteran workforce leader who has trained thousands of Austinites through Consulting Solutions.Net, Goodwill Career &amp; Technical Academy, and the Austin Area Urban League.</p>
              <div className="about-stats">
                <div className="about-stat"><span className="stat-num">25+</span><span className="stat-desc">Years Experience</span></div>
                <div className="about-stat"><span className="stat-num">Coursera</span><span className="stat-desc">Approved Partner</span></div>
                <div className="about-stat"><span className="stat-num">Austin</span><span className="stat-desc">Community Focus</span></div>
              </div>
              <div className="partner-logos-small">
                <Image src="/images/Google_2015_logo.svg.png" alt="Google" width={80} height={27} />
                <Image src="/images/att-logo.png" alt="AT&amp;T" width={60} height={24} />
                <Image src="/images/coursera.png" alt="Coursera" width={100} height={24} />
              </div>
              <Link href="/what-we-do" className="btn btn-primary">Learn More About Us</Link>
            </div>
            <div className="programs-preview">
              <span className="section-label">Our Programs</span>
              <h3>Industry-Recognized Training</h3>
              <p>Bridging the gap between people, talent, skills, and opportunity through partnerships with leading organizations.</p>
              <ul className="program-categories">
                <li><span className="cat-icon">&#x1F4BB;</span> Digital Literacy &amp; AI</li>
                <li><span className="cat-icon">&#x1F4E1;</span> Information Technology</li>
                <li><span className="cat-icon">&#x1F4CB;</span> Project Management</li>
                <li><span className="cat-icon">&#x1F3E5;</span> Medical Coding</li>
                <li><span className="cat-icon">&#x1F3ED;</span> Manufacturing &amp; Production</li>
                <li><span className="cat-icon">&#x1F3D7;</span> Core Construction</li>
              </ul>
              <Link href="/programs" className="btn btn-outline">View All Programs</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="footer-cta">
        <div className="container">
          <h2>Ready to start?</h2>
          <p>Employer-aligned training. Real certifications. Direct connections to local employers. Applications take under 10 minutes.</p>
          <Link href="/apply" className="btn btn-primary btn-large">Start Your Application</Link>
        </div>
      </section>

      <Footer variant="home" />
    </div>
  );
}
