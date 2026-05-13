'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const TIERS = [
  {
    key: 'starter',
    name: 'Starter',
    price: '$99/mo',
    description: 'Up to 50 members, basic branding, email support.',
    priceIdEnv: 'STRIPE_STARTER_PRICE_ID',
  },
  {
    key: 'growth',
    name: 'Growth',
    price: '$299/mo',
    description: 'Up to 500 members, custom domain, priority support.',
    priceIdEnv: 'STRIPE_GROWTH_PRICE_ID',
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    description: 'Unlimited members, dedicated onboarding, SLAs.',
    priceIdEnv: 'STRIPE_ENTERPRISE_PRICE_ID',
  },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}

export default function OrgOnboardPage() {
  const searchParams = useSearchParams();
  const successOrg = searchParams.get('org');
  const isSuccess = searchParams.get('success') === '1';

  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [email, setEmail] = useState('');
  const [tier, setTier] = useState('starter');
  const [primaryColor, setPrimaryColor] = useState('#ad2c4d');
  const [accentColor, setAccentColor] = useState('#d4a017');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    org: { id: string; name: string; slug: string };
    setupUrl: string;
    checkoutUrl?: string | null;
    portalUrl: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewSlug = slugify(name) || 'your-org';

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/org/onboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            domain: domain || null,
            email,
            tier,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Something went wrong');
          return;
        }
        setResult(data);
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [name, domain, email, tier]
  );

  if (isSuccess && successOrg) {
    return (
      <div className="org-onboard" style={{ minHeight: '100vh', background: 'var(--color-background-dark, #0a0a12)', color: 'var(--color-on-surface, #f2f2f5)', padding: '4rem 1rem' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 64, color: 'var(--color-accent, #d4a017)' }}>check_circle</span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 24 }}>Your organization is ready!</h1>
          <p style={{ color: 'var(--color-on-surface-muted, rgba(242,242,245,0.7))', marginTop: 12 }}>
            Welcome to WorkforceAP white-label. Your portal is live at:
          </p>
          <div style={{ marginTop: 24, background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 20 }}>
            <a href={`https://${successOrg}.workforceap.org`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent, #d4a017)', fontWeight: 700, fontSize: '1.1rem' }}>
              {successOrg}.workforceap.org
            </a>
          </div>
          <div style={{ marginTop: 32, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href={`https://${successOrg}.workforceap.org`} className="btn btn-primary btn-large" style={{ fontWeight: 700 }}>
              Open Portal
            </Link>
            <Link href={`/api/org/${successOrg}/settings`} className="btn btn-outline btn-large" style={{ fontWeight: 700 }}>
              Brand Settings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="org-onboard" style={{ minHeight: '100vh', background: 'var(--color-background-dark, #0a0a12)', color: 'var(--color-on-surface, #f2f2f5)', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 800, margin: 0 }}>Launch Your Branded Career Portal</h1>
          <p style={{ color: 'var(--color-on-surface-muted, rgba(242,242,245,0.7))', marginTop: 8, maxWidth: 520, marginInline: 'auto' }}>
            WorkforceAP powers nonprofits, workforce boards, and community colleges with a white-labeled training and job-matching platform.
          </p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 32, alignItems: 'start' }}>
          <form onSubmit={handleSubmit} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 28, border: '1px solid rgba(255,255,255,0.08)' }}>
            <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
              <legend style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 20 }}>Organization Details</legend>

              <label style={{ display: 'block', marginBottom: 16 }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface-muted, rgba(242,242,245,0.7))' }}>Organization Name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Austin Urban League"
                  required
                  maxLength={100}
                  style={{
                    width: '100%',
                    marginTop: 6,
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.06)',
                    color: 'inherit',
                    fontSize: '1rem',
                  }}
                />
              </label>

              <label style={{ display: 'block', marginBottom: 16 }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface-muted, rgba(242,242,245,0.7))' }}>Subdomain</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <input
                    type="text"
                    readOnly
                    value={previewSlug}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: 'rgba(255,255,255,0.03)',
                      color: 'var(--color-on-surface-muted, rgba(242,242,245,0.5))',
                      fontSize: '1rem',
                    }}
                  />
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-muted, rgba(242,242,245,0.5))', whiteSpace: 'nowrap' }}>.workforceap.org</span>
                </div>
              </label>

              <label style={{ display: 'block', marginBottom: 16 }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface-muted, rgba(242,242,245,0.7))' }}>Custom Domain (optional)</span>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="careers.example.org"
                  style={{
                    width: '100%',
                    marginTop: 6,
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.06)',
                    color: 'inherit',
                    fontSize: '1rem',
                  }}
                />
              </label>

              <label style={{ display: 'block', marginBottom: 16 }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface-muted, rgba(242,242,245,0.7))' }}>Your Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@organization.org"
                  required
                  style={{
                    width: '100%',
                    marginTop: 6,
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.06)',
                    color: 'inherit',
                    fontSize: '1rem',
                  }}
                />
              </label>

              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface-muted, rgba(242,242,245,0.7))', display: 'block', marginBottom: 8 }}>Plan</span>
                <div style={{ display: 'grid', gap: 8 }}>
                  {TIERS.map((t) => (
                    <label
                      key={t.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: 12,
                        borderRadius: 10,
                        border: `2px solid ${tier === t.key ? 'var(--color-accent, #d4a017)' : 'rgba(255,255,255,0.1)'}`,
                        background: tier === t.key ? 'rgba(255,255,255,0.06)' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="tier"
                        value={t.key}
                        checked={tier === t.key}
                        onChange={() => setTier(t.key)}
                        style={{ accentColor: 'var(--color-accent, #d4a017)', width: 18, height: 18 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700 }}>{t.name} <span style={{ color: 'var(--color-on-surface-muted, rgba(242,242,245,0.6))', fontWeight: 500 }}>— {t.price}</span></div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-muted, rgba(242,242,245,0.6))', marginTop: 2 }}>{t.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <label style={{ display: 'block' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface-muted, rgba(242,242,245,0.7))' }}>Primary Color</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      style={{ width: 40, height: 40, border: 'none', background: 'none', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      maxLength={7}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: 'rgba(255,255,255,0.06)',
                        color: 'inherit',
                        fontSize: '0.875rem',
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>
                </label>
                <label style={{ display: 'block' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface-muted, rgba(242,242,245,0.7))' }}>Accent Color</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      style={{ width: 40, height: 40, border: 'none', background: 'none', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      maxLength={7}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: 'rgba(255,255,255,0.06)',
                        color: 'inherit',
                        fontSize: '0.875rem',
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>
                </label>
              </div>

              {error && (
                <div style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: 16, padding: 10, background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>{error}</div>
              )}

              {result && (
                <div style={{ marginBottom: 16, padding: 14, background: 'rgba(34,197,94,0.08)', borderRadius: 8, border: '1px solid rgba(34,197,94,0.2)' }}>
                  <div style={{ fontWeight: 700, color: '#22c55e' }}>Organization created!</div>
                  <div style={{ fontSize: '0.875rem', marginTop: 4 }}>Portal: <a href={result.portalUrl} style={{ color: 'var(--color-accent, #d4a017)' }}>{result.portalUrl}</a></div>
                  {result.checkoutUrl && (
                    <div style={{ marginTop: 8 }}>
                      <a href={result.checkoutUrl} className="btn btn-primary" style={{ fontWeight: 700, display: 'inline-block' }}>Complete Payment →</a>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !name || !email}
                className="btn btn-primary btn-large"
                style={{ width: '100%', fontWeight: 800, opacity: loading || !name || !email ? 0.6 : 1 }}
              >
                {loading ? 'Creating…' : 'Launch Portal'}
              </button>
            </fieldset>
          </form>

          <div style={{ position: 'sticky', top: 24 }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Live Preview</div>
            <div
              style={{
                borderRadius: 16,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.1)',
                background: '#fff',
                color: '#1a1a2e',
                minHeight: 420,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <nav
                style={{
                  padding: '16px 20px',
                  background: primaryColor,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{name || 'Your Organization'}</div>
                <div style={{ display: 'flex', gap: 12, fontSize: '0.8rem', fontWeight: 600 }}>
                  <span>Programs</span>
                  <span>Apply</span>
                </div>
              </nav>
              <div style={{ padding: '32px 24px', flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>Free Career Training</h2>
                <p style={{ color: '#444', marginTop: 8, fontSize: '0.9rem' }}>
                  Get trained, certified, and placed — at no cost to members.
                </p>
                <div style={{ marginTop: 20 }}>
                  <div style={{ display: 'inline-block', padding: '10px 18px', borderRadius: 8, background: primaryColor, color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>Apply Now</div>
                  <div style={{ display: 'inline-block', padding: '10px 18px', borderRadius: 8, border: `2px solid ${accentColor}`, color: primaryColor, fontWeight: 700, fontSize: '0.9rem', marginLeft: 10 }}>Learn More</div>
                </div>
              </div>
              <footer style={{ padding: '14px 20px', background: '#f6f6f8', fontSize: '0.75rem', color: '#666' }}>
                © {new Date().getFullYear()} {name || 'Your Organization'} — Funded by grants and partnerships.
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
