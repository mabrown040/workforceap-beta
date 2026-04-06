'use client';

import { useEffect, useState, type ComponentProps } from 'react';
import { useRouter } from 'next/navigation';
import { useTour } from './TourContext';
import MemberOnboardingWizard from '@/components/onboarding/MemberOnboardingWizard';
import EmployerOnboardingWizard from '@/components/onboarding/EmployerOnboardingWizard';
import PartnerOnboardingWizard from '@/components/onboarding/PartnerOnboardingWizard';
import OnboardingDevReset from '@/components/onboarding/OnboardingDevReset';
import type { TourStep } from './PortalTour';

type Portal = 'member' | 'employer' | 'partner';

type MemberWizardProps = ComponentProps<typeof MemberOnboardingWizard>;
type EmployerWizardProps = ComponentProps<typeof EmployerOnboardingWizard>;
type PartnerWizardProps = ComponentProps<typeof PartnerOnboardingWizard>;

type PortalEntryClientProps =
  | {
      portal: 'member';
      showOnboardingWizard: boolean;
      showTour: boolean;
      isSuperAdmin: boolean;
      tourSteps: TourStep[];
      wizardProps: MemberWizardProps;
      children: React.ReactNode;
    }
  | {
      portal: 'employer';
      showOnboardingWizard: boolean;
      showTour: boolean;
      isSuperAdmin: boolean;
      tourSteps: TourStep[];
      wizardProps: EmployerWizardProps;
      children: React.ReactNode;
    }
  | {
      portal: 'partner';
      showOnboardingWizard: boolean;
      showTour: boolean;
      isSuperAdmin: boolean;
      tourSteps: TourStep[];
      wizardProps: PartnerWizardProps;
      children: React.ReactNode;
    };

export default function PortalEntryClient(props: PortalEntryClientProps) {
  const { portal, showOnboardingWizard, showTour, isSuperAdmin, tourSteps, children } = props;
  const [wizardOpen, setWizardOpen] = useState(showOnboardingWizard);
  const router = useRouter();
  const { startTour } = useTour();

  useEffect(() => {
    setWizardOpen(showOnboardingWizard);
    if (!showOnboardingWizard && showTour) {
      startTour(tourSteps, portal);
    }
  }, [showOnboardingWizard, showTour, tourSteps, portal, startTour]);

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
