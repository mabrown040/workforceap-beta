'use client';

import { useState } from 'react';

const COMPANY_SIZES = [
  { value: '', label: 'Select…' },
  { value: '1-10', label: '1–10' },
  { value: '11-50', label: '11–50' },
  { value: '51-200', label: '51–200' },
  { value: '201-500', label: '201–500' },
  { value: '501-1000', label: '501–1,000' },
  { value: '1000+', label: '1,000+' },
];

const INDUSTRIES = [
  { value: '', label: 'Select…' },
  { value: 'technology', label: 'Technology' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'retail', label: 'Retail & hospitality' },
  { value: 'finance', label: 'Finance & insurance' },
  { value: 'professional', label: 'Professional services' },
  { value: 'education', label: 'Education & nonprofit' },
  { value: 'government', label: 'Government' },
  { value: 'construction', label: 'Construction & trades' },
  { value: 'other', label: 'Other' },
];

export type EmployerSettingsInitial = {
  companyName: string;
  companyDescription: string | null;
  companyWebsite: string | null;
  companySize: string | null;
  industry: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
};

export default function EmployerSettingsForm({ initial }: { initial: EmployerSettingsInitial }) {
  const [companyName, setCompanyName] = useState(initial.companyName);
  const [companyDescription, setCompanyDescription] = useState(initial.companyDescription ?? '');
  const [companyWebsite, setCompanyWebsite] = useState(initial.companyWebsite ?? '');
  const [companySize, setCompanySize] = useState(initial.companySize ?? '');
  const [industry, setIndustry] = useState(initial.industry ?? '');
  const [contactName, setContactName] = useState(initial.contactName);
  const [contactEmail, setContactEmail] = useState(initial.contactEmail);
  const [contactPhone, setContactPhone] = useState(initial.contactPhone ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const r = await fetch('/api/employer/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          companyDescription: companyDescription.trim() || null,
          companyWebsite: companyWebsite.trim() || null,
          companySize: companySize || null,
          industry: industry || null,
          contactName,
          contactEmail,
          contactPhone: contactPhone.trim() || null,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMessage({ type: 'err', text: typeof data.error === 'string' ? data.error : 'Save failed' });
        return;
      }
      setMessage({ type: 'ok', text: 'Saved.' });
    } catch {
      setMessage({ type: 'err', text: 'Network error. Try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="employer-settings-form" onSubmit={handleSubmit}>
      {message ? (
        <p
          className={message.type === 'ok' ? 'employer-settings-form__success' : 'employer-settings-form__error'}
          role="status"
        >
          {message.text}
        </p>
      ) : null}

      <fieldset className="employer-settings-form__fieldset">
        <legend className="employer-settings-form__legend">Company</legend>
        <div className="form-group">
          <label htmlFor="emp-co-name">Company name</label>
          <input
            id="emp-co-name"
            className="form-control"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
            maxLength={200}
          />
        </div>
        <div className="form-group">
          <label htmlFor="emp-co-desc">Company description</label>
          <textarea
            id="emp-co-desc"
            className="form-control"
            rows={5}
            value={companyDescription}
            onChange={(e) => setCompanyDescription(e.target.value)}
            maxLength={8000}
          />
        </div>
        <div className="form-group">
          <label htmlFor="emp-co-web">Website URL</label>
          <input
            id="emp-co-web"
            type="url"
            className="form-control"
            placeholder="https://"
            value={companyWebsite}
            onChange={(e) => setCompanyWebsite(e.target.value)}
            maxLength={500}
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="emp-co-size">Company size</label>
            <select
              id="emp-co-size"
              className="form-control"
              value={companySize}
              onChange={(e) => setCompanySize(e.target.value)}
            >
              {COMPANY_SIZES.map((o) => (
                <option key={o.value || 'empty'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="emp-co-ind">Industry</label>
            <select
              id="emp-co-ind"
              className="form-control"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            >
              {INDUSTRIES.map((o) => (
                <option key={o.value || 'empty'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset className="employer-settings-form__fieldset">
        <legend className="employer-settings-form__legend">Primary contact</legend>
        <div className="form-group">
          <label htmlFor="emp-ct-name">Contact name</label>
          <input
            id="emp-ct-name"
            className="form-control"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            required
            maxLength={200}
          />
        </div>
        <div className="form-group">
          <label htmlFor="emp-ct-email">Contact email</label>
          <input
            id="emp-ct-email"
            type="email"
            className="form-control"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            required
            maxLength={320}
          />
        </div>
        <div className="form-group">
          <label htmlFor="emp-ct-phone">Contact phone</label>
          <input
            id="emp-ct-phone"
            type="tel"
            className="form-control"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            maxLength={50}
          />
        </div>
      </fieldset>

      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}
