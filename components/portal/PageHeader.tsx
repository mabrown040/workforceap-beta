export default function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="portal-page-header">
      <div className="portal-page-header-main">
        <h1 className="portal-page-title">{title}</h1>
        {subtitle && <p className="portal-page-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="portal-page-header-action">{action}</div>}
    </div>
  );
}
