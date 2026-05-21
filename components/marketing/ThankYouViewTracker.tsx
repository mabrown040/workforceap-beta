'use client';

import { useEffect } from 'react';
import { trackThankYouViewed, type ThankYouFunnel } from '@/lib/analytics/events';

export default function ThankYouViewTracker({ funnel }: { funnel: ThankYouFunnel }) {
  useEffect(() => {
    trackThankYouViewed(funnel);
  }, [funnel]);

  return null;
}
