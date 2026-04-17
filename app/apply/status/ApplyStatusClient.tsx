'use client';

import { useState } from 'react';

export default function ApplyStatusClient() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ found: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const r = await fetch('/api/apply/status-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await r.json()) as { error?: string; found?: boolean; message?: string };
      if (!r.ok) {
        setError(data.error ?? 'We couldn\'t find your application status. Try again, or call (512) 777-1808 for help.');
        return;
      }
      if (typeof data.found === 'boolean' && data.message) {
        setResult({ found: data.found, message: data.message });
      } else {
        setError('We couldn\'t find your application status. Try again, or call (512) 777-1808 for help.');
      }
    } catch {
      setError('We couldn\'t connect. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="apply-status-card">
      <p className="apply-status-lead">
        Enter the email you used on your application. We will show your current status — no password required.
      </p>
      <form onSubmit={handleSubmit} className="apply-status-form">
        <div className="form-group">
          <label htmlFor="apply-status-email">Email</label>
          <input
            id="apply-status-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-control"
            placeholder="you@example.com"
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Checking…' : 'Check status'}
        </button>
      </form>
      {error ? <p className="apply-status-error" role="alert">{error}</p> : null}
      {result ? (
        <div
          className={`apply-status-result${result.found ? ' apply-status-result--found' : ''}`}
          role="status"
        >
          {result.message}
        </div>
      ) : null}
      <p className="apply-status-footnote">
        Logged in already? Open your{' '}
        <a href="/dashboard">member dashboard</a> for full details.
      </p>
    </div>
  );
}
