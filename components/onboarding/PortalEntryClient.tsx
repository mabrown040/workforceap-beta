'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, type ComponentProps } from 'react';
import { useRouter } from 'next/navigation';
import { useTour } from './TourContext';
import { hasOnboardingTourDismissedCookie } from '@/lib/onboarding/onboardingTourDismiss';
import OnboardingDevReset from '@/components/onboarding/OnboardingDevReset';
import type { TourStep } from './PortalTour';

const MemberOnboardingWizard = dynamic(
  () => import('@/components/onboarding/MemberOnboardingWizard'),
);
const EmployerOnboardingWizard = dynamic(
  () => import('@/components/onboarding/EmployerOnboardingWizard'),
);
const PartnerOnboardingWizard = dynamic(
  () => import('@/components/onboarding/PartnerOnboardingWizard'),
);

type Portal = 'member' | 'employer' | 'partner';

/** Props of the wizard components themselves (avoid `dynamic()` wrapper typing) */
type MemberWizardProps = ComponentProps<
  (typeof import('@/components/onboarding/MemberOnboardingWizard'))['default']
>;
type EmployerWizardProps = ComponentProps<
  (typeof import('@/components/onboarding/EmployerOnboardingWizard'))['default']
>;
type PartnerWizardProps = ComponentProps<
  (typeof import('@/components/onboarding/PartnerOnboardingWizard'))['default']
>;

type PortalEntryClientProps =
  | {
      portal: 'member';
      /** Scope localStorage/sessionStorage tour flags so shared devices do not suppress tours for the next signed-in user. */
      tourStorageUserId: string;
      showOnboardingWizard: boolean;
      showTour: boolean;
      isSuperAdmin: boolean;
      tourSteps: TourStep[];
      wizardProps: MemberWizardProps;
      children: React.ReactNode;
    }
  | {
      portal: 'employer';
      tourStorageUserId: string;
      showOnboardingWizard: boolean;
      showTour: boolean;
      isSuperAdmin: boolean;
      tourSteps: TourStep[];
      wizardProps: EmployerWizardProps;
      children: React.ReactNode;
    }
  | {
      portal: 'partner';
      tourStorageUserId: string;
      showOnboardingWizard: boolean;
      showTour: boolean;
      isSuperAdmin: boolean;
      tourSteps: TourStep[];
      wizardProps: PartnerWizardProps;
      children: React.ReactNode;
    };

export default function PortalEntryClient(props: PortalEntryClientProps) {
  const { portal, tourStorageUserId, showOnboardingWizard, showTour, isSuperAdmin, tourSteps, children } = props;
  const [wizardOpen, setWizardOpen] = useState(showOnboardingWizard);
  const router = useRouter();
  const { startTour } = useTour();
  const tourAutoStartKey = `wa:tour:auto-started:${portal}:${tourStorageUserId}`;

  useEffect(() => {
    setWizardOpen(showOnboardingWizard);
    if (!showOnboardingWizard && showTour) {
      // Check both localStorage (persistent) and sessionStorage (legacy) so the
      // tour never fires twice — even across new browser sessions when tourCompletedAt
      // hasn't propagated from the DB yet.
      const alreadyAutoStarted =
        typeof window !== 'undefined' &&
        (window.localStorage.getItem(tourAutoStartKey) === '1' ||
          window.sessionStorage.getItem(tourAutoStartKey) === '1');
      if (alreadyAutoStarted) return;
      if (portal === 'member' && hasOnboardingTourDismissedCookie(tourStorageUserId)) return;
      const timer = setTimeout(() => {
        startTour(tourSteps, portal, { userId: tourStorageUserId });
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(tourAutoStartKey, '1');
          window.sessionStorage.setItem(tourAutoStartKey, '1');
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [showOnboardingWizard, showTour, tourSteps, portal, startTour, tourAutoStartKey]);

  const onWizardDone = () => {
    setWizardOpen(false);
    /* Re-fetch RSC payload so overview reflects saved onboarding data; useEffect starts tour when showTour is true */
    void router.refresh();
  };

  return (
    <>
      {portal === 'member' && wizardOpen ? (
        <MemberOnboardingWizard {...props.wizardProps} onComplete={onWizardDone} />
      ) : null}
      {portal === 'employer' && wizardOpen ? (
        <EmployerOnboardingWizard {...props.wizardProps} onComplete={onWizardDone} />
      ) : null}
      {portal === 'partner' && wizardOpen ? (
        <PartnerOnboardingWizard {...props.wizardProps} onComplete={onWizardDone} />
      ) : null}
      {isSuperAdmin && process.env.NODE_ENV !== 'production' ? <OnboardingDevReset portal={portal} /> : null}
      {children}
    </>
  );
}
