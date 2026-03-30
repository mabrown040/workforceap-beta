'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { TourStep } from './PortalTour';

type PortalType = 'member' | 'employer' | 'partner';

interface TourContextValue {
  isOpen: boolean;
  currentStep: number;
  steps: TourStep[];
  portal: PortalType;
  startTour: (steps: TourStep[], portal: PortalType) => void;
  endTour: () => void;
  completeTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return ctx;
}

interface TourProviderProps {
  children: ReactNode;
}

export function TourProvider({ children }: TourProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [portal, setPortal] = useState<PortalType>('member');

  const startTour = useCallback((newSteps: TourStep[], newPortal: PortalType) => {
    setSteps(newSteps);
    setPortal(newPortal);
    setCurrentStep(0);
    setIsOpen(true);
  }, []);

  const endTour = useCallback(() => {
    setIsOpen(false);
    setCurrentStep(0);
  }, []);

  const completeTour = useCallback(async () => {
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
  }, [portal, endTour]);

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
      startTour,
      endTour,
      completeTour,
      nextStep,
      prevStep,
      goToStep,
    }),
    [isOpen, currentStep, steps, portal, startTour, endTour, completeTour, nextStep, prevStep, goToStep]
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}
