import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

export function WorkforceApModuleNav({
  programHref,
  programLabel = 'Back to my program',
  positionLabel,
  previous,
  next,
}: {
  programHref: string;
  programLabel?: string;
  positionLabel: string;
  previous?: { href: string; name: string } | null;
  next?: { href: string; name: string } | null;
}) {
  return (
    <nav className="wa-kit-module-nav" aria-label="Module sequence">
      <Link href={programHref} className="wa-kit-module-nav__program wa-kit-focus">
        <ArrowLeft size={16} aria-hidden="true" />
        {programLabel}
      </Link>
      <p className="wa-kit-module-nav__position">{positionLabel}</p>
      <div className="wa-kit-module-nav__steps">
        {previous ? (
          <Link href={previous.href} className="wa-kit-module-nav__step wa-kit-focus">
            <ChevronLeft size={16} aria-hidden="true" />
            <span>
              <small>Previous</small>
              <strong>{previous.name}</strong>
            </span>
          </Link>
        ) : (
          <span className="wa-kit-module-nav__step is-placeholder" aria-hidden="true" />
        )}
        {next ? (
          <Link href={next.href} className="wa-kit-module-nav__step wa-kit-module-nav__step--next wa-kit-focus">
            <span>
              <small>Next</small>
              <strong>{next.name}</strong>
            </span>
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        ) : (
          <span className="wa-kit-module-nav__step is-placeholder" aria-hidden="true" />
        )}
      </div>
    </nav>
  );
}
