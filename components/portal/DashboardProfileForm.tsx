'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PUBLIC_REFERRAL_SOURCE_OPTIONS } from '@/lib/referralSources';

const BARRIER_OPTIONS = [
  { value: 'justice_involved', label: 'Justice-involved background' },
  { value: 'employment_gap', label: 'Significant employment gap (1+ year)' },
  { value: 'limited_work_history', label: 'Limited or no work history' },
  { value: 'disability', label: 'Disability affecting employment' },
  { value: 'housing_instability', label: 'Housing instability' },
  { value: 'domestic_violence', label: 'Domestic violence situation' },
  { value: 'homelessness', label: 'Homelessness' },
  { value: 'substance_recovery', label: 'Substance recovery' },
  { value: 'other', label: 'Other' },
] as const;

const EMPLOYMENT_STATUS_OPTIONS = [
  { value: 'employed_full_time', label: 'Employed full-time' },
  { value: 'employed_part_time', label: 'Employed part-time' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'underemployed', label: 'Underemployed (working below your skill level or hours)' },
  { value: 'not_looking', label: 'Not currently looking' },
] as const;

type DashboardProfileFormProps = {
  defaultFirstName: string;
  defaultLastName: string;
  defaultPhone: string;
  defaultAddress: string;
  defaultCity: string;
  defaultState: string;
  defaultZip: string;
  defaultReferralSource: string;
  defaultLinkedin: string;
  defaultBio: string;
  defaultFinancialAidInterest?: boolean | null;
  defaultHasEmploymentBarrier?: boolean;
  defaultBarrierTypes?: string[];
  defaultEmploymentStatusAtEnroll?: string | null;
  starterProfileReviewRequired?: boolean;
  starterProfileMissingFields?: string[];
};

