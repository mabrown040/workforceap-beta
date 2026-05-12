'use client';

import PortalShell from '@/components/portal/PortalShell';
import TourProviderWrapper from '@/components/onboarding/TourProviderWrapper';
import CookieConsentBanner from '@/components/CookieConsentBanner';

export default function PortalLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PortalShell>
        <TourProviderWrapper>{children}</TourProviderWrapper>
      </PortalShell>
      <CookieConsentBanner />
    </>
  );
}