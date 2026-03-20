'use client';

import Link from 'next/link';
import { trackToolLaunch } from '@/lib/analytics/events';

type AIToolCardProps = {
  id: string;
  title: string;
  description: string;
  timeToComplete: string;
  status: 'coming_soon' | 'available';
  href?: string;
};

export default function AIToolCard({
  id,
  title,
  description,
  timeToComplete,
  status,
  href = '/dashboard/ai-tools',
}: AIToolCardProps) {
  const isAvailable = status === 'available';

  const handleClick = () => {
    if (isAvailable) {
      trackToolLaunch(id, title);
    }
  };

  const cta = isAvailable ? (
    <Link
      href={href}
      className="ai-tool-cta btn btn-primary"
      onClick={handleClick}
    >
      Launch tool
    </Link>
  ) : (
    <span className="ai-tool-cta btn btn-outline" aria-disabled>
      Coming soon
    </span>
  );

  return (
    <div className="ai-tool-card">
      <h3 className="ai-tool-title">{title}</h3>
      <p className="ai-tool-desc">{description}</p>
      <p className="ai-tool-time">
        <span className="ai-tool-time-label">Time to complete:</span> {timeToComplete}
      </p>
      {cta}
    </div>
  );
}
