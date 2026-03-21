import Link from 'next/link';
import Image from 'next/image';

export default function Footer({ variant = 'inner' }: { variant?: 'home' | 'inner' }) {
  if (variant === 'home') {
    return (
      <footer className="main-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <h3>Workforce Advancement Project</h3>
              <p>Free career training and certifications for Austin-area residents. Employer-aligned career training, certifications, and personalized support.</p>
              <a href="mailto:info@workforceap.org">info@workforceap.org</a>
              <a href="tel:5127771808">(512) 777-1808</a>
            </div>
            <FooterLinks />
          </div>
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} Workforce Advancement Project. Empowering People. Advancing Futures.</p>
            <div className="social-links">
              <a href="https://linkedin.com/company/workforceap" target="_blank" rel="noopener noreferrer">LinkedIn</a>
              <a href="mailto:info@workforceap.org">Email</a>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">Terms of Use</Link>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="main-footer">
      <div className="footer-container">
        <div className="footer-col">
          <Image
            src="/images/logo.png"
            alt="WorkforceAP"
            className="footer-logo"
            width={1600}
            height={900}
            sizes="(max-width: 768px) 140px, 210px"
            quality={85}
            loading="lazy"
          />
          <p>Free career training and certifications for Austin-area residents. Employer-aligned career training, certifications, and personalized support.</p>
          <p><a href="mailto:info@workforceap.org">info@workforceap.org</a></p>
          <p><a href="tel:5127771808">(512) 777-1808</a></p>
        </div>
        <FooterLinks />
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Workforce Advancement Project. Empowering People. Advancing Futures. &nbsp;|&nbsp; <a href="https://linkedin.com/company/workforceap" target="_blank" rel="noopener noreferrer">LinkedIn</a> &nbsp;|&nbsp; <a href="mailto:info@workforceap.org">info@workforceap.org</a> &nbsp;|&nbsp; <Link href="/privacy">Privacy</Link> &nbsp;|&nbsp; <Link href="/terms">Terms</Link></p>
      </div>
    </footer>
  );
}

function FooterLinks() {
  return (
    <>
      <div className="footer-links footer-col">
        <h4>Programs</h4>
        <ul>
          <li><Link href="/programs">All Programs</Link></li>
          <li><Link href="/program-comparison">Compare Programs</Link></li>
          <li><Link href="/salary-guide">Salary Guide</Link></li>
          <li><Link href="/apply">Apply Now</Link></li>
        </ul>
      </div>
      <div className="footer-links footer-col">
        <h4>About</h4>
        <ul>
          <li><Link href="/what-we-do">What We Do</Link></li>
          <li><Link href="/partners">Partners</Link></li>
          <li><Link href="/leadership">Leadership Team</Link></li>
          <li><Link href="/employers">For Employers</Link></li>
          <li><Link href="/faq">FAQ</Link></li>
          <li><Link href="/contact">Contact Us</Link></li>
        </ul>
      </div>
    </>
  );
}
