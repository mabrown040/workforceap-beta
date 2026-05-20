import {
  getEmployerHiringPartnerCtaHref,
  isEmployerHiringPartnerCtaExternal,
} from '@/lib/marketing/employerLanding';
import { marketingButtonPresets } from '@/lib/marketing/buttonClasses';

type EmployerHiringPartnerCtaProps = {
  label: string;
  onDark?: boolean;
  className?: string;
};

export default function EmployerHiringPartnerCta({
  label,
  onDark = false,
  className = '',
}: EmployerHiringPartnerCtaProps) {
  const href = getEmployerHiringPartnerCtaHref();
  const external = isEmployerHiringPartnerCtaExternal();
  const classes = [
    onDark ? marketingButtonPresets.heroPrimary() : marketingButtonPresets.formSubmitPrimary(),
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <a
      href={href}
      className={classes}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {label}
      <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }} aria-hidden="true">
        calendar_month
      </span>
    </a>
  );
}
