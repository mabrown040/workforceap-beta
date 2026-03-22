import PartnerExclusiveServerGate from '@/components/portal/PartnerExclusiveServerGate';
import PortalShell from '@/components/portal/PortalShell';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PartnerExclusiveServerGate />
      <PortalShell>{children}</PortalShell>
    </>
  );
}
