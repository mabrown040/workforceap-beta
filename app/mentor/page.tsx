import Link from 'next/link';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Become a Mentor | WorkforceAP',
  description: 'Volunteer your expertise to help job-seekers advance their careers. Log hours, earn a tax deduction letter, and give back to your community.',
  path: '/mentor',
});

export default function BecomeMentorPage() {
  return (
    <main style={{ background: 'var(--color-surface)', minHeight: '100vh' }}>
      {/* Hero */}
      <section style={{ background: 'var(--color-accent)', color: '#fff', padding: '4rem 2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>
          Share Your Expertise. Change a Career.
        </h1>
        <p style={{ fontSize: '1.125rem', maxWidth: 600, margin: '0 auto 2rem', opacity: 0.9 }}>
          WorkforceAP mentors are industry professionals who volunteer their time to guide job-seekers. Your experience is worth more than you think — and it&apos;s tax-deductible.
        </p>
        <Link
          href="/mentor/apply"
          style={{ background: '#fff', color: 'var(--color-accent)', fontWeight: 700, padding: '0.875rem 2rem', borderRadius: 8, textDecoration: 'none', fontSize: '1rem' }}
        >
          Apply to Mentor
        </Link>
      </section>

      {/* Benefits */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '3rem 2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, textAlign: 'center', marginBottom: '2rem', color: 'var(--color-on-surface)' }}>
          Why Mentor with WorkforceAP?
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
          {[
            { icon: '📋', title: 'Hours Logged Automatically', desc: 'Every session is recorded. We track your total volunteer hours so you never have to.' },
            { icon: '📄', title: 'Tax Deduction Letter', desc: 'Download a nonprofit volunteer hour letter for your tax filings — generated automatically from your session history.' },
            { icon: '🤝', title: 'Real Impact', desc: 'Your guidance helps adults overcome barriers to employment — career changers, veterans, returning workers.' },
            { icon: '🌐', title: 'Build Your Network', desc: 'Connect with motivated professionals who are eager to learn and grow. Many mentors find their next hires here.' },
          ].map((b) => (
            <div key={b.title} style={{ background: 'var(--surface-container-low)', borderRadius: 10, padding: '1.5rem', border: '1px solid var(--surface-container-high)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{b.icon}</div>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--color-on-surface)' }}>{b.title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', margin: 0 }}>{b.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          <Link
            href="/mentor/apply"
            style={{ background: 'var(--color-accent)', color: '#fff', fontWeight: 700, padding: '0.875rem 2rem', borderRadius: 8, textDecoration: 'none', fontSize: '1rem' }}
          >
            Apply to Mentor →
          </Link>
        </div>
      </section>
    </main>
  );
}
