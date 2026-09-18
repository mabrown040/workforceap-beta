'use client';

import { useState } from 'react';
import { normalizePrimaryBarriers, PRIMARY_BARRIER_OPTIONS } from '@/lib/apply/primaryBarrierOptions';
import HearAboutSelect from '@/components/apply/HearAboutSelect';
import WorkforceCenterHint from '@/components/apply/WorkforceCenterHint';
import {
  FOOD_STAMPS_QUESTION,
  hearAboutNeedsOther,
  layoffCompanyApplicable,
  type YesNo,
} from '@/lib/apply/eligibilityExtendedFields';
import {
  householdPovertyOptions,
  normalizeHouseholdSize,
  povertyGuidelineLabel,
  type HouseholdSizeOption,
} from '@/lib/apply/householdPoverty';
import { isValidPostalCode } from '@/lib/validation/postalCode';

// Option values copied EXACTLY from app/apply/ApplyEligibilityClient.tsx so the
// public no-account form writes the same canonical values the rest of the app
// reads (PRIMARY_BARRIERS includes seeking_skills_training).
const AGE_GROUPS = [
  { value: '18_24', label: '18–24' },
  { value: '25_50', label: '25–50' },
  { value: '50_plus', label: '50+' },
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
  q1?: YesNo | null;
  q2?: YesNo | null;
  q3?: YesNo | null;
  underemployed?: YesNo | null;
  householdSize?: number | null;
  receivingUnemployment?: YesNo | null;
  exhaustedUnemployment?: YesNo | null;
  layoffCompany?: string;
  snapWic?: YesNo | null;
  hearAbout?: string;
  hearAboutOther?: string;
  partnerAmbassadorReferral?: string;
};

const fieldGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.35rem' };
const labelStyle: React.CSSProperties = { fontWeight: 600, fontSize: '0.9rem' };
const inputStyle: React.CSSProperties = {
  padding: '0.6rem 0.7rem',
  borderRadius: '0.45rem',
  border: '1px solid var(--color-outline, #cbcbcb)',
  fontSize: '1rem',
};

