'use client';

import { useState } from 'react';
import Link from 'next/link';

const INDUSTRIES = ['Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail', 'Education', 'Construction', 'Logistics', 'Hospitality', 'Other'];

export default function MentorApplyPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: '', title: '', company: '', industry: '', bio: '', linkedinUrl: '', availableHours: 2,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/mentors/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: 480 }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.75rem' }}>Application Received!</h1>
          <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem' }}>
            Thanks for applying to mentor with WorkforceAP. We&apos;ll review your application and reach out within a few business days.
          </p>
          <Link href="/" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>← Back to Home</Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ background: 'var(--color-surface)', minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <Link href="/mentor" style={{ color: 'var(--color-accent)', fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none' }}>← Back</Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '1rem 0 0.25rem', color: 'var(--color-on-surface)' }}>Mentor Application</h1>
        <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '2rem', fontSize: '0.9rem' }}>Tell us about yourself so we can match you with the right members.</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {[
            { label: 'Full Name', key: 'fullName', type: 'text', required: true },
            { label: 'Job Title', key: 'title', type: 'text', required: true },
            { label: 'Company', key: 'company', type: 'text', required: true },
            { label: 'LinkedIn URL', key: 'linkedinUrl', type: 'url', required: false },
          ].map(({ label, key, type, required }) => (
            <div key={key}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.4rem', color: 'var(--color-on-surface)' }}>
                {label}{required && ' *'}
              </label>
              <input
                type={type}
                required={required}
                value={(form as Record<string, unknown>)[key] as string}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                style={{ width: '100%', border: '1px solid var(--surface-container-high)', borderRadius: 8, padding: '0.625rem 0.875rem', fontSize: '0.9rem', background: 'var(--color-surface)', color: 'var(--color-on-surface)', boxSizing: 'border-box' }}
              />
            </div>
          ))}

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.4rem', color: 'var(--color-on-surface)' }}>Industry *</label>
            <select
              required
              value={form.industry}
              onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
              style={{ width: '100%', border: '1px solid var(--surface-container-high)', borderRadius: 8, padding: '0.625rem 0.875rem', fontSize: '0.9rem', background: 'var(--color-surface)', color: 'var(--color-on-surface)', boxSizing: 'border-box' }}
            >
              <option value="">Select industry</option>
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.4rem', color: 'var(--color-on-surface)' }}>Bio *</label>
            <textarea
              required
              rows={4}
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder="Tell members about your background, expertise, and what you can help with..."
              style={{ width: '100%', border: '1px solid var(--surface-container-high)', borderRadius: 8, padding: '0.625rem 0.875rem', fontSize: '0.9rem', background: 'var(--color-surface)', color: 'var(--color-on-surface)', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.4rem', color: 'var(--color-on-surface)' }}>Hours Available per Month *</label>
            <input
              type="number" min={1} max={40} required
              value={form.availableHours}
              onChange={(e) => setForm((f) => ({ ...f, availableHours: Number(e.target.value) }))}
              style={{ width: 100, border: '1px solid var(--surface-container-high)', borderRadius: 8, padding: '0.625rem 0.875rem', fontSize: '0.9rem', background: 'var(--color-surface)', color: 'var(--color-on-surface)' }}
            />
          </div>

          <button
            type="submit" disabled={loading}
            style={{ background: 'var(--color-accent)', color: '#fff', border: 0, borderRadius: 8, padding: '0.875rem', fontWeight: 700, fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Submitting…' : 'Submit Application'}
          </button>
        </form>
      </div>
    </main>
  );
}
