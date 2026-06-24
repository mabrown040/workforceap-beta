'use client';

import '@/css/marketing-v3-mentor.css';
import { useState } from 'react';
import LocalizedLink from '@/components/LocalizedLink';

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Manufacturing',
  'Retail',
  'Education',
  'Construction',
  'Logistics',
  'Hospitality',
  'Other',
];

export default function MentorApplyForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    title: '',
    company: '',
    industry: '',
    bio: '',
    linkedinUrl: '',
    availableHours: 2,
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
      <div className="wa-v3">
        <main className="wa-apply-done">
          <div className="wa-apply-done-in">
            <div className="wa-apply-done-emoji">🎉</div>
            <h1>Application Received!</h1>
            <p>
              Thanks for applying to mentor with WorkforceAP. We&rsquo;ll review your application
              and reach out within a few business days.
            </p>
            <LocalizedLink href="/">← Back to Home</LocalizedLink>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="wa-v3">
      <main className="wa-apply-page">
        <div className="wa-apply-shell">
          <LocalizedLink href="/mentor" className="wa-apply-back">
            ← Back
          </LocalizedLink>
          <h1 className="wa-apply-head">Mentor Application</h1>
          <p className="wa-apply-sub">
            Tell us about yourself so we can match you with the right members.
          </p>

          <form onSubmit={handleSubmit} className="wa-apply-form">
            {[
              { label: 'Full Name', key: 'fullName', type: 'text', required: true },
              { label: 'Job Title', key: 'title', type: 'text', required: true },
              { label: 'Company', key: 'company', type: 'text', required: true },
              { label: 'LinkedIn URL', key: 'linkedinUrl', type: 'url', required: false },
            ].map(({ label, key, type, required }) => (
              <div className="wa-mfield" key={key}>
                <label>
                  {label}
                  {required && ' *'}
                </label>
                <input
                  type={type}
                  required={required}
                  value={(form as Record<string, unknown>)[key] as string}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}

            <div className="wa-mfield">
              <label>Industry *</label>
              <select
                required
                value={form.industry}
                onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
              >
                <option value="">Select industry</option>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>

            <div className="wa-mfield">
              <label>Bio *</label>
              <textarea
                required
                rows={4}
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="Tell members about your background, expertise, and what you can help with..."
              />
            </div>

            <div className="wa-mfield wa-mfield--hours">
              <label>Hours Available per Month *</label>
              <input
                type="number"
                min={1}
                max={40}
                required
                value={form.availableHours}
                onChange={(e) => setForm((f) => ({ ...f, availableHours: Number(e.target.value) }))}
              />
            </div>

            <button type="submit" disabled={loading} className="wa-btn wa-btn--primary">
              {loading ? 'Submitting…' : 'Submit Application'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
