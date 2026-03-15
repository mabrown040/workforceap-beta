'use client';

import Link from 'next/link';
import { trackLicenseRequest } from '@/lib/analytics/events';

type BenefitStatus = 'not_requested' | 'pending' | 'active';

type BenefitAccessCardProps = {
  name: string;
  status: BenefitStatus;
  description?: string;
};

const STATUS_LABELS: Record<BenefitStatus, string> = {
  not_requested: 'Not requested',
  pending: 'Pending',
  active: 'Active',
};

export default function BenefitAccessCard({ name, status, description }: BenefitAccessCardProps) {
  const isActive = status === 'active';
  const isPending = status === 'pending';

  const ctaLabel = isActive ? 'Open Platform' : isPending ? 'Check Status' : 'Request Access';
  const ctaHref = isActive
    ? name.toLowerCase().includes('linkedin')
      ? 'https://linkedin.com'
      : 'https://coursera.org'
    : '/help?request=' + encodeURIComponent(name);

  const handleRequestClick = () => {
    if (!isActive) trackLicenseRequest(name);
  };

  return (
    <div className="benefit-card">
      <div className="benefit-card-header">
        <h3 className="benefit-card-title">{name}</h3>
        <span className={`benefit-card-status status-${status}`}>{STATUS_LABELS[status]}</span>
      </div>
      {description && <p className="benefit-card-desc">{description}</p>}
      <Link
        href={ctaHref}
        className={`btn ${isActive ? 'btn-primary' : 'btn-outline'} benefit-card-cta`}
        target={isActive ? '_blank' : undefined}
        rel={isActive ? 'noopener noreferrer' : undefined}
        onClick={handleRequestClick}
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
