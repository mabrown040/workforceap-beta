'use client';

import { useEffect, useRef, useState } from 'react';

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
  logoUrl: string | null;
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
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl ?? '');
  const [logoUploading, setLogoUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.set('file', file);
      const r = await fetch('/api/employer/logo', { method: 'POST', body: fd });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMessage({ type: 'err', text: typeof data.error === 'string' ? data.error : 'Logo upload failed' });
        return;
      }
      const url = typeof data.logoUrl === 'string' ? data.logoUrl : '';
      setLogoUrl(url);
      setMessage({ type: 'ok', text: 'Logo updated. It may take a moment to appear on job postings.' });
    } catch {
      setMessage({ type: 'err', text: 'Logo upload failed' });
    } finally {
      setLogoUploading(false);
      e.target.value = '';
    }
  };

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
      setToast('Company settings saved.');
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 4000);
    } catch {
      setMessage({ type: 'err', text: 'Network error. Try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="employer-settings-form" onSubmit={handleSubmit}>
      {toast ? (
        <div
          className="employer-settings-save-toast"
          role="status"
          style={{
            position: 'fixed',
            bottom: '1.25rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 200,
            padding: '0.65rem 1.25rem',
            borderRadius: '999px',
            background: 'var(--color-primary)',
            color: '#fff',
            fontSize: '0.9rem',
            fontWeight: 600,
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {toast}
        </div>
      ) : null}
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
          <label htmlFor="emp-logo">Company logo</label>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', margin: '0 0 0.5rem' }}>
            Shown in your employer portal header and on your live job cards for members. PNG or JPG, max 2MB.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Current company logo" width={72} height={72} style={{ objectFit: 'contain', borderRadius: 8, border: '1px solid var(--outline-variant)' }} />
            ) : (
              <div style={{ width: 72, height: 72, borderRadius: 8, background: 'var(--surface-container)', border: '1px dashed var(--outline-variant)' }} aria-hidden />
            )}
            <input
              id="emp-logo"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
              onChange={handleLogoChange}
              disabled={logoUploading}
            />
            {logoUploading ? (
              <span style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }} aria-live="polite">
                Uploading logo… Save is disabled until this finishes.
              </span>
            ) : null}
          </div>
        </div>
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
            placeholder="Example: We are a Tulsa-based managed IT provider serving healthcare and legal clients. We hire entry-level IT support and junior cybersecurity talent, and we value coachability, customer service, and certification progress."
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

      <button type="submit" className="btn btn-primary" disabled={saving || logoUploading}>
        {saving ? 'Saving…' : logoUploading ? 'Wait for logo upload…' : 'Save changes'}
      </button>
    </form>
  );
}
