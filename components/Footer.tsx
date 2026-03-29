import Link from 'next/link';
import Image from 'next/image';

export default function Footer({ variant = 'inner' }: { variant?: 'home' | 'inner' }) {
  return (
    <footer style={{ background: 'var(--color-background-dark, #121416)', borderTop: '1px solid var(--surface-container-highest, #333537)', paddingTop: '4rem', paddingBottom: '2rem', color: 'var(--color-on-surface, #e2e2e5)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '3rem', padding: '0 2rem 4rem', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Brand Column */}
        <div>
          {variant === 'inner' ? (
            <Image
              src="/images/logo.png"
              alt="WorkforceAP"
              className="footer-logo"
              width={1600}
              height={900}
              sizes="(max-width: 768px) 140px, 210px"
              quality={85}
              loading="lazy"
              style={{ maxWidth: '180px', height: 'auto', marginBottom: '1rem' }}
            />
          ) : (
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-accent)', marginBottom: '1.5rem' }}>
              Workforce Advancement Project
            </div>
          )}
          <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--color-on-surface-variant, #debfc2)' }}>
            Empowering the workforce through intentional education and industry-leading partnerships.
          </p>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
            <a href="https://www.linkedin.com/company/workforce-advancement-project" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface-variant)', cursor: 'pointer' }}>public</span>
            </a>
            <a href="mailto:info@workforceap.org" aria-label="Email">
              <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface-variant)', cursor: 'pointer' }}>alternate_email</span>
            </a>
          </div>
        </div>

        {/* Programs */}
        <div>
          <h6 className="text-label-upper" style={{ color: 'var(--color-on-surface)', marginBottom: '1.5rem' }}>Programs</h6>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <li><Link href="/programs" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none' }}>All Programs</Link></li>
            <li><Link href="/find-your-path" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none' }}>Find Your Career</Link></li>
            <li><Link href="/program-comparison" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none' }}>Compare Programs</Link></li>
            <li><Link href="/salary-guide" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none' }}>Salary Guide</Link></li>
            <li><Link href="/apply" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none' }}>Apply Now</Link></li>
          </ul>
        </div>

        {/* About */}
        <div>
          <h6 className="text-label-upper" style={{ color: 'var(--color-on-surface)', marginBottom: '1.5rem' }}>About</h6>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <li><Link href="/what-we-do" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none' }}>What We Do</Link></li>
            <li><Link href="/how-it-works" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none' }}>How It Works</Link></li>
            <li><Link href="/leadership" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none' }}>Leadership Team</Link></li>
            <li><Link href="/employers" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none' }}>For Employers</Link></li>
            <li><Link href="/partners" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none' }}>Partners</Link></li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h6 className="text-label-upper" style={{ color: 'var(--color-on-surface)', marginBottom: '1.5rem' }}>Support</h6>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <li><Link href="/contact" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none' }}>Contact Us</Link></li>
            <li><Link href="/faq" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none' }}>FAQ</Link></li>
            <li><Link href="/blog" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none' }}>Blog</Link></li>
            <li><Link href="/privacy" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none' }}>Privacy Policy</Link></li>
            <li><Link href="/terms" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none' }}>Terms of Service</Link></li>
          </ul>
        </div>
      </div>

      {/* Copyright bar */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem 2rem 0', borderTop: '1px solid var(--surface-container-highest, #333537)', textAlign: 'center' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
          &copy; {new Date().getFullYear()} Workforce Advancement Project. Empowering People. Advancing Futures.
        </p>
      </div>
    </footer>
  );
}
