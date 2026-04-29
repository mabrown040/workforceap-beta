import type { Metadata } from 'next';
import PartnerExclusiveServerGate from '@/components/portal/PartnerExclusiveServerGate';
import PortalLayoutClient from '@/components/portal/PortalLayoutClient';

export const metadata: Metadata = {
  title: 'Portal',
  robots: {
    index: false,
    follow: false,
  },
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PartnerExclusiveServerGate />
      <PortalLayoutClient>{children}</PortalLayoutClient>
    </>
  );
}
