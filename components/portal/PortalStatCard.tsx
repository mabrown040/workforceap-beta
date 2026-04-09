/**
 * Shared stat card used on portal dashboards (training, counselor, employer, partner, admin).
 * Replaces the repeated inline-styled icon+value+label card pattern.
 */
export default function PortalStatCard({
  icon,
  label,
  value,
  iconColor = 'var(--color-accent)',
  iconBg = 'rgba(173,44,77,0.12)',
  children,
}: {
  icon: string;
  label: string;
  value: string | number;
  iconColor?: string;
  iconBg?: string;
  /** Optional extra content below the value (e.g. progress bar) */
  children?: React.ReactNode;
}) {
  return (
    <div className="stitch-card portal-stat-card">
      <div className="portal-stat-card__icon" style={{ background: iconBg }}>
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '1.5rem', color: iconColor, fontVariationSettings: "'FILL' 1" }}
         aria-hidden="true">
          {icon}
        </span>
      </div>
      <div className="portal-stat-card__body">
        <p className="portal-stat-value">{value}</p>
        <p className="portal-stat-label">{label}</p>
        {children}
      </div>
    </div>
  );
}
