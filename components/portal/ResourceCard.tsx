'use client';

import type { MemberResource } from '@/lib/content/memberResources';
import { trackResourceOpen } from '@/lib/analytics/events';

type ResourceCardProps = {
  resource: MemberResource;
  onOpen?: (resource: MemberResource) => void;
};

export default function ResourceCard({ resource, onOpen }: ResourceCardProps) {
  const isExternal = resource.url.startsWith('http');
  const href = resource.url;

  const handleClick = () => {
    trackResourceOpen(resource.id, resource.title);
    onOpen?.(resource);
  };

  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className="resource-card"
      onClick={handleClick}
      aria-label={`Open ${resource.title}: ${resource.summary}`}
    >
      <div className="resource-card-header">
        <span className="resource-card-category">{resource.category}</span>
        <span className="resource-card-type">{resource.type}</span>
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
    </a>
  );
}
