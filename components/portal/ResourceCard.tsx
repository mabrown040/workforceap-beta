'use client';

import Link from 'next/link';
import type { MemberResource } from '@/lib/content/memberResources';
import { trackResourceOpen } from '@/lib/analytics/events';

type ResourceCardProps = {
  resource: MemberResource;
  progress?: { completedAt: string | Date | null; savedAt: string | Date | null } | null;
};

export default function ResourceCard({ resource, progress }: ResourceCardProps) {
  const isExternal = resource.url.startsWith('http');
  const href = resource.url;
  const isCompleted = !!progress?.completedAt;
  const isSaved = !!progress?.savedAt;

  const handleClick = () => {
    trackResourceOpen(resource.id, resource.title);
  };

  const content = (
    <>
      <div className="resource-card-header">
        <span className="resource-card-category">{resource.category}</span>
        <span className="resource-card-type">{resource.type}</span>
        {(isCompleted || isSaved) && (
          <span className="resource-card-badges">
            {isCompleted && <span className="resource-badge completed">Completed</span>}
            {isSaved && <span className="resource-badge saved">Saved</span>}
          </span>
        )}
      </div>
      <h3 className="resource-card-title">{resource.title}</h3>
      <p className="resource-card-summary">{resource.summary}</p>
      {resource.tags.length > 0 ? (
        <div className="resource-card-tags">
          {resource.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="resource-card-tag">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      <span className="resource-card-arrow" aria-hidden>
        →
      </span>
    </>
  );

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="resource-card"
        onClick={handleClick}
        aria-label={`Open ${resource.title}: ${resource.summary}`}
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className="resource-card"
      onClick={handleClick}
      aria-label={`Open ${resource.title}: ${resource.summary}`}
    >
      {content}
    </Link>
  );
}
