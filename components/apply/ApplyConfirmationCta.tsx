'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function ApplyConfirmationCta() {
  const searchParams = useSearchParams();
  const email = useMemo(() => {
    const raw = searchParams.get('email')?.trim() ?? '';
    return raw;
  }, [searchParams]);

  const createHref = email ? `/apply/create-account?email=${encodeURIComponent(email)}` : '/apply/create-account';

  return (
    <div
      className="apply-confirmation-account-cta"
      style={{
        background: 'linear-gradient(135deg, rgba(173, 44, 77, 0.08), rgba(173, 44, 77, 0.02))',
        border: '1px solid rgba(173, 44, 77, 0.25)',
        borderRadius: '8px',
        padding: '1.35rem',
        marginBottom: '1.5rem',
      }}
    >
      <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem' }}>Last step — create your member account</h2>
      <p style={{ margin: '0 0 1rem', color: 'var(--color-on-surface)', fontSize: '0.95rem', lineHeight: 1.5 }}>
        Your application is submitted. Create an account to check your status and access resources while you wait.
      </p>
      {email ? (
        <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>
          <strong>Email on file:</strong> {email}
        </p>
      ) : null}
      <Link href={createHref} className="btn btn-primary">
        Create my account
      </Link>
      <p style={{ margin: '1rem 0 0', fontSize: '0.88rem', color: 'var(--color-on-surface-variant)' }}>
        Already applied?{' '}
        <Link href="/apply/status" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
          Check your application status
        </Link>
      </p>
    </div>
  );
}
