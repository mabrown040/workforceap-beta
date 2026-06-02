'use client';

import '@/css/language-toggle.css';
import PartnerExclusiveServerGate from '@/components/portal/PartnerExclusiveServerGate';
import PortalShell from '@/components/portal/PortalShell';
import TourProviderWrapper from '@/components/onboarding/TourProviderWrapper';
import CookieConsentBanner from '@/components/CookieConsentBanner';

function PortalLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PartnerExclusiveServerGate />
      <PortalShell>
        <TourProviderWrapper>{children}</TourProviderWrapper>
      </PortalShell>
      <CookieConsentBanner />
    </>
  );
}

export default PortalLayoutClient;
