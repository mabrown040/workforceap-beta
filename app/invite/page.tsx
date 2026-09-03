'use client';

import { useState, useEffect, Suspense } from 'react';
import LocalizedLink from '@/components/LocalizedLink';
import { useSearchParams } from 'next/navigation';
import { safeParseResponseJson } from '@/lib/http/safeFetchJson';

type InviteData = {
  valid: boolean;
  email?: string;
  role?: string;
  roleLabel?: string;
  inviterName?: string;
  subgroup?: { id: string; name: string } | null;
  partner?: { id: string; name: string } | null;
  program?: { slug: string; title: string } | null;
  counselorAffiliation?: string | null;
  error?: string;
};

function InviteContent() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams?.get('token');
  // The token either arrives in the link or is resolved from email + login code.
  const [token, setToken] = useState<string | null>(tokenParam ?? null);
  const [codeEmail, setCodeEmail] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeSubmitting, setCodeSubmitting] = useState(false);

  const [data, setData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(!!tokenParam);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [postAcceptRedirect, setPostAcceptRedirect] = useState('/login?redirectTo=/dashboard');

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!token) {
      // No link token: show the login-code form instead of an error.
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/invite/validate?token=${encodeURIComponent(token)}`)
      .then((res) => safeParseResponseJson<InviteData>(res))
      .then(({ ok, data, parseError, status }) => {
        if (parseError || !data) {
          setData({
            valid: false,
            error:
              status >= 500
                ? 'The server could not load this invitation. Please try again shortly.'
                : "We couldn't load this invitation. Try again in a moment.",
          });
          return;
        }
        setData(data);
        if (data.valid && data.email) setFullName('');
      })
      .catch(() => setData({ valid: false, error: "We couldn't load this invitation. Try again in a moment." }))
      .finally(() => setLoading(false));
  }, [token]);

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeSubmitting(true);
    setCodeError(null);
    try {
      const qs = new URLSearchParams({ code: codeInput.trim(), email: codeEmail.trim() });
      const res = await fetch(`/api/invite/validate?${qs.toString()}`);
      const parsed = await safeParseResponseJson<InviteData & { token?: string }>(res);
      if (parsed.parseError || !parsed.data) {
        throw new Error("We couldn't check that code. Try again in a moment.");
      }
      if (!res.ok || !parsed.data.valid || !parsed.data.token) {
        throw new Error(parsed.data.error ?? 'That email and login code do not match an open invitation.');
      }
      setData(parsed.data);
      setToken(parsed.data.token);
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : 'Something went wrong. Try again in a moment.');
    } finally {
      setCodeSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !data?.valid || !data.email) return;
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, string | undefined> = {
        token,
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        password: password || undefined,
      };

      const res = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const parsed = await safeParseResponseJson<{ error?: string; redirectTo?: string }>(res);
      if (parsed.parseError || !parsed.data) {
        throw new Error(
          parsed.status >= 500
            ? 'The server returned an incomplete response. Please try again.'
            : 'Could not read the server response. Please try again.'
        );
      }
      const result = parsed.data;

      if (!res.ok) {
        throw new Error(result.error ?? "We couldn't accept this invitation. Try again in a moment.");
      }
      const next =
        typeof result.redirectTo === 'string' && result.redirectTo.startsWith('/')
          ? result.redirectTo
          : '/login?redirectTo=/dashboard';
      setPostAcceptRedirect(next);
      setSuccess(true);
      window.location.href = next;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again in a moment.');
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%',
    maxWidth: '360px',
    padding: '0.75rem 1rem',
    border: '1px solid var(--surface-container-highest)',
    borderRadius: '8px',
    fontSize: '1rem',
  } as const;
  const labelStyle = { display: 'block', marginBottom: '0.35rem', fontWeight: 500 } as const;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Loading invitation...</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="container" style={{ maxWidth: '560px', paddingTop: '3rem', paddingBottom: '3rem' }}>
        <div style={{ background: 'var(--surface-container-low)', borderRadius: '12px', padding: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Have a login code?</h1>
          <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem' }}>
            Enter the email address your invitation was sent to and the login code from your WorkforceAP
            contact. Counselors and Community Ambassadors use this to set up their account.
          </p>
          <form onSubmit={handleCodeSubmit}>
            {codeError && (
              <div
                role="alert"
                style={{
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  background: 'var(--surface-container)',
                  borderRadius: '6px',
                  color: 'var(--color-accent)',
                  fontSize: '0.9rem',
                }}
              >
                {codeError}
              </div>
            )}
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="code-email" style={labelStyle}>
                Email
              </label>
              <input
                id="code-email"
                type="email"
                required
                autoComplete="email"
                value={codeEmail}
                onChange={(e) => setCodeEmail(e.target.value)}
                placeholder="you@example.com"
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="code-value" style={labelStyle}>
                Login code
              </label>
              <input
                id="code-value"
                type="text"
                required
                inputMode="text"
                autoComplete="one-time-code"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX"
                maxLength={9}
                style={{ ...inputStyle, letterSpacing: '0.12em', fontFamily: 'ui-monospace, monospace' }}
              />
            </div>
            <button
              type="submit"
              disabled={codeSubmitting}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem' }}
            >
              {codeSubmitting ? 'Checking…' : 'Continue'}
            </button>
          </form>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginTop: '1rem' }}>
            Already set up? <LocalizedLink href="/login">Sign in</LocalizedLink>.
          </p>
        </div>
      </div>
    );
  }

  if (!data?.valid) {
    return (
      <div className="container" style={{ maxWidth: '560px', paddingTop: '3rem', paddingBottom: '3rem' }}>
        <div
          style={{
            background: 'var(--surface-container-low)',
            padding: '2rem',
            borderRadius: '12px',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Invalid or Expired Invitation</h1>
          <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem' }}>
            {data?.error ?? 'This invitation link is no longer valid.'}
          </p>
          <LocalizedLink href="/" className="btn btn-primary">
            Go to Homepage
          </LocalizedLink>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="container" style={{ maxWidth: '560px', paddingTop: '3rem', paddingBottom: '3rem' }}>
        <div
          style={{
            background: 'var(--surface-container-low)',
            padding: '2rem',
            borderRadius: '12px',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--color-green)' }}>
            Invitation Accepted!
          </h1>
          <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem' }}>
            Redirecting you to sign in...
          </p>
          <LocalizedLink href={postAcceptRedirect} className="btn btn-primary">
            Log In
          </LocalizedLink>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '560px', paddingTop: '3rem', paddingBottom: '3rem' }}>
      <div
        style={{
          background: 'var(--surface-container-low)',
          borderRadius: '12px',
          padding: '2rem',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>You&rsquo;re Invited!</h1>
        <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem' }}>
          {data.inviterName} has invited you to join WorkforceAP as a <strong>{data.roleLabel}</strong>.
        </p>
        {data.subgroup && (
          <p style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>
            Subgroup: <strong>{data.subgroup.name}</strong>
          </p>
        )}
        {data.role === 'counselor' && (
          <p style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>
            Affiliation:{' '}
            <strong>
              {data.counselorAffiliation === 'community_ambassador'
                ? 'Community Ambassador'
                : data.counselorAffiliation === 'independent'
                  ? 'Independent advisor'
                  : data.partner
                    ? data.partner.name
                    : 'WorkforceAP (organization counselor)'}
            </strong>
          </p>
        )}
        {data.program && (
          <p style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>
            Program: <strong>{data.program.title}</strong>
          </p>
        )}
        <p style={{ fontSize: '0.9375rem', color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem' }}>
          Fill in the form below to accept and get started.
        </p>

        <form onSubmit={handleSubmit}>
          {error && (
            <div
              style={{
                padding: '0.75rem',
                marginBottom: '1rem',
                background: 'var(--surface-container)',
                borderRadius: '6px',
                color: 'var(--color-accent)',
                fontSize: '0.9rem',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="invite-email" style={labelStyle}>
              Email
            </label>
            <input
              id="invite-email"
              type="email"
              value={data.email ?? ''}
              readOnly
              style={{ ...inputStyle, background: 'var(--surface-container)', cursor: 'not-allowed' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="invite-name" style={labelStyle}>
              Full name
            </label>
            <input
              id="invite-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="invite-phone" style={labelStyle}>
              Phone (optional)
            </label>
            <input
              id="invite-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="invite-password" style={labelStyle}>
              Create a password
            </label>
            <input
              id="invite-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              style={inputStyle}
            />
            <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginTop: '0.25rem' }}>
              First time here? Create a password. Already have an account? Leave this blank.
            </p>
          </div>

          <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
            {submitting ? 'Accepting...' : 'Accept Invitation'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center' }}>Loading invitation...</div>}>
      <InviteContent />
    </Suspense>
  );
}
