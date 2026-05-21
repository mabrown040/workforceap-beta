import {
  getEmployerHiringPartnerCtaHref,
  isEmployerHiringPartnerCtaExternal,
} from '@/lib/marketing/employerLanding';
import { marketingButtonPresets } from '@/lib/marketing/buttonClasses';

type EmployerHiringPartnerCtaProps = {
  label: string;
  onDark?: boolean;
  /** Muted repeat CTA on the accent final band — text link, not a second primary button */
  variant?: 'primary' | 'text';
  className?: string;
  dataCta?: string;
};

export default function EmployerHiringPartnerCta({
  label,
  onDark = false,
  variant = 'primary',
  className = '',
  dataCta,
}: EmployerHiringPartnerCtaProps) {
  const href = getEmployerHiringPartnerCtaHref();
  const external = isEmployerHiringPartnerCtaExternal();

  const classes =
    variant === 'text'
      ? ['employers-hiring-partner-cta--text', className].filter(Boolean).join(' ')
      : [
          onDark ? marketingButtonPresets.heroPrimary() : marketingButtonPresets.formSubmitPrimary(),
          className,
        ]
          .filter(Boolean)
          .join(' ');

  return (
    <a
      href={href}
      className={classes}
      data-cta={dataCta}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {label}
      {variant === 'primary' ? (
        <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }} aria-hidden="true">
          calendar_month
        </span>
      ) : null}
    </a>
  );
}
