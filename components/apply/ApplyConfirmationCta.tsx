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
      <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>
        Recommended next step
      </p>
      <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem' }}>Create your member account now</h2>
      <p style={{ margin: '0 0 1rem', color: 'var(--color-on-surface)', fontSize: '0.95rem', lineHeight: 1.5 }}>
        Your application is already submitted. Creating an account is the easiest way to check your status, save your progress, and pick up quickly when our team reaches out.
      </p>
      {email ? (
        <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>
          <strong>Email on file:</strong> {email}
        </p>
      ) : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        <Link href={createHref} className="btn btn-primary">
          Create my account
        </Link>
        <Link href="/apply/status" className="btn btn-outline">
          Check application status
        </Link>
      </div>
      <p style={{ margin: '1rem 0 0', fontSize: '0.88rem', color: 'var(--color-on-surface-variant)' }}>
        No problem if you need to do this later. We will still review your application.
      </p>
    </div>
  );
}
