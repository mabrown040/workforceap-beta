'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useReportWebVitals } from 'next/web-vitals';
import { trackConversionRouteView, trackWebVitalMetric } from '@/lib/analytics/events';

const CONVERSION_ROUTES = new Set([
  '/',
  '/apply',
  '/programs',
  '/find-your-path',
  '/program-comparison',
]);

export default function ConversionMetrics() {
  const pathname = usePathname();
  const route = pathname ?? '';

  useEffect(() => {
    if (!CONVERSION_ROUTES.has(route)) return;
    trackConversionRouteView(route);
  }, [route]);

  useReportWebVitals((metric) => {
    if (!CONVERSION_ROUTES.has(route)) return;
    trackWebVitalMetric(metric.name, metric.value, metric.id, metric.rating, route);
  });

  return null;
}
