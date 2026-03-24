'use client';

import { useEffect, useState, type ComponentProps } from 'react';
import PortalTour, { type TourStep } from '@/components/onboarding/PortalTour';
import MemberOnboardingWizard from '@/components/onboarding/MemberOnboardingWizard';
import EmployerOnboardingWizard from '@/components/onboarding/EmployerOnboardingWizard';
import PartnerOnboardingWizard from '@/components/onboarding/PartnerOnboardingWizard';
import OnboardingDevReset from '@/components/onboarding/OnboardingDevReset';

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
  const [tourOpen, setTourOpen] = useState(!showOnboardingWizard && showTour);

  useEffect(() => {
    setWizardOpen(showOnboardingWizard);
    setTourOpen(!showOnboardingWizard && showTour);
  }, [showOnboardingWizard, showTour]);

  const onWizardDone = () => {
    setWizardOpen(false);
    if (showTour) setTourOpen(true);
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
      {tourOpen ? (
        <PortalTour steps={tourSteps} portal={portal} onComplete={() => setTourOpen(false)} />
      ) : null}
      {isSuperAdmin ? <OnboardingDevReset portal={portal} /> : null}
      {children}
    </>
  );
}
