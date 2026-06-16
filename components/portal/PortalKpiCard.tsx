import Link from 'next/link';

type Props = {
  label: string;
  value: string | number;
  hint?: string;
  accent?: 'accent' | 'gold' | 'blue' | 'green' | 'neutral';
  href?: string;
};

function valueColor(accent: NonNullable<Props['accent']>) {
  switch (accent) {
    case 'accent':
      return 'var(--color-accent)';
    case 'gold':
      return 'var(--color-marketing-gold-on-light)';
    case 'blue':
      return 'var(--color-blue)';
    case 'green':
      return 'var(--color-green)';
    default:
      return 'var(--color-on-surface)';
  }
}

export default function PortalKpiCard({
  label,
  value,
  hint,
  accent = 'neutral',
  href,
}: Props) {
  const body = (
    <div className="portal-kpi-card">
      <p className="portal-kpi-card__label">{label}</p>
      <p className="portal-kpi-card__value" style={{ color: valueColor(accent) }}>
        {value}
      </p>
      {hint ? <p className="portal-kpi-card__hint">{hint}</p> : null}
    </div>
  );

  if (!href) return body;

  return (
    <Link href={href} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      {body}
    </Link>
  );
}

