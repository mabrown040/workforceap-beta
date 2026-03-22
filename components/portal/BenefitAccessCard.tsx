'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trackLicenseRequest } from '@/lib/analytics/events';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const ASSESSMENT_REDIRECT_KEY = 'assessment_intended_destination';

type BenefitStatus = 'not_requested' | 'pending' | 'active';

type BenefitAccessCardProps = {
  benefitId: string;
  name: string;
  status: BenefitStatus;
  description?: string;
  /** For Coursera: must complete assessment before access. If false, redirects to /dashboard/assessment */
  assessmentCompleted?: boolean;
};

const STATUS_LABELS: Record<BenefitStatus, string> = {
  not_requested: 'Not requested',
  pending: 'Pending',
  active: 'Active',
};

export default function BenefitAccessCard({ benefitId, name, status: initialStatus, description, assessmentCompleted = true }: BenefitAccessCardProps) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const isActive = status === 'active';
  const isPending = status === 'pending';
  const isCoursera = benefitId === 'coursera';
  const needsAssessment = isCoursera && assessmentCompleted === false;

  const redirectToAssessment = (intendedDestination: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(ASSESSMENT_REDIRECT_KEY, intendedDestination);
      router.push('/dashboard/assessment');
    }
  };

  const handleRequest = async () => {
    if (isActive || isPending) return;
    if (needsAssessment) {
      redirectToAssessment('/dashboard');
      return;
    }
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

  const handleOpenPlatform = () => {
    if (needsAssessment) {
      redirectToAssessment('https://coursera.org');
      return;
    }
    window.open(benefitId === 'linkedin_premium' ? 'https://linkedin.com' : 'https://coursera.org', '_blank', 'noopener,noreferrer');
  };

  if (isActive) {
    return (
      <Card className="benefit-card" variant="bordered">
        <div className="benefit-card-header">
          <h3 className="benefit-card-title">{name}</h3>
          <Badge className="benefit-card-status" tone="success" size="sm">{STATUS_LABELS.active}</Badge>
        </div>
        {description && <p className="benefit-card-desc">{description}</p>}
        <Button type="button" className="benefit-card-cta" onClick={handleOpenPlatform}>
          Open Platform
        </Button>
      </Card>
    );
  }

  return (
    <Card className="benefit-card" variant="bordered">
      <div className="benefit-card-header">
        <h3 className="benefit-card-title">{name}</h3>
        <Badge
          className="benefit-card-status"
          tone={status === 'pending' ? 'warning' : 'neutral'}
          size="sm"
        >
          {STATUS_LABELS[status]}
        </Badge>
      </div>
      {description && <p className="benefit-card-desc">{description}</p>}
      {error ? (
        <Alert tone="error" role="alert">
          {error}
        </Alert>
      ) : null}
      <Button
        type="button"
        variant="outline"
        className="benefit-card-cta"
        onClick={handleRequest}
        disabled={loading || isPending}
        loading={loading}
      >
        {isPending ? 'Pending' : 'Request Access'}
      </Button>
    </Card>
  );
}
