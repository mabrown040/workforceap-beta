import PortalBreadcrumb from './PortalBreadcrumb';
import type { PortalBreadcrumbItem } from './PortalBreadcrumb';

export default function PageHeader({
  title,
  subtitle,
  action,
  breadcrumbs,
  titleHeadingLevel = 1,
}: {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  breadcrumbs?: PortalBreadcrumbItem[];
  /** Use 2 when the route already exposes a single visually hidden `h1` (e.g. responsive dual layouts). */
  titleHeadingLevel?: 1 | 2;
}) {
  const TitleTag = titleHeadingLevel === 2 ? 'h2' : 'h1';
  return (
    <div className="portal-page-header">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <PortalBreadcrumb items={breadcrumbs} />
      )}
      <div className="portal-page-header-main">
        <TitleTag className="portal-page-title">{title}</TitleTag>
        {subtitle && <p className="portal-page-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="portal-page-header-action">{action}</div>}
    </div>
  );
}
