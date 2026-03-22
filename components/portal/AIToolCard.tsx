'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { trackToolLaunch } from '@/lib/analytics/events';

type AIToolCardProps = {
  id: string;
  title: string;
  description: string;
  timeToComplete: string;
  status: 'coming_soon' | 'available';
  href?: string;
  expectation?: string;
  inputHelp?: string;
  outputUse?: string;
};

export default function AIToolCard({ id, title, description, timeToComplete, status, href = '/dashboard/ai-tools', expectation, inputHelp, outputUse }: AIToolCardProps) {
  const isAvailable = status === 'available';

  return (
    <div className="ai-tool-card">
      <div className="ai-tool-card-top">
        <p className="ai-tool-time"><span className="ai-tool-time-label">Time:</span> {timeToComplete}</p>
        <h3 className="ai-tool-title">{title}</h3>
        <p className="ai-tool-desc">{description}</p>
      </div>

      <dl className="ai-tool-meta-list">
        {expectation && (
          <div>
            <dt>Does</dt>
            <dd>{expectation}</dd>
          </div>
        )}
        {inputHelp && (
          <div>
            <dt>Needs</dt>
            <dd>{inputHelp}</dd>
          </div>
        )}
        {outputUse && (
          <div>
            <dt>Use it for</dt>
            <dd>{outputUse}</dd>
          </div>
        )}
      </dl>

      {isAvailable ? (
        <Link href={href} className="ai-tool-cta btn btn-primary" onClick={() => trackToolLaunch(id, title)}>
          Open tool <ArrowRight size={16} aria-hidden />
        </Link>
      ) : (
        <span className="ai-tool-cta btn btn-outline" aria-disabled>
          Coming soon
        </span>
      )}
    </div>
  );
}
