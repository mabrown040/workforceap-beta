'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trackLicenseRequest } from '@/lib/analytics/events';

type BenefitStatus = 'not_requested' | 'pending' | 'active';

type BenefitAccessCardProps = {
  benefitId: string;
  name: string;
  status: BenefitStatus;
  description?: string;
};

const STATUS_LABELS: Record<BenefitStatus, string> = {
  not_requested: 'Not requested',
  pending: 'Pending',
  active: 'Active',
};

export default function BenefitAccessCard({ benefitId, name, status: initialStatus, description }: BenefitAccessCardProps) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isActive = status === 'active';
  const isPending = status === 'pending';

  const handleRequest = async () => {
    if (isActive || isPending) return;
    setLoading(true);
    setError('');
    trackLicenseRequest(name);

    try {
      const res = await fetch('/api/member/benefits/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ benefit: benefitId }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus(data.status === 'active' ? 'active' : 'pending');
      } else {
        setError(data.error ?? 'Request failed');
      }
    } catch {
      setError('Request failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isActive) {
    return (
      <div className="benefit-card">
        <div className="benefit-card-header">
          <h3 className="benefit-card-title">{name}</h3>
          <span className="benefit-card-status status-active">{STATUS_LABELS.active}</span>
        </div>
        {description && <p className="benefit-card-desc">{description}</p>}
        <Link
          href={benefitId === 'linkedin_premium' ? 'https://linkedin.com' : 'https://coursera.org'}
          className="btn btn-primary benefit-card-cta"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open Platform
        </Link>
      </div>
    );
  }

  return (
    <div className="benefit-card">
      <div className="benefit-card-header">
        <h3 className="benefit-card-title">{name}</h3>
        <span className={`benefit-card-status status-${status}`}>{STATUS_LABELS[status]}</span>
      </div>
      {description && <p className="benefit-card-desc">{description}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button
        type="button"
        className="btn btn-outline benefit-card-cta"
        onClick={handleRequest}
        disabled={loading || isPending}
      >
        {loading ? 'Requesting...' : isPending ? 'Pending' : 'Request Access'}
      </button>
    </div>
  );
}
