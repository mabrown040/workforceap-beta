'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div
      style={{
        backgroundColor: '#141313',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '440px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Image
            src="/images/logo-tight.png"
            width={160}
            height={82}
            alt="WorkforceAP"
            style={{ display: 'inline-block' }}
          />
        </div>

        {/* Heading */}
        <h1
          style={{
            color: '#e6e1e1',
            fontSize: '1.75rem',
            fontWeight: 700,
            marginBottom: '8px',
            textAlign: 'center',
          }}
        >
          Welcome back
        </h1>
        <p
          style={{
            color: '#debfc2',
            fontSize: '0.95rem',
            textAlign: 'center',
            marginBottom: '32px',
          }}
        >
          Sign in to your WorkforceAP account
        </p>

        {/* Form */}
        <form action="/api/auth/login" method="POST">
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                color: '#debfc2',
                fontSize: '0.875rem',
                fontWeight: 500,
                marginBottom: '6px',
              }}
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                color: '#e6e1e1',
                padding: '12px 16px',
                width: '100%',
                fontSize: '1rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '8px' }}>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                color: '#debfc2',
                fontSize: '0.875rem',
                fontWeight: 500,
                marginBottom: '6px',
              }}
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                color: '#e6e1e1',
                padding: '12px 16px',
                width: '100%',
                fontSize: '1rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Forgot password */}
          <div style={{ textAlign: 'right', marginBottom: '24px' }}>
            <Link
              href="/forgot-password"
              style={{
                color: '#ad2c4d',
                fontSize: '0.875rem',
                textDecoration: 'none',
              }}
            >
              Forgot password?
            </Link>
          </div>

          {/* Sign In button */}
          <button
            type="submit"
            style={{
              background: '#ad2c4d',
              color: '#fff',
              borderRadius: '8px',
              fontWeight: 700,
              padding: '14px 24px',
              width: '100%',
              fontSize: '1rem',
              border: 'none',
              cursor: 'pointer',
              marginBottom: '24px',
            }}
          >
            Sign In
          </button>
        </form>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ color: '#a68a8d', fontSize: '0.875rem' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* Apply CTA */}
        <Link
          href="/apply"
          style={{
            display: 'block',
            textAlign: 'center',
            border: '1px solid rgba(173,44,77,0.5)',
            color: '#ffb2bc',
            borderRadius: '8px',
            padding: '14px 24px',
            fontWeight: 600,
            fontSize: '0.95rem',
            textDecoration: 'none',
          }}
        >
          Apply — free for members
        </Link>
      </div>
    </div>
  );
}