function YesNoGroup({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: string;
  value: YesNo | null;
  onChange: (v: YesNo) => void;
}) {
  return (
    <fieldset style={{ ...fieldGroup, border: 'none', padding: 0, margin: 0 }}>
      <legend style={labelStyle}>{label} *</legend>
      <div role="radiogroup" className="form-radio-cards" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.35rem' }}>
        {(['yes', 'no'] as const).map((opt) => {
          const selected = value === opt;
          return (
            <label
              key={opt}
              className={`form-radio-card${selected ? ' selected' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                minHeight: '48px',
                fontSize: '0.9375rem',
                fontWeight: 700,
                color: selected ? 'var(--color-on-accent, #fff)' : 'var(--color-on-surface)',
                background: selected ? 'var(--color-accent)' : 'var(--surface-container-lowest)',
                border: selected
                  ? '2px solid var(--color-accent)'
                  : '1px solid var(--outline-variant, rgba(0,0,0,0.18))',
                borderRadius: 'var(--radius-md, 8px)',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name={name}
                value={opt}
                checked={selected}
                onChange={() => onChange(opt)}
                required
                style={{ accentColor: 'var(--color-accent)' }}
              />
              {opt === 'yes' ? 'Yes' : 'No'}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

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
  const [primaryBarriers, setPrimaryBarriers] = useState<string[]>(
    normalizePrimaryBarriers(prefill.primaryBarriers),
  );
  const [q1, setQ1] = useState<YesNo | null>(prefill.q1 ?? null);
  const [q2, setQ2] = useState<YesNo | null>(prefill.q2 ?? null);
  const [q3, setQ3] = useState<YesNo | null>(prefill.q3 ?? null);
  const [underemployed, setUnderemployed] = useState<YesNo | null>(prefill.underemployed ?? null);
  const [householdSize, setHouseholdSize] = useState<HouseholdSizeOption | ''>(
    normalizeHouseholdSize(prefill.householdSize) ?? '',
  );
  const [receivingUnemployment, setReceivingUnemployment] = useState<YesNo | null>(
    prefill.receivingUnemployment ?? null,
  );
  const [exhaustedUnemployment, setExhaustedUnemployment] = useState<YesNo | null>(
    prefill.exhaustedUnemployment ?? null,
  );
  const [layoffCompany, setLayoffCompany] = useState(prefill.layoffCompany ?? '');
  const [snapWic, setSnapWic] = useState<YesNo | null>(prefill.snapWic ?? null);
  const [hearAbout, setHearAbout] = useState(prefill.hearAbout ?? '');
  const [hearAboutOther, setHearAboutOther] = useState(prefill.hearAboutOther ?? '');
  const [partnerAmbassadorReferral, setPartnerAmbassadorReferral] = useState(
    prefill.partnerAmbassadorReferral ?? '',
  );

  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const toggleBarrier = (v: string) =>
    setPrimaryBarriers((cur) =>
      normalizePrimaryBarriers(cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v])
    );

  const zipOk = isValidPostalCode(zip);
  const showLayoff = layoffCompanyApplicable({
    unemployedOrUnderemployed: q1 === 'yes' || underemployed === 'yes' ? 'yes' : q1,
    receivingUnemployment,
    exhaustedUnemployment,
  });
  const fundingOk =
    q1 !== null &&
    receivingUnemployment !== null &&
    exhaustedUnemployment !== null &&
    underemployed !== null &&
    !!householdSize &&
    q2 !== null &&
    q3 !== null &&
    snapWic !== null;
  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    !!ageGroup &&
    city.trim().length > 0 &&
    stateVal.trim().length > 0 &&
    zipOk &&
    county.trim().length > 0 &&
    primaryBarriers.length > 0 &&
    hearAbout.trim().length > 0 &&
    (!hearAboutNeedsOther(hearAbout) || hearAboutOther.trim().length > 0) &&
    fundingOk &&
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
          q1,
          q2,
          q3,
          underemployed,
          householdSize: householdSize || null,
          receivingUnemployment,
          exhaustedUnemployment,
          layoffCompany: layoffCompany.trim() || null,
          snapWic,
          hearAbout: hearAbout.trim(),
          hearAboutOther: hearAboutNeedsOther(hearAbout) ? hearAboutOther.trim() || null : null,
          partnerAmbassadorReferral: partnerAmbassadorReferral.trim() || null,
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
        <label style={labelStyle} htmlFor="q-zip">ZIP code *</label>
        <input
          id="q-zip"
          style={inputStyle}
          value={zip}
          autoComplete="postal-code"
          inputMode="text"
          onChange={(e) => setZip(e.target.value)}
          required
          aria-invalid={zip.length > 0 && !zipOk}
        />
        <WorkforceCenterHint zip={zip} county={county} state={stateVal} />
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
        <label style={labelStyle} htmlFor="q-county">County *</label>
        <input id="q-county" style={inputStyle} value={county} onChange={(e) => setCounty(e.target.value)} required />
      </div>

      <YesNoGroup
        name="q1"
        label="1. Are you currently unemployed?"
        value={q1}
        onChange={setQ1}
      />
      <YesNoGroup
        name="receivingUnemployment"
        label="2. Are you currently receiving unemployment benefits?"
        value={receivingUnemployment}
        onChange={setReceivingUnemployment}
      />
      <YesNoGroup
        name="exhaustedUnemployment"
        label="3. Have you exhausted unemployment benefits?"
        value={exhaustedUnemployment}
        onChange={setExhaustedUnemployment}
      />
      <YesNoGroup
        name="underemployed"
        label="4. Are you working part-time or underemployed?"
        value={underemployed}
        onChange={setUnderemployed}
      />
      {showLayoff ? (
        <div style={fieldGroup}>
          <label style={labelStyle} htmlFor="q-layoff">What company did you get laid off from, or last work for?</label>
          <input id="q-layoff" style={inputStyle} value={layoffCompany} maxLength={200} onChange={(e) => setLayoffCompany(e.target.value)} />
        </div>
      ) : null}
      <div style={fieldGroup}>
        <label style={labelStyle} htmlFor="q-household-size">Household size — federal poverty guideline *</label>
        <select
          id="q-household-size"
          style={inputStyle}
          value={householdSize === '' ? '' : String(householdSize)}
          onChange={(e) => setHouseholdSize(normalizeHouseholdSize(e.target.value) ?? '')}
          required
        >
          <option value="">Select household size to see the poverty level</option>
          {householdPovertyOptions().map((option) => (
            <option key={option.size} value={option.size}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <YesNoGroup
        name="q2"
        label={
          householdSize
            ? `Is your household income at or below ${povertyGuidelineLabel(householdSize)}?`
            : 'Is your household income at or below the federal poverty level for your household size?'
        }
        value={q2}
        onChange={setQ2}
      />
      <YesNoGroup name="snapWic" label={FOOD_STAMPS_QUESTION} value={snapWic} onChange={setSnapWic} />
      <YesNoGroup name="q3" label="Authorized to work in the U.S.?" value={q3} onChange={setQ3} />

      <fieldset style={{ ...fieldGroup, border: 'none', padding: 0, margin: 0 }}>
        <legend style={labelStyle}>Primary barrier(s) — check all that apply *</legend>
        <div role="group" aria-label="Primary barriers" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.35rem' }}>
          {PRIMARY_BARRIER_OPTIONS.map((o) => (
            <label key={o.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
              <input type="checkbox" value={o.value} checked={primaryBarriers.includes(o.value)} onChange={() => toggleBarrier(o.value)} />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div style={fieldGroup}>
        <label style={labelStyle} htmlFor="q-hear-about">How did you hear about WorkforceAP? *</label>
        <HearAboutSelect
          id="q-hear-about"
          style={inputStyle}
          value={hearAbout}
          onChange={setHearAbout}
          required
        />
      </div>
      {hearAboutNeedsOther(hearAbout) ? (
        <div style={fieldGroup}>
          <label style={labelStyle} htmlFor="q-hear-other">Please tell us how you heard about us *</label>
          <input id="q-hear-other" style={inputStyle} value={hearAboutOther} maxLength={200} onChange={(e) => setHearAboutOther(e.target.value)} required />
        </div>
      ) : null}
      <div style={fieldGroup}>
        <label style={labelStyle} htmlFor="q-ambassador">Partner or community ambassador referral</label>
        <input
          id="q-ambassador"
          style={inputStyle}
          value={partnerAmbassadorReferral}
          maxLength={200}
          placeholder="Ambassador name or referral code"
          onChange={(e) => setPartnerAmbassadorReferral(e.target.value)}
        />
      </div>

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
          cursor: canSubmit ? 'pointer' : 'not-allowed',
        }}
      >
        {status === 'submitting' ? 'Submitting…' : 'Submit eligibility info'}
      </button>
    </form>
  );
}
