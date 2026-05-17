'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const SafeVercelMetrics = dynamic(() => import('@/components/SafeVercelMetrics'), { ssr: false });
const ConversionMetrics = dynamic(() => import('@/components/analytics/ConversionMetrics'), { ssr: false });
const PortalMetrics = dynamic(() => import('@/components/analytics/PortalMetrics'), { ssr: false });

function IdleSafeVercelMetrics() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const enable = () => {
      if (!cancelled) setReady(true);
    };
    let idleId: number | null = null;
    let timeoutId: number | null = null;
    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(enable, { timeout: 3000 });
    } else {
      timeoutId = window.setTimeout(enable, 1);
    }
    return () => {
      cancelled = true;
      if (idleId !== null && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
  }, []);

  if (!ready) return null;
  return <SafeVercelMetrics />;
}

export default function DeferredAnalytics() {
  return (
    <>
      <ConversionMetrics />
      <PortalMetrics />
      <IdleSafeVercelMetrics />
    </>
  );
}
