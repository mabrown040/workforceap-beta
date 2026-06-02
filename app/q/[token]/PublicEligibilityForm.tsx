'use client';

import { useState } from 'react';

// Option values copied EXACTLY from app/apply/ApplyEligibilityClient.tsx so the
// public no-account form writes the same canonical values the rest of the app
// reads (PRIMARY_BARRIERS includes seeking_skills_training).
const AGE_GROUPS = [
  { value: '18_24', label: '18–24' },
  { value: '25_50', label: '25–50' },
  { value: '50_plus', label: '50+' },
] as const;

const PRIMARY_BARRIERS = [
  { value: 'seeking_skills_training', label: 'Looking to increase skills with Occupational & Professional Certificate training' },
  { value: 'none', label: 'No barrier right now' },
  { value: 'employment_gap', label: 'Employment gap' },
  { value: 'limited_work_history', label: 'Limited work history' },
  { value: 'justice_involved', label: 'Background / justice involvement' },
  { value: 'disability', label: 'Disability or health barrier' },
  { value: 'housing_instability', label: 'Housing instability' },
  { value: 'other', label: 'Other barrier' },
] as const;

export type PublicEligibilityPrefill = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  ageGroup: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  primaryBarriers: string[];
};

const fieldGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.35rem' };
const labelStyle: React.CSSProperties = { fontWeight: 600, fontSize: '0.9rem' };
const inputStyle: React.CSSProperties = {
  padding: '0.6rem 0.7rem',
  borderRadius: '0.45rem',
  border: '1px solid var(--color-outline, #cbcbcb)',
  fontSize: '1rem',
};

export default function PublicEligibilityForm({
  token,
  prefill,
}: {
  token: string;
  prefill: PublicEligibilityPrefill;
}) {
  const [firstName, setFirstName] = useState(prefill.firstName);
  const [lastName, setLastName] = useState(prefill.lastName);
  const [phone, setPhone] = useState(prefill.phone);
  const [email, setEmail] = useState(prefill.email);
  const [ageGroup, setAgeGroup] = useState(prefill.ageGroup);
  const [city, setCity] = useState(prefill.city);
  const [stateVal, setStateVal] = useState(prefill.state);
  const [zip, setZip] = useState(prefill.zip);
  const [county, setCounty] = useState(prefill.county);
  const [primaryBarriers, setPrimaryBarriers] = useState<string[]>(prefill.primaryBarriers);

  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const toggleBarrier = (v: string) =>
    setPrimaryBarriers((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));

  const zipOk = /^\d{5}(-\d{4})?$/.test(zip.trim());
  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    !!ageGroup &&
    city.trim().length > 0 &&
    stateVal.trim().length > 0 &&
    zipOk &&
    county.trim().length > 0 &&
    primaryBarriers.length > 0 &&
    status !== 'submitting';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus('submitting');
    setErrorMsg('');
    try {
      const res = await fetch(`/api/q/${encodeURIComponent(token)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          ageGroup,
          city: city.trim(),
          state: stateVal.trim(),
          zip: zip.trim(),
          county: county.trim(),
          primaryBarriers,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'We could not save your answers. Please try again.');
      }
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'We could not save your answers. Please try again.');
    }
  };

  if (status === 'done') {
    return (
      <div
        role="status"
        style={{
          border: '1px solid var(--color-green, #15803d)',
          borderRadius: '0.75rem',
          padding: '2rem',
          textAlign: 'center',
          background: 'rgba(21, 128, 61, 0.06)',
        }}
      >
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.3rem' }}>Thank you!</h2>
        <p style={{ margin: 0, lineHeight: 1.6 }}>
          Your eligibility information has been submitted. A WorkforceAP advisor will follow up with
          you about next steps.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
      <div style={fieldGroup}>
        <label style={labelStyle} htmlFor="q-first-name">First name *</label>
        <input id="q-first-name" style={inputStyle} value={firstName} autoComplete="given-name" onChange={(e) => setFirstName(e.target.value)} required />
      </div>
      <div style={fieldGroup}>
        <label style={labelStyle} htmlFor="q-last-name">Last name *</label>
        <input id="q-last-name" style={inputStyle} value={lastName} autoComplete="family-name" onChange={(e) => setLastName(e.target.value)} required />
      </div>
      <div style={fieldGroup}>
        <label style={labelStyle} htmlFor="q-email">Email</label>
        <input id="q-email" type="email" style={inputStyle} value={email} autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div style={fieldGroup}>
        <label style={labelStyle} htmlFor="q-phone">Phone</label>
        <input id="q-phone" type="tel" style={inputStyle} value={phone} autoComplete="tel" placeholder="(512) 555-0100" onChange={(e) => setPhone(e.target.value)} />
      </div>

      <div style={fieldGroup}>
        <label style={labelStyle} htmlFor="q-age-group">Age group *</label>
        <select id="q-age-group" style={inputStyle} value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} required>
          <option value="">Select age group</option>
          {AGE_GROUPS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div style={fieldGroup}>
        <label style={labelStyle} htmlFor="q-city">City *</label>
        <input id="q-city" style={inputStyle} value={city} autoComplete="address-level2" onChange={(e) => setCity(e.target.value)} required />
      </div>
      <div style={fieldGroup}>
        <label style={labelStyle} htmlFor="q-state">State *</label>
        <input id="q-state" style={inputStyle} value={stateVal} autoComplete="address-level1" maxLength={50} onChange={(e) => setStateVal(e.target.value)} required />
      </div>
      <div style={fieldGroup}>
        <label style={labelStyle} htmlFor="q-zip">ZIP code *</label>
        <input id="q-zip" style={inputStyle} value={zip} autoComplete="postal-code" inputMode="numeric" onChange={(e) => setZip(e.target.value)} required aria-invalid={zip.length > 0 && !zipOk} />
      </div>
      <div style={fieldGroup}>
        <label style={labelStyle} htmlFor="q-county">County *</label>
        <input id="q-county" style={inputStyle} value={county} onChange={(e) => setCounty(e.target.value)} required />
      </div>

      <fieldset style={{ ...fieldGroup, border: 'none', padding: 0, margin: 0 }}>
        <legend style={labelStyle}>Primary barrier(s) — check all that apply *</legend>
        <div role="group" aria-label="Primary barriers" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.35rem' }}>
          {PRIMARY_BARRIERS.map((o) => (
            <label key={o.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
              <input type="checkbox" value={o.value} checked={primaryBarriers.includes(o.value)} onChange={() => toggleBarrier(o.value)} />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>

      {status === 'error' ? (
        <p role="alert" style={{ color: 'rgb(153,27,27)', margin: 0, fontSize: '0.9rem' }}>{errorMsg}</p>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        style={{
          padding: '0.7rem 1.1rem',
          borderRadius: '0.5rem',
          border: '1px solid var(--color-accent, #ad2c4d)',
          background: canSubmit ? 'var(--color-accent, #ad2c4d)' : 'var(--color-outline, #c9c9c9)',
          color: '#fff',
          fontWeight: 600,
          fontSize: '1rem',
          cursor: canSubmit ? 'pointer' : 'not-allowed',
        }}
      >
        {status === 'submitting' ? 'Submitting…' : 'Submit'}
      </button>
    </form>
  );
}
