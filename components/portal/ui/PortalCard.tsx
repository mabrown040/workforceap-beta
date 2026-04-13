import type { ReactNode } from 'react';

export type PortalCardProps = {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export default function PortalCard({
  title,
  subtitle,
  action,
  children,
  footer,
  className = '',
}: PortalCardProps) {
  return (
    <section className={`portal-card ${className}`.trim()}>
      {(title || subtitle || action) ? (
        <header className="portal-card__header">
          <div className="portal-card__headings">
            {title ? <h2 className="portal-card__title">{title}</h2> : null}
            {subtitle ? <p className="portal-card__subtitle">{subtitle}</p> : null}
          </div>
          {action ? <div className="portal-card__action">{action}</div> : null}
        </header>
      ) : null}

      <div className="portal-card__body">{children}</div>

      {footer ? <footer className="portal-card__footer">{footer}</footer> : null}
    </section>
  );
}