export default function DashboardProfileForm({
  defaultFirstName,
  defaultLastName,
  defaultPhone,
  defaultAddress,
  defaultCity,
  defaultState,
  defaultZip,
  defaultReferralSource,
  defaultLinkedin,
  defaultBio,
  defaultHasEmploymentBarrier = false,
  defaultBarrierTypes = [],
  defaultEmploymentStatusAtEnroll = null,
  starterProfileReviewRequired = false,
  starterProfileMissingFields = [],
}: DashboardProfileFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [justSaved, setJustSaved] = useState(false);
  const [firstName, setFirstName] = useState(defaultFirstName);
  const [lastName, setLastName] = useState(defaultLastName);
  const [phone, setPhone] = useState(defaultPhone);
  const [address, setAddress] = useState(defaultAddress);
  const [city, setCity] = useState(defaultCity);
  const [state, setState] = useState(defaultState);
  const [zip, setZip] = useState(defaultZip);
  const [referralSource, setReferralSource] = useState(defaultReferralSource);
  const [linkedin, setLinkedin] = useState(defaultLinkedin);
  const [bio, setBio] = useState(defaultBio);
  const [hasEmploymentBarrier, setHasEmploymentBarrier] = useState(defaultHasEmploymentBarrier);
  const [barrierTypes, setBarrierTypes] = useState<string[]>(defaultBarrierTypes);
  const [employmentStatusAtEnroll, setEmploymentStatusAtEnroll] = useState<string>(defaultEmploymentStatusAtEnroll ?? '');

  const toggleBarrierType = (value: string) => {
    setBarrierTypes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setJustSaved(false);
    setLoading(true);
    // Accept "linkedin.com/in/..." without forcing members to type the scheme
    const linkedinTrimmed = linkedin.trim();
    const normalizedLinkedin = linkedinTrimmed
      ? /^https?:\/\//i.test(linkedinTrimmed)
        ? linkedinTrimmed
        : `https://${linkedinTrimmed}`
      : null;
    try {
      const res = await fetch('/api/member/dashboard-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          zip: zip.trim() || null,
          referralSource: referralSource.trim() || null,
          linkedin: normalizedLinkedin,
          bio: bio.trim() || null,
          hasEmploymentBarrier: barrierTypes.length > 0,
          barrierTypes,
          employmentStatusAtEnroll: employmentStatusAtEnroll || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Update failed');
        setLoading(false);
        return;
      }
      setJustSaved(true);
      router.refresh();
    } catch {
      setError('Update failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '640px' }}>
      <div style={{ display: 'grid', gap: '1rem' }}>
        {starterProfileReviewRequired ? (
          <div
            style={{
              padding: '0.9rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'color-mix(in srgb, var(--color-accent) 8%, var(--surface-container-low))',
              border: '1px solid color-mix(in srgb, var(--color-accent) 18%, transparent)',
            }}
          >
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-on-surface)' }}>Review counselor-entered starter details</p>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>
              Before WorkforceAP unlocks your Training Preassessment, confirm your contact and referral details here.
              {starterProfileMissingFields.length > 0 ? ` Missing now: ${starterProfileMissingFields.join(', ')}.` : ''}
            </p>
          </div>
        ) : null}
        <div className="form-group">
          <label htmlFor="firstName">First Name *</label>
          <input
            id="firstName"
            type="text"
            autoComplete="given-name"
            inputMode="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="lastName">Last Name *</label>
          <input
            id="lastName"
            type="text"
            autoComplete="family-name"
            inputMode="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="phone">Phone Number</label>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="address">Physical address (required for training enrollment)</label>
          <input
            id="address"
            type="text"
            autoComplete="street-address"
            inputMode="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
            minLength={5}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label htmlFor="city">City</label>
            <input id="city" type="text" inputMode="text" value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" />
          </div>
          <div className="form-group">
            <label htmlFor="state">State</label>
            <input id="state" type="text" inputMode="text" value={state} onChange={(e) => setState(e.target.value)} autoComplete="address-level1" maxLength={50} />
          </div>
          <div className="form-group">
            <label htmlFor="zip">ZIP / postal code</label>
            <input id="zip" type="text" value={zip} onChange={(e) => setZip(e.target.value)} autoComplete="postal-code" inputMode="numeric" maxLength={10} />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="referralSource">How did you hear about WorkforceAP?</label>
          <select id="referralSource" value={referralSource} onChange={(e) => setReferralSource(e.target.value)}>
            <option value="">Select…</option>
            {PUBLIC_REFERRAL_SOURCE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', margin: 0 }}>
          WorkforceAP programs are no cost to members. Keep your phone and address current so our team can confirm eligibility and next steps.
        </p>
        <div className="form-group">
          <label htmlFor="linkedin">LinkedIn URL (optional)</label>
          <input
            id="linkedin"
            type="text"
            inputMode="url"
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            placeholder="linkedin.com/in/your-name"
          />
        </div>
        <div className="form-group">
          <label htmlFor="bio">Career Goals (optional)</label>
          <textarea
            id="bio"
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>

        {/* Employment background section */}
        <div
          style={{
            borderTop: '1px solid var(--outline-variant)',
            paddingTop: '1.25rem',
            display: 'grid',
            gap: '1rem',
          }}
        >
          <h3
            style={{
              fontSize: '0.9375rem',
              fontWeight: 700,
              color: 'var(--color-on-surface)',
              margin: 0,
            }}
          >
            Employment background
          </h3>

          <div className="form-group">
            <label htmlFor="employmentStatusAtEnroll">Employment status at enrollment</label>
            <select
              id="employmentStatusAtEnroll"
              value={employmentStatusAtEnroll}
              onChange={(e) => setEmploymentStatusAtEnroll(e.target.value)}
            >
              <option value="">Select…</option>
              {EMPLOYMENT_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-on-surface-variant)',
                margin: '0 0 0.75rem',
                lineHeight: 1.6,
              }}
            >
              Some members face extra barriers to employment. Checking these helps us match you with
              the right support — it&apos;s completely optional.
            </p>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {BARRIER_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                    fontSize: '0.875rem',
                    color: 'var(--color-on-surface)',
                    cursor: 'pointer',
                    minHeight: 44,
                  }}
                >
                  <input
                    type="checkbox"
                    value={opt.value}
                    checked={barrierTypes.includes(opt.value)}
                    onChange={() => toggleBarrierType(opt.value)}
                    style={{ flexShrink: 0 }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            {/* Keep hasEmploymentBarrier in sync with checkbox selection */}
            <input
              type="hidden"
              name="hasEmploymentBarrier"
              value={barrierTypes.length > 0 ? 'true' : 'false'}
              readOnly
            />
          </div>
        </div>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Saving...' : 'Save'}
        </button>
        <p role="status" aria-live="polite" style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-success, #16a34a)', opacity: justSaved && !loading ? 1 : 0, transition: 'opacity 0.2s' }}>
          {justSaved && !loading ? 'Saved' : ''}
        </p>
      </div>
    </form>
  );
}
