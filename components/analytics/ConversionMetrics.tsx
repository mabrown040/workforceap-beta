'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useReportWebVitals } from 'next/web-vitals';
import { trackConversionRouteView, trackWebVitalMetric } from '@/lib/analytics/events';

const CONVERSION_ROUTES = new Set([
  '/',
  '/apply',
  '/apply/results',
  '/apply/create-account',
  '/apply/confirmation',
  '/employer/thank-you',
  '/partners/thank-you',
  '/careers/thank-you',
  '/programs',
  '/find-your-path',
  '/program-comparison',
]);

function isConversionRoute(route: string) {
  return CONVERSION_ROUTES.has(route) || route.startsWith('/programs/');
}

export default function ConversionMetrics() {
  const pathname = usePathname();
  const route = pathname ?? '';

  useEffect(() => {
    if (!isConversionRoute(route)) return;
    trackConversionRouteView(route);
  }, [route]);

  useReportWebVitals((metric) => {
    if (!isConversionRoute(route)) return;
    trackWebVitalMetric(metric.name, metric.value, metric.id, metric.rating, route);
  });

  return null;
}
