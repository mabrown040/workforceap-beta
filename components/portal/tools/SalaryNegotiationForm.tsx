'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trackToolLaunch } from '@/lib/analytics/events';

export default function SalaryNegotiationForm() {
  const [currentOffer, setCurrentOffer] = useState('');
  const [targetSalary, setTargetSalary] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'phone' | 'email'>('phone');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOutput('');
    setLoading(true);
    trackToolLaunch('salary-negotiation', 'Salary Negotiation Script');

    const offerNum = parseFloat(currentOffer.replace(/[^0-9.]/g, ''));
    const targetNum = parseFloat(targetSalary.replace(/[^0-9.]/g, ''));

    try {
      const res = await fetch('/api/ai/salary-negotiation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentOffer: offerNum,
          targetSalary: targetNum,
          jobTitle,
          companyName,
          deliveryMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        return;
      }
      setOutput(data.output ?? '');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (output) navigator.clipboard.writeText(output);
  };

  return (
    <form onSubmit={handleSubmit} className="resume-rewriter-form">
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="offer">Current offer amount ($)</label>
          <input
            id="offer"
            type="text"
            inputMode="numeric"
            value={currentOffer}
            onChange={(e) => setCurrentOffer(e.target.value)}
            placeholder="e.g. 75000"
            required
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label htmlFor="target">Target salary ($)</label>
          <input
            id="target"
            type="text"
            inputMode="numeric"
            value={targetSalary}
            onChange={(e) => setTargetSalary(e.target.value)}
            placeholder="e.g. 85000"
            required
            disabled={loading}
          />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="job-title">Job title</label>
        <input
          id="job-title"
          type="text"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder="e.g. Senior Software Engineer"
          required
          disabled={loading}
        />
      </div>
      <div className="form-group">
        <label htmlFor="company">Company name</label>
        <input
          id="company"
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="e.g. Acme Corp"
          required
          disabled={loading}
        />
      </div>
      <div className="form-group">
        <label htmlFor="delivery">Delivery method</label>
        <select
          id="delivery"
          value={deliveryMethod}
          onChange={(e) => setDeliveryMethod(e.target.value as 'phone' | 'email')}
          disabled={loading}
        >
          <option value="phone">Phone call</option>
          <option value="email">Email</option>
        </select>
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Generating script...' : 'Generate script'}
      </button>
      {output && (
        <div className="resume-rewriter-output">
          <div className="resume-rewriter-output-header">
            <h3>{deliveryMethod === 'phone' ? 'Phone script' : 'Email script'}</h3>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleCopy}>
              Copy to clipboard
            </button>
          </div>
          <pre className="resume-rewriter-output-content">{output}</pre>
          <p className="ai-result-saved">
            Saved to your history. <Link href="/dashboard/ai-tools/history">View all results</Link>
          </p>
        </div>
      )}
    </form>
  );
}
