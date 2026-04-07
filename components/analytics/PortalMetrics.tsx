'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackPortalRouteView } from '@/lib/analytics/events';

const PORTAL_PREFIXES = [
  '/dashboard',
  '/employer',
  '/partner',
  '/counselor',
  '/admin',
  '/resources',
  '/help',
  '/account',
];

function isPortalRoute(path: string): boolean {
  return PORTAL_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

/** Lightweight GTM funnel signal for signed-in workspace routes (complements marketing ConversionMetrics). */
export default function PortalMetrics() {
  const pathname = usePathname();
  const route = pathname ?? '';

  useEffect(() => {
    if (!isPortalRoute(route)) return;
    trackPortalRouteView(route);
  }, [route]);

  return null;
}
