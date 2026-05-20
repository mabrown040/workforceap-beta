'use client';

import { useEffect } from 'react';
import { useTour } from './TourContext';
import type { TourStep } from './PortalTour';
import { hasOnboardingTourDismissedCookie } from '@/lib/onboarding/onboardingTourDismiss';

/** Auto-starts the member onboarding tour on mobile dashboard (desktop uses PortalEntryClient). */
export default function MemberTourAutoStart({
  showTour,
  tourStorageUserId,
  tourSteps,
}: {
  showTour: boolean;
  tourStorageUserId: string;
  tourSteps: TourStep[];
}) {
  const { startTour } = useTour();
  const tourAutoStartKey = `wa:tour:auto-started:member:${tourStorageUserId}`;

  useEffect(() => {
    if (!showTour) return;
    const alreadyAutoStarted =
      typeof window !== 'undefined' &&
      (window.localStorage.getItem(tourAutoStartKey) === '1' ||
        window.sessionStorage.getItem(tourAutoStartKey) === '1');
    if (alreadyAutoStarted) return;
    if (hasOnboardingTourDismissedCookie(tourStorageUserId)) return;

    const timer = setTimeout(() => {
      startTour(tourSteps, 'member', { userId: tourStorageUserId });
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(tourAutoStartKey, '1');
        window.sessionStorage.setItem(tourAutoStartKey, '1');
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [showTour, tourSteps, startTour, tourAutoStartKey, tourStorageUserId]);

  return null;
}
