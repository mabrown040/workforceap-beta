import Image from 'next/image';
import LocalizedLink from '@/components/LocalizedLink';
import { Linkedin } from 'lucide-react';

export default function Footer({ variant = 'inner' }: { variant?: 'home' | 'inner' }) {
  return (
    <footer style={{ background: 'var(--color-background-dark, #121416)', borderTop: '1px solid var(--surface-container-highest, #333537)', paddingTop: '4rem', paddingBottom: '2rem', color: 'var(--color-on-surface, #e2e2e5)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '3rem', padding: '0 2rem 4rem', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Brand Column */}
        <div>
          {variant === 'inner' ? (
            <Image
              src="/images/wap_logo.png"
              alt="WorkforceAP"
              className="footer-logo"
              width={1930}
              height={985}
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
            Built in Austin. Available nationwide.
          </p>
          <p style={{ fontSize: '0.75rem', lineHeight: 1.6, color: 'var(--color-on-surface-variant, #debfc2)', opacity: 0.85, marginTop: '0.75rem' }}>
            A national nonprofit and 501(c)(3) organization. EIN: 41-2612389. Contributions are tax-deductible.
          </p>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
            <a href="https://www.linkedin.com/company/workforce-advancement-project" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <Linkedin size={18} color="var(--color-on-surface-variant)" aria-hidden="true" />
            </a>
            <a href="mailto:info@workforceap.org" aria-label="Email">
              <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface-variant)', cursor: 'pointer' }} aria-hidden="true">alternate_email</span>
            </a>
          </div>
        </div>

        {/* Programs */}
        <div>
          <h6 className="text-label-upper" style={{ color: 'var(--color-on-surface)', marginBottom: '1.5rem' }}>Programs</h6>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <li><LocalizedLink href="/programs" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', minHeight: '44px', minWidth: '44px', padding: '0.25rem 0' }}>All Programs</LocalizedLink></li>
            <li><LocalizedLink href="/find-your-path" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', minHeight: '44px', minWidth: '44px', padding: '0.25rem 0' }}>Find Your Path</LocalizedLink></li>
            <li><LocalizedLink href="/program-comparison" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', minHeight: '44px', minWidth: '44px', padding: '0.25rem 0' }}>Compare Programs</LocalizedLink></li>
            <li><LocalizedLink href="/salary-guide" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', minHeight: '44px', minWidth: '44px', padding: '0.25rem 0' }}>Salary Guide</LocalizedLink></li>
            <li><LocalizedLink href="/apply" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', minHeight: '44px', minWidth: '44px', padding: '0.25rem 0' }}>Apply Now</LocalizedLink></li>
          </ul>
        </div>

        {/* About */}
        <div>
          <h6 className="text-label-upper" style={{ color: 'var(--color-on-surface)', marginBottom: '1.5rem' }}>About</h6>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <li><LocalizedLink href="/what-we-do" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', minHeight: '44px', minWidth: '44px', padding: '0.25rem 0' }}>What We Do</LocalizedLink></li>
            <li><LocalizedLink href="/how-it-works" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', minHeight: '44px', minWidth: '44px', padding: '0.25rem 0' }}>How It Works</LocalizedLink></li>
            <li><LocalizedLink href="/leadership" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', minHeight: '44px', minWidth: '44px', padding: '0.25rem 0' }}>Leadership Team</LocalizedLink></li>
            <li><LocalizedLink href="/employers" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', minHeight: '44px', minWidth: '44px', padding: '0.25rem 0' }}>For Employers</LocalizedLink></li>
            <li><LocalizedLink href="/partners" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', minHeight: '44px', minWidth: '44px', padding: '0.25rem 0' }}>Partners</LocalizedLink></li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h6 className="text-label-upper" style={{ color: 'var(--color-on-surface)', marginBottom: '1.5rem' }}>Support</h6>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <li><LocalizedLink href="/contact" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', minHeight: '44px', minWidth: '44px', padding: '0.25rem 0' }}>Contact Us</LocalizedLink></li>
            <li><LocalizedLink href="/faq" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', minHeight: '44px', minWidth: '44px', padding: '0.25rem 0' }}>FAQ</LocalizedLink></li>
            <li><LocalizedLink href="/blog" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', minHeight: '44px', minWidth: '44px', padding: '0.25rem 0' }}>Blog</LocalizedLink></li>
            <li><LocalizedLink href="/privacy" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', minHeight: '44px', minWidth: '44px', padding: '0.25rem 0' }}>Privacy Policy</LocalizedLink></li>
            <li><LocalizedLink href="/terms" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', minHeight: '44px', minWidth: '44px', padding: '0.25rem 0' }}>Terms of Service</LocalizedLink></li>
            <li><LocalizedLink href="/accessibility" style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', minHeight: '44px', minWidth: '44px', padding: '0.25rem 0' }}>Accessibility Statement</LocalizedLink></li>
          </ul>
        </div>
      </div>

      {/* Workforce ecosystem context */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem 2rem 1.5rem', borderTop: '1px solid var(--surface-container-highest, #333537)', textAlign: 'center' }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Experience across the workforce ecosystem
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Community organizations</span>
          <span style={{ color: 'var(--color-on-surface-variant)', opacity: 0.4 }}>|</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Workforce boards</span>
          <span style={{ color: 'var(--color-on-surface-variant)', opacity: 0.4 }}>|</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Employer partners</span>
        </div>
      </div>

      {/* Copyright bar */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem 2rem 0', borderTop: '1px solid var(--surface-container-highest, #333537)', textAlign: 'center' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
          &copy; {new Date().getFullYear()} Workforce Advancement Project. Career training and job-readiness support with no upfront program cost for qualifying members.
        </p>
        <p style={{ fontSize: '0.625rem', color: 'var(--color-on-surface-variant)', opacity: 0.6, marginTop: '0.75rem', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
          This site incorporates information from{' '}
          <a href="https://services.onetcenter.org/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-on-surface-variant)', textDecoration: 'underline' }}>
            O*NET Web Services
          </a>{' '}
          by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). O*NET&reg; is a trademark of USDOL/ETA.
        </p>
      </div>
    </footer>
  );
}
