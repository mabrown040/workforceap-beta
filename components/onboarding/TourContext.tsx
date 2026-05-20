'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { TourStep } from './PortalTour';
import { postMemberEvent } from '@/lib/events/client';
import { trackFunnelEvent } from '@/lib/analytics/events';
import { setOnboardingTourDismissedCookie } from '@/lib/onboarding/onboardingTourDismiss';

type PortalType = 'member' | 'employer' | 'partner';

interface TourContextValue {
  isOpen: boolean;
  currentStep: number;
  steps: TourStep[];
  portal: PortalType;
  tourStorageUserId: string | null;
  startTour: (steps: TourStep[], portal: PortalType, options?: { userId?: string }) => void;
  endTour: () => void;
  dismissTour: () => void;
  completeTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
}

const TourContext = createContext<TourContextValue | null>(null);

/** No-op tour API when `TourProvider` is missing — avoids crashing the whole portal tree. */
function noopTourValue(): TourContextValue {
  return {
    isOpen: false,
    currentStep: 0,
    steps: [],
    portal: 'member',
    tourStorageUserId: null,
    startTour: () => {},
    endTour: () => {},
    dismissTour: () => {},
    completeTour: async () => {},
    nextStep: () => {},
    prevStep: () => {},
    goToStep: () => {},
  };
}

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  return ctx ?? noopTourValue();
}

interface TourProviderProps {
  children: ReactNode;
}

export function TourProvider({ children }: TourProviderProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [portal, setPortal] = useState<PortalType>('member');
  const [tourStorageUserId, setTourStorageUserId] = useState<string | null>(null);
  const tourStartedRef = useRef(false);

  const endTour = useCallback(() => {
    setIsOpen(false);
    setCurrentStep(0);
    tourStartedRef.current = false;
  }, []);

  const startTour = useCallback(
    (newSteps: TourStep[], newPortal: PortalType, options?: { userId?: string }) => {
      setSteps(newSteps);
      setPortal(newPortal);
      setTourStorageUserId(options?.userId ?? null);
      setCurrentStep(0);
      setIsOpen(true);
      tourStartedRef.current = true;
    },
    []
  );

  const dismissTour = useCallback(async () => {
    const stepIndex = currentStep;
    const userId = tourStorageUserId;
    if (portal === 'member' && tourStartedRef.current) {
      trackFunnelEvent('member_onboarding', 'tour_dismissed', {
        portal,
        step_index: stepIndex,
      });
      void postMemberEvent({
        eventName: 'onboarding_tour_dismissed',
        sourcePage: '/dashboard',
        metadata: { portal, step_index: stepIndex },
      });
      if (userId) {
        setOnboardingTourDismissedCookie(userId);
        try {
          await fetch('/api/onboarding/tour-dismiss', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ portal: 'member', stepIndex }),
          });
        } catch {
          // ignore
        }
      }
    }
    endTour();
    router.refresh();
  }, [portal, currentStep, tourStorageUserId, endTour, router]);

  const completeTour = useCallback(async () => {
    if (portal === 'member' && tourStartedRef.current) {
      trackFunnelEvent('member_onboarding', 'tour_completed', {
        portal,
        steps_seen: steps.length,
      });
      void postMemberEvent({
        eventName: 'onboarding_tour_completed',
        sourcePage: '/dashboard',
        metadata: { portal, steps_seen: steps.length },
      });
    }
    try {
      await fetch('/api/onboarding/tour-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portal }),
      });
    } catch {
      // ignore
    }
    endTour();
    router.refresh();
  }, [portal, steps.length, endTour, router]);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => {
      const next = prev + 1;
      if (next >= steps.length) {
        void completeTour();
        return prev;
      }
      return next;
    });
  }, [steps.length, completeTour]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const goToStep = useCallback((index: number) => {
    setCurrentStep(Math.max(0, Math.min(index, steps.length - 1)));
  }, [steps.length]);

  const value = useMemo(
    () => ({
      isOpen,
      currentStep,
      steps,
      portal,
      tourStorageUserId,
      startTour,
      endTour,
      dismissTour,
      completeTour,
      nextStep,
      prevStep,
      goToStep,
    }),
    [
      isOpen,
      currentStep,
      steps,
      portal,
      tourStorageUserId,
      startTour,
      endTour,
      dismissTour,
      completeTour,
      nextStep,
      prevStep,
      goToStep,
    ]
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}
