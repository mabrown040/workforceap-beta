'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { trackApplyFunnel } from '@/lib/analytics/events';

const PROGRAM_STORAGE_KEY = 'apply_program_slug';

export default function ApplyCreateAccountForm() {
  const router = useRouter();
  const [programSlug, setProgramSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const slug = sessionStorage.getItem(PROGRAM_STORAGE_KEY);
    if (!slug) {
      window.location.href = '/apply/results';
      return;
    }
    setProgramSlug(slug);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!programSlug) {
      setError('Please go back and select a program.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/apply/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          smsOptIn,
          password,
          programSlug,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Signup failed. Please try again.');
        setLoading(false);
        return;
      }

      sessionStorage.removeItem(PROGRAM_STORAGE_KEY);
      sessionStorage.removeItem('apply_eligibility');
      trackApplyFunnel(3, 'account_created', { program_slug: programSlug });
      window.location.href = data.redirectTo ?? '/dashboard';
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  if (programSlug === null) {
    return <p>Loading...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="apply-form">
      <div className="form-group">
        <label htmlFor="firstName">First Name *</label>
        <input id="firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
      </div>
      <div className="form-group">
        <label htmlFor="lastName">Last Name *</label>
        <input id="lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
      </div>
      <div className="form-group">
        <label htmlFor="email">Email *</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="form-group">
        <label htmlFor="phone">Phone *</label>
        <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
      </div>
      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={smsOptIn} onChange={(e) => setSmsOptIn(e.target.checked)} />
          Text me updates about my application (optional)
        </label>
      </div>
      <div className="form-group">
        <label htmlFor="password">Password *</label>
        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
      </div>
      <div className="form-group">
        <label htmlFor="confirmPassword">Confirm Password *</label>
        <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} />
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="btn btn-primary btn-submit-full" disabled={loading}>
        {loading ? 'Creating account...' : 'Create My Account'}
      </button>
    </form>
  );
}
