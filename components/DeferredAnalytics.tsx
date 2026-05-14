'use client';

import dynamic from 'next/dynamic';

const SafeVercelMetrics = dynamic(() => import('@/components/SafeVercelMetrics'), { ssr: false });
const ConversionMetrics = dynamic(() => import('@/components/analytics/ConversionMetrics'), { ssr: false });
const PortalMetrics = dynamic(() => import('@/components/analytics/PortalMetrics'), { ssr: false });

export default function DeferredAnalytics() {
  return (
    <>
      <ConversionMetrics />
      <PortalMetrics />
      <SafeVercelMetrics />
    </>
  );
}
