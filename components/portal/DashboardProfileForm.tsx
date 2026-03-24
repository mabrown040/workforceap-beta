'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type DashboardProfileFormProps = {
  defaultFirstName: string;
  defaultLastName: string;
  defaultPhone: string;
  defaultAddress: string;
  defaultLinkedin: string;
  defaultBio: string;
  defaultFinancialAidInterest: boolean | null;
};

export default function DashboardProfileForm({
  defaultFirstName,
  defaultLastName,
  defaultPhone,
  defaultAddress,
  defaultLinkedin,
  defaultBio,
  defaultFinancialAidInterest,
}: DashboardProfileFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [firstName, setFirstName] = useState(defaultFirstName);
  const [lastName, setLastName] = useState(defaultLastName);
  const [phone, setPhone] = useState(defaultPhone);
  const [address, setAddress] = useState(defaultAddress);
  const [linkedin, setLinkedin] = useState(defaultLinkedin);
  const [bio, setBio] = useState(defaultBio);
  const [financialAid, setFinancialAid] = useState<'yes' | 'no' | 'unset'>(
    defaultFinancialAidInterest === true ? 'yes' : defaultFinancialAidInterest === false ? 'no' : 'unset'
  );

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
          linkedin: linkedin.trim() || null,
          bio: bio.trim() || null,
          ...(financialAid === 'yes' || financialAid === 'no'
            ? { financialAidInterest: financialAid === 'yes' }
            : {}),
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
    <form onSubmit={handleSubmit} style={{ maxWidth: '480px' }}>
      <div style={{ display: 'grid', gap: '1rem' }}>
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
        <fieldset className="form-group">
          <legend style={{ fontWeight: 600, marginBottom: '0.35rem' }}>Interested in financial aid or funding support?</legend>
          <label style={{ display: 'inline-flex', gap: '0.35rem', marginRight: '1rem' }}>
            <input
              type="radio"
              name="finaid"
              checked={financialAid === 'yes'}
              onChange={() => setFinancialAid('yes')}
            />
            Yes
          </label>
          <label style={{ display: 'inline-flex', gap: '0.35rem' }}>
            <input
              type="radio"
              name="finaid"
              checked={financialAid === 'no'}
              onChange={() => setFinancialAid('no')}
            />
            No
          </label>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-600)', margin: '0.35rem 0 0' }}>
            Required before you can enroll in a training program from the portal.
          </p>
        </fieldset>
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
