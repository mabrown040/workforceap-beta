import Link from 'next/link';
import PortalRouteFallback from '@/components/portal/PortalRouteFallback';

export default function PortalNotFound() {
  return (
    <PortalRouteFallback
      title="Page not found"
      description="That portal URL does not exist or you may not have access. Use the links below to get back on track."
    >
      <p className="portal-route-fallback__hint">
        Looking for a job posting? Try the{' '}
        <Link href="/jobs" className="portal-route-fallback__inline-link">
          public job board
        </Link>
        .
      </p>
    </PortalRouteFallback>
  );
}
