import Link from 'next/link';
import { Breadcrumbs, BreadcrumbItem } from '@astryxdesign/core/Breadcrumbs';

export type PortalBreadcrumbItem = {
  href?: string;
  label: string;
};

type PortalBreadcrumbProps = {
  items: PortalBreadcrumbItem[];
  /** Last segment is plain text (not a link) */
  currentAsText?: boolean;
  className?: string;
  variant?: 'default' | 'on-dark';
};

/**
 * Consistent portal wayfinding for pages that use marketing-style heroes.
 *
 * Default variant renders the Astryx `Breadcrumbs` (supporting size) — its
 * text/link colors resolve through the shared token names, so it follows the
 * house palette and dark mode automatically. The `on-dark` variant (learning
 * hub heroes over imagery) keeps the legacy light-locked markup, since it must
 * stay readable on a fixed dark hero regardless of theme.
 */
export default function PortalBreadcrumb({
  items,
  currentAsText = true,
  className = '',
  variant = 'default',
}: PortalBreadcrumbProps) {
  if (items.length === 0) return null;

  if (variant === 'on-dark') {
    return (
      <nav className={`learning-hub-breadcrumb learning-hub-breadcrumb--on-dark ${className}`.trim()} aria-label="Breadcrumb">
        <ol
          className="portal-breadcrumb__list"
          style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.35rem', listStyle: 'none', margin: 0, padding: 0 }}
        >
          {items.map((item, i) => {
            const isLast = i === items.length - 1;
            const isLink = Boolean(item.href) && !(isLast && currentAsText);
            return (
              <li key={`${item.label}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                {i > 0 ? (
                  <span className="learning-hub-breadcrumb-sep" aria-hidden>
                    /
                  </span>
                ) : null}
                {isLink ? (
                  <Link href={item.href!}>{item.label}</Link>
                ) : (
                  <span className="learning-hub-breadcrumb-current">{item.label}</span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }

  return (
    <span className={`portal-breadcrumb ${className}`.trim()}>
      <Breadcrumbs variant="supporting">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const isLink = Boolean(item.href) && !(isLast && currentAsText);
          return (
            <BreadcrumbItem
              key={`${item.label}-${i}`}
              href={isLink ? item.href : undefined}
              as={isLink ? (Link as never) : undefined}
              isCurrent={isLast && currentAsText}
            >
              {item.label}
            </BreadcrumbItem>
          );
        })}
      </Breadcrumbs>
    </span>
  );
}
