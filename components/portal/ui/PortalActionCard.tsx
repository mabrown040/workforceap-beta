import type { ReactNode, CSSProperties, MouseEventHandler } from 'react';
import Link from 'next/link';

export type PortalActionCardProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  ctaLabel?: string;
  href: string;
  icon?: string;
  badge?: { label: string; variant?: 'accent' | 'gold' | 'glass' };
  heroGradient?: 'tech' | 'health' | 'career' | 'tools' | 'neutral' | CSSProperties['background'];
  heroContent?: ReactNode;
  className?: string;
  external?: boolean;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

export default function PortalActionCard({
  eyebrow,
  title,
  description,
  ctaLabel,
  href,
  icon,
  badge,
  heroGradient = 'neutral',
  heroContent,
  className = '',
  external = false,
  onClick,
}: PortalActionCardProps) {
  const knownGradients = ['tech', 'health', 'career', 'tools', 'neutral'];
  const heroGradientClass = knownGradients.includes(heroGradient as string)
    ? `portal-action-card-gradient--${heroGradient as string}`
    : '';
  const heroStyle =
    !knownGradients.includes(heroGradient as string)
      ? { background: heroGradient as string }
      : undefined;

  return (
    <Link
      href={href}
      className={`portal-action-card ${className}`.trim()}
      onClick={onClick}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      <div className={`portal-action-card__hero ${heroGradientClass}`} style={heroStyle}>
        {icon && (
          <div className="portal-action-card__icon-wrap">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '1.125rem', fontVariationSettings: "'FILL' 1" }}
              aria-hidden
            >
              {icon}
            </span>
          </div>
        )}
        {badge && (
          <span className={`portal-action-card__badge portal-action-card__badge--${badge.variant ?? 'accent'}`}>
            {badge.label}
          </span>
        )}
        {heroContent}
      </div>

      <div className="portal-action-card__body">
        {eyebrow && <p className="portal-action-card__eyebrow">{eyebrow}</p>}
        <h4 className="portal-action-card__title">{title}</h4>
        {description && <p className="portal-action-card__desc">{description}</p>}
        {ctaLabel && (
          <span className="portal-action-card__cta">
            {ctaLabel}
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '0.875rem' }}
              aria-hidden
            >
              arrow_forward
            </span>
          </span>
        )}
      </div>
    </Link>
  );
}
