import Link from 'next/link';

type PortalRouteFallbackProps = {
  title: string;
  description: string;
  children?: React.ReactNode;
};

/**
 * Shared chrome for portal / admin error and not-found pages (no marketing nav).
 */
export default function PortalRouteFallback({ title, description, children }: PortalRouteFallbackProps) {
  return (
    <div className="portal-route-fallback">
      <h1 className="portal-route-fallback__title">{title}</h1>
      <p className="portal-route-fallback__desc">{description}</p>
      <nav className="portal-route-fallback__nav" aria-label="Helpful links">
        <Link href="/dashboard" className="btn btn-outline btn-sm">
          Member dashboard
        </Link>
        <Link href="/employer" className="btn btn-outline btn-sm">
          Employer portal
        </Link>
        <Link href="/help" className="btn btn-outline btn-sm">
          Help
        </Link>
        <a href="mailto:info@workforceap.org" className="btn btn-ghost btn-sm">
          Email support
        </a>
        <Link href="/" className="btn btn-ghost btn-sm">
          WorkforceAP home
        </Link>
      </nav>
      {children}
    </div>
  );
}
