'use client';

import Link from 'next/link';
import type { CareerBriefMeta } from '@/lib/content/careerBriefs';
import { trackBriefOpen } from '@/lib/analytics/events';

type CareerBriefListProps = {
  briefs: CareerBriefMeta[];
};

export default function CareerBriefList({ briefs }: CareerBriefListProps) {
  if (briefs.length === 0) {
    return (
      <div className="career-brief-empty">
        <p>No career briefs yet. Check back soon for weekly guidance and opportunity updates.</p>
      </div>
    );
  }

  return (
    <ul className="career-brief-list">
      {briefs.map((brief) => (
        <li key={brief.id}>
          <Link
            href={`/dashboard/career-brief/${brief.slug}`}
            className="career-brief-item"
            onClick={() => trackBriefOpen(brief.id, brief.title)}
          >
            <span className="career-brief-date">{brief.date}</span>
            <span className="career-brief-title">{brief.title}</span>
            <span className="career-brief-arrow" aria-hidden>→</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
