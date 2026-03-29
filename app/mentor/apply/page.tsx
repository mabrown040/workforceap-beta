'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail',
  'Education', 'Government', 'Construction', 'Transportation', 'Hospitality',
  'Legal', 'Marketing', 'Non-Profit', 'Energy', 'Other',
];

const SPECIALTIES = [
  'Resume Review', 'Mock Interviews', 'Career Pivots', 'Networking',
  'Salary Negotiation', 'Technical Skills', 'Leadership Development',
  'Entrepreneurship', 'Job Search Strategy', 'Professional Communication',
];

export default function MentorApplyPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: '',
    title: '',
    company: '',
    industry: '',
    bio: '',
    linkedinUrl: '',
    availableHours: 2,
    specialties: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  function toggleSpecialty(s: string) {
    setForm((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(s)
        ? prev.specialties.filter((x) => x !== s)
        : [...prev.specialties, s],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/mentors/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit application');
      }
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: 24 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 48, maxWidth: 480, textAlign: 'center', boxShadow: '0 2px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>Application Submitted!</h2>
          <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: 24 }}>
            Thank you for applying to mentor with WorkforceAP. Our team will review your application and reach out within 48 hours.
          </p>
          <button
            onClick={() => router.push('/')}
            style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', fontWeight: 700, cursor: 'pointer', fontSize: 16 }}
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1px solid #d1d5db', borderRadius: 8,
    padding: '10px 12px', fontSize: 16, outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = { display: 'block', fontWeight: 600, color: '#374151', marginBottom: 6, fontSize: 14 };

  return (
    <>
      {/* Desktop */}
      <div className="wa-md:wa-block wa-hidden">
        <main style={{ minHeight: '100vh', background: '#f8fafc', padding: '48px 24px' }}>
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <div style={{ marginBottom: 32, textAlign: 'center' }}>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>Mentor Application</h1>
              <p style={{ color: '#475569', fontSize: 16 }}>
                Takes about 5 minutes. We&apos;ll review and get back to you within 48 hours.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 12, padding: 36, boxShadow: '0 2px 16px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Full Name *</label>
                  <input style={inputStyle} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required placeholder="Jane Smith" />
                </div>
                <div>
                  <label style={labelStyle}>Job Title *</label>
                  <input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Senior Software Engineer" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Company *</label>
                  <input style={inputStyle} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required placeholder="Google" />
                </div>
                <div>
                  <label style={labelStyle}>Industry *</label>
                  <select style={inputStyle} value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} required>
                    <option value="">Select industry…</option>
                    {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Bio *</label>
                <textarea
                  style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  required
                  placeholder="Tell members about your background, career journey, and what you enjoy helping people with…"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>LinkedIn URL</label>
                  <input style={inputStyle} value={form.linkedinUrl} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} placeholder="https://linkedin.com/in/janedoe" />
                </div>
                <div>
                  <label style={labelStyle}>Hours Available / Month *</label>
                  <input type="number" style={inputStyle} value={form.availableHours} min={1} max={40} onChange={(e) => setForm({ ...form, availableHours: parseInt(e.target.value) || 2 })} required />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Specialties (select all that apply)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {SPECIALTIES.map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => toggleSpecialty(s)}
                      style={{
                        padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        border: form.specialties.includes(s) ? '2px solid #2563eb' : '2px solid #d1d5db',
                        background: form.specialties.includes(s) ? '#eff6ff' : '#fff',
                        color: form.specialties.includes(s) ? '#1d4ed8' : '#374151',
                      }}
                    >{s}</button>
                  ))}
                </div>
              </div>

              {error && <div style={{ color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: 12 }}>{error}</div>}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  background: submitting ? '#94a3b8' : '#2563eb', color: '#fff',
                  border: 'none', borderRadius: 8, padding: '14px',
                  fontWeight: 700, fontSize: 16, cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? 'Submitting…' : 'Submit Application'}
              </button>
            </form>
          </div>
        </main>
      </div>

      {/* Mobile */}
      <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        <div style={{ background: '#1e3a5f', color: '#fff', padding: '32px 20px 24px' }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Mentor Application</h1>
          <p style={{ opacity: 0.85, fontSize: 14 }}>~5 minutes · We review within 48h</p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={labelStyle}>Full Name *</label>
            <input style={inputStyle} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required placeholder="Jane Smith" />
          </div>
          <div>
            <label style={labelStyle}>Job Title *</label>
            <input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Senior Software Engineer" />
          </div>
          <div>
            <label style={labelStyle}>Company *</label>
            <input style={inputStyle} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required placeholder="Google" />
          </div>
          <div>
            <label style={labelStyle}>Industry *</label>
            <select style={inputStyle} value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} required>
              <option value="">Select industry…</option>
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Bio *</label>
            <textarea style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} required placeholder="Your background and what you enjoy helping people with…" />
          </div>
          <div>
            <label style={labelStyle}>LinkedIn URL</label>
            <input style={inputStyle} value={form.linkedinUrl} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} placeholder="https://linkedin.com/in/…" />
          </div>
          <div>
            <label style={labelStyle}>Hours Available / Month *</label>
            <input type="number" style={inputStyle} value={form.availableHours} min={1} max={40} onChange={(e) => setForm({ ...form, availableHours: parseInt(e.target.value) || 2 })} required />
          </div>
          <div>
            <label style={labelStyle}>Specialties</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SPECIALTIES.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => toggleSpecialty(s)}
                  style={{
                    padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: form.specialties.includes(s) ? '2px solid #2563eb' : '2px solid #d1d5db',
                    background: form.specialties.includes(s) ? '#eff6ff' : '#fff',
                    color: form.specialties.includes(s) ? '#1d4ed8' : '#374151',
                  }}
                >{s}</button>
              ))}
            </div>
          </div>

          {error && <div style={{ color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: 12, fontSize: 14 }}>{error}</div>}

          <button
            type="submit"
            disabled={submitting}
            style={{
              background: submitting ? '#94a3b8' : '#2563eb', color: '#fff',
              border: 'none', borderRadius: 8, padding: '14px',
              fontWeight: 700, fontSize: 16, cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Submitting…' : 'Submit Application'}
          </button>
        </form>
      </div>
    </>
  );
}
