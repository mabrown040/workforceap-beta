import type { Metadata } from 'next';
import PartnerExclusiveServerGate from '@/components/portal/PartnerExclusiveServerGate';
import PortalLayoutClient from '@/components/portal/PortalLayoutClient';
import '@/css/portal.css';
import '@/css/portal-a11y.css';
import '@/css/dark-mode.css';
import '@/css/counselor.css';
import '@/css/language-toggle.css';
import '@/css/mobile-dashboard-fixes.css';

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
