'use client';

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
  href = '#',
}: AIToolCardProps) {
  const isAvailable = status === 'available';

  const handleClick = () => {
    if (isAvailable) {
      trackToolLaunch(id, title);
    }
  };

  return (
    <div className="ai-tool-card">
      <h3 className="ai-tool-title">{title}</h3>
      <p className="ai-tool-desc">{description}</p>
      <p className="ai-tool-time">
        <span className="ai-tool-time-label">Time to complete:</span> {timeToComplete}
      </p>
      <a
        href={isAvailable ? href : '#'}
        className={`ai-tool-cta btn ${isAvailable ? 'btn-primary' : 'btn-outline'}`}
        aria-disabled={!isAvailable}
        onClick={(e) => {
          if (!isAvailable) e.preventDefault();
          else handleClick();
        }}
      >
        {isAvailable ? 'Launch tool' : 'Coming soon'}
      </a>
    </div>
  );
}
