'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PUBLIC_REFERRAL_SOURCE_OPTIONS } from '@/lib/referralSources';

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
  starterProfileReviewRequired = false,
  starterProfileMissingFields = [],
}: DashboardProfileFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
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
          linkedin: linkedin.trim() || null,
          bio: bio.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Update failed');
        setLoading(false);
        return;
      }
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
              background: 'color-mix(in srgb, var(--color-accent) 8%, white)',
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
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="address">Physical address (required for training enrollment)</label>
          <input
            id="address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
            minLength={5}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label htmlFor="city">City</label>
            <input id="city" type="text" value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" />
          </div>
          <div className="form-group">
            <label htmlFor="state">State</label>
            <input id="state" type="text" value={state} onChange={(e) => setState(e.target.value)} autoComplete="address-level1" maxLength={50} />
          </div>
          <div className="form-group">
            <label htmlFor="zip">ZIP code</label>
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
            type="url"
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            placeholder="https://linkedin.com/in/..."
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
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }} disabled={loading}>
        {loading ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
