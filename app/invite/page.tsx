'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type InviteData = {
  valid: boolean;
  email?: string;
  role?: string;
  roleLabel?: string;
  inviterName?: string;
  subgroup?: { id: string; name: string } | null;
  program?: { slug: string; title: string } | null;
  error?: string;
};

function InviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [data, setData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!token) {
      setData({ valid: false, error: 'Missing invitation token' });
      setLoading(false);
      return;
    }
    fetch(`/api/invite/validate?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        if (d.valid && d.email) setFullName(d.email.split('@')[0] || '');
      })
      .catch(() => setData({ valid: false, error: 'Failed to load invitation' }))
      .finally(() => setLoading(false));
  }, [token]);

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
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error ?? 'Failed to accept invitation');
      }
      setSuccess(true);
      if (result.redirectTo) {
        window.location.href = result.redirectTo;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%',
    maxWidth: '360px',
    padding: '0.75rem 1rem',
    border: '1px solid var(--color-gray-300)',
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

  if (!data?.valid) {
    return (
      <div className="container" style={{ maxWidth: '560px', paddingTop: '3rem', paddingBottom: '3rem' }}>
        <div
          style={{
            background: 'var(--color-gray-50)',
            padding: '2rem',
            borderRadius: '12px',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Invalid or Expired Invitation</h1>
          <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem' }}>
            {data?.error ?? 'This invitation link is no longer valid.'}
          </p>
          <Link href="/" className="btn btn-primary">
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="container" style={{ maxWidth: '560px', paddingTop: '3rem', paddingBottom: '3rem' }}>
        <div
          style={{
            background: 'var(--color-gray-50)',
            padding: '2rem',
            borderRadius: '12px',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--color-green)' }}>
            Invitation Accepted!
          </h1>
          <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem' }}>
            Redirecting you to the dashboard...
          </p>
          <Link href="/login?redirectTo=/dashboard" className="btn btn-primary">
            Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '560px', paddingTop: '3rem', paddingBottom: '3rem' }}>
      <div
        style={{
          background: 'white',
          border: '1px solid var(--color-gray-200)',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>You&apos;re Invited!</h1>
        <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem' }}>
          {data.inviterName} has invited you to join WorkforceAP as a <strong>{data.roleLabel}</strong>.
        </p>
        {data.subgroup && (
          <p style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>
            Subgroup: <strong>{data.subgroup.name}</strong>
          </p>
        )}
        {data.program && (
          <p style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>
            Program: <strong>{data.program.title}</strong>
          </p>
        )}
        <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-500)', marginBottom: '1.5rem' }}>
          Complete the form below to accept this invitation.
        </p>

        <form onSubmit={handleSubmit}>
          {error && (
            <div
              style={{
                padding: '0.75rem',
                marginBottom: '1rem',
                background: '#fee',
                borderRadius: '6px',
                color: '#c00',
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
              style={{ ...inputStyle, background: 'var(--color-gray-100)', cursor: 'not-allowed' }}
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
              Password (required for new accounts)
            </label>
            <input
              id="invite-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters — leave blank if you already have an account"
              minLength={8}
              style={inputStyle}
            />
            <p style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)', marginTop: '0.25rem' }}>
              New to WorkforceAP? Enter a password to create your account. Already have an account? Leave blank to add this role.
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
    <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center' }}>Loading...</div>}>
      <InviteContent />
    </Suspense>
  );
}
