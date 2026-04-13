'use client';

import { TourProvider } from './TourContext';
import PortalTour from './PortalTour';

export default function TourProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <TourProvider>
      {children}
      <PortalTour />
    </TourProvider>
  );
}
