import Link from 'next/link';

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
 */
export default function PortalBreadcrumb({
  items,
  currentAsText = true,
  className = '',
  variant = 'default',
}: PortalBreadcrumbProps) {
  if (items.length === 0) return null;
  const navClass =
    variant === 'on-dark' ? 'learning-hub-breadcrumb learning-hub-breadcrumb--on-dark' : 'portal-breadcrumb';
  return (
    <nav className={`${navClass} ${className}`.trim()} aria-label="Breadcrumb">
      <ol
        className="portal-breadcrumb__list"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.35rem',
          listStyle: 'none',
          margin: 0,
          padding: 0,
        }}
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
                <span className={variant === 'on-dark' ? 'learning-hub-breadcrumb-current' : undefined}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
