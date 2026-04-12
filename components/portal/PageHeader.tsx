import PortalBreadcrumb from './PortalBreadcrumb';
import type { PortalBreadcrumbItem } from './PortalBreadcrumb';

export default function PageHeader({
  title,
  subtitle,
  action,
  breadcrumbs,
}: {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  breadcrumbs?: PortalBreadcrumbItem[];
}) {
  return (
    <div className="portal-page-header">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <PortalBreadcrumb items={breadcrumbs} />
      )}
      <div className="portal-page-header-main">
        <h1 className="portal-page-title">{title}</h1>
        {subtitle && <p className="portal-page-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="portal-page-header-action">{action}</div>}
    </div>
  );
}
