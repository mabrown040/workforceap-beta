import PortalBreadcrumb from './PortalBreadcrumb';
import type { PortalBreadcrumbItem } from './PortalBreadcrumb';

export default function PageHeader({
  title,
  subtitle,
  action,
  breadcrumbs,
  titleClassName,
}: {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  breadcrumbs?: PortalBreadcrumbItem[];
  titleClassName?: string;
}) {
  return (
    <div className="portal-page-header">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <PortalBreadcrumb items={breadcrumbs} />
      )}
      <div className="portal-page-header-main">
        <h1 className={titleClassName ? `portal-page-title ${titleClassName}` : 'portal-page-title'}>{title}</h1>
        {subtitle && <p className="portal-page-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="portal-page-header-action">{action}</div>}
    </div>
  );
}
