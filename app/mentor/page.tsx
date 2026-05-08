import Link from 'next/link';
import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';
import { CTABand } from '@/components/marketing/ui';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Become a Mentor',
  description: 'Volunteer your expertise to help job-seekers advance their careers. Log hours, earn a tax deduction letter, and give back to your community.',
  path: '/mentor',
});
}

export default function BecomeMentorPage() {
  return (
    <main style={{ background: 'var(--color-surface)', minHeight: '100vh' }}>
      {/* ── Pre-launch mentor waitlist banner ──
          Per /plan-ceo-review (2026-04-26): with 12 cohort members, mentor
          supply far exceeds demand. We accept applications but match
          mentors as members reach the interview-prep stage of their program
          (typically 4-8 weeks in). Setting honest expectations here is
          better than recruiting mentors who churn before pairing. */}
      <section
        aria-label="Mentor waitlist"
        style={{
          background: 'color-mix(in srgb, var(--color-accent) 6%, white)',
          borderBottom: '1px solid color-mix(in srgb, var(--color-accent) 18%, var(--outline-variant))',
          padding: '1.5rem clamp(1rem, 4vw, 2rem)',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-accent-dark)' }}>
              Mentor waitlist &middot; Pre-launch
            </p>
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.95rem', color: 'var(--color-on-surface)', lineHeight: 1.5 }}>
              We&rsquo;re accepting mentor applications now and matching as our cohort grows. Most pairings
              start <strong>4&ndash;8 weeks after you apply</strong>, when a member reaches the interview-prep
              stage of their program in your domain.
            </p>
          </div>
          <Link href="/mentor/apply" className="btn btn-primary btn-small" style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
            Join the waitlist
          </Link>
        </div>
      </section>

      {/* Hero */}
      <CTABand
        variant="dark"
        headline="Share Your Expertise. Change a Career."
        subheadline="WorkforceAP mentors are industry professionals who volunteer their time to guide job-seekers. Your experience is worth more than you think — and it's tax-deductible."
        primaryAction={
          <Link
            href="/mentor/apply"
            className="btn"
            style={{ background: "#fff", color: "var(--color-accent)", fontWeight: 700 }}
          >
            Apply to Mentor
          </Link>
        }
      />

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
          <Link href="/mentor/apply" className="btn btn-primary">
            Apply to Mentor &rarr;
          </Link>
        </div>
      </section>
    </main>
  );
}
