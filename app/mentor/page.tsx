import type { Metadata } from 'next';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Become a Mentor',
  description: 'Volunteer your expertise to help workforce members build careers. Log hours, earn a charitable contribution letter, and make a real impact.',
  path: '/mentor',
});

const benefits = [
  {
    icon: '📋',
    title: 'Volunteer Hours Logged',
    desc: 'Every session is automatically tracked. Your contributions are recorded and verified.',
  },
  {
    icon: '📄',
    title: 'Nonprofit Tax Deduction Letter',
    desc: 'WorkforceAP is a registered nonprofit. We auto-generate an IRS-compliant charitable contribution letter for your volunteer time.',
  },
  {
    icon: '🌍',
    title: 'Real Community Impact',
    desc: 'Help job seekers break into your industry. Your career wisdom opens doors for people who need it most.',
  },
  {
    icon: '🤝',
    title: 'Flexible Commitment',
    desc: 'Choose how many hours per month you can give. As few as 2 hours makes a difference.',
  },
];

export default function MentorLandingPage() {
  return (
    <>
      {/* Desktop */}
      <div className="wa-md:wa-block wa-hidden">
        <main style={{ minHeight: '100vh', background: '#f8fafc' }}>
          {/* Hero */}
          <section style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
            color: '#fff',
            padding: '80px 24px',
            textAlign: 'center',
          }}>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🤝</div>
              <h1 style={{ fontSize: 42, fontWeight: 800, marginBottom: 16 }}>
                Become a WorkforceAP Mentor
              </h1>
              <p style={{ fontSize: 20, opacity: 0.9, marginBottom: 32, lineHeight: 1.6 }}>
                Share your expertise, earn a charitable contribution letter, and help workforce members
                launch meaningful careers in your industry.
              </p>
              <Link href="/mentor/apply" style={{
                display: 'inline-block',
                background: '#fff',
                color: '#1e3a5f',
                fontWeight: 700,
                fontSize: 18,
                padding: '14px 36px',
                borderRadius: 8,
                textDecoration: 'none',
              }}>
                Apply to Mentor →
              </Link>
            </div>
          </section>

          {/* Benefits */}
          <section style={{ padding: '64px 24px', maxWidth: 960, margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 700, marginBottom: 48, color: '#1e293b' }}>
              Why Mentor with WorkforceAP?
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 32 }}>
              {benefits.map((b) => (
                <div key={b.title} style={{
                  background: '#fff',
                  borderRadius: 12,
                  padding: 28,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  border: '1px solid #e2e8f0',
                }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>{b.icon}</div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>{b.title}</h3>
                  <p style={{ color: '#475569', lineHeight: 1.6 }}>{b.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* How it works */}
          <section style={{ background: '#fff', padding: '64px 24px' }}>
            <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
              <h2 style={{ fontSize: 32, fontWeight: 700, color: '#1e293b', marginBottom: 40 }}>How It Works</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, textAlign: 'left' }}>
                {[
                  { step: '1', title: 'Apply in 5 minutes', desc: 'Fill out a short application with your background, industry, and specialties.' },
                  { step: '2', title: 'Get approved by our team', desc: 'We review applications within 48 hours. Approved mentors receive a welcome email.' },
                  { step: '3', title: 'Members request sessions', desc: 'Members browse your profile and request 30–60 minute sessions on topics you choose.' },
                  { step: '4', title: 'Log hours, get your letter', desc: 'After each session, hours are logged automatically. Download your annual contribution letter any time.' },
                ].map((s) => (
                  <div key={s.step} style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                    <div style={{
                      minWidth: 40, height: 40, borderRadius: '50%',
                      background: '#2563eb', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 18,
                    }}>{s.step}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 18, color: '#1e293b' }}>{s.title}</div>
                      <div style={{ color: '#475569', marginTop: 4 }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 48 }}>
                <Link href="/mentor/apply" style={{
                  display: 'inline-block',
                  background: '#2563eb',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 18,
                  padding: '14px 36px',
                  borderRadius: 8,
                  textDecoration: 'none',
                }}>
                  Start Your Application →
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Mobile */}
      <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
          color: '#fff',
          padding: '48px 20px 40px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🤝</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Become a Mentor</h1>
          <p style={{ fontSize: 16, opacity: 0.9, lineHeight: 1.5, marginBottom: 28 }}>
            Share expertise, log volunteer hours, and get a charitable contribution letter.
          </p>
          <Link href="/mentor/apply" style={{
            display: 'inline-block',
            background: '#fff',
            color: '#1e3a5f',
            fontWeight: 700,
            fontSize: 16,
            padding: '12px 28px',
            borderRadius: 8,
            textDecoration: 'none',
          }}>
            Apply to Mentor →
          </Link>
        </div>

        <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {benefits.map((b) => (
            <div key={b.title} style={{
              background: '#fff',
              borderRadius: 10,
              padding: 20,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              border: '1px solid #e2e8f0',
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{b.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b', marginBottom: 6 }}>{b.title}</div>
              <div style={{ color: '#475569', fontSize: 14, lineHeight: 1.5 }}>{b.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: '0 20px 24px', textAlign: 'center' }}>
          <Link href="/mentor/apply" style={{
            display: 'block',
            background: '#2563eb',
            color: '#fff',
            fontWeight: 700,
            fontSize: 16,
            padding: '14px',
            borderRadius: 8,
            textDecoration: 'none',
          }}>
            Start Application →
          </Link>
        </div>
      </div>
    </>
  );
}
