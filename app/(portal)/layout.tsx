import type { Metadata } from 'next';
import PartnerExclusiveServerGate from '@/components/portal/PartnerExclusiveServerGate';
import PortalShell from '@/components/portal/PortalShell';
import TourProviderWrapper from '@/components/onboarding/TourProviderWrapper';
import CookieConsentBanner from '@/components/CookieConsentBanner';

export const metadata: Metadata = {
  title: 'Portal',
  robots: {
    index: false,
    follow: false,
  },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
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
