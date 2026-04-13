import Link from 'next/link';

export default function AdminNotFound() {
  return (
    <div className="portal-route-fallback">
      <h1 className="portal-route-fallback__title">Page not found</h1>
      <p className="portal-route-fallback__desc">
        That admin page doesn&apos;t exist. It may have been moved or you may not have access.
      </p>
      <nav className="portal-route-fallback__nav" aria-label="Helpful links">
        <Link href="/admin" className="btn btn-primary btn-sm">
          Admin overview
        </Link>
        <Link href="/admin/members" className="btn btn-outline btn-sm">
          Members
        </Link>
        <Link href="/admin/pipeline" className="btn btn-outline btn-sm">
          Pipeline
        </Link>
        <a href="mailto:info@workforceap.org" className="btn btn-ghost btn-sm">
          Email support
        </a>
      </nav>
    </div>
  );
}
