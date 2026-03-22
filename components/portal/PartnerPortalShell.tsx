'use client';

import WorkspaceShell from './WorkspaceShell';

const NAV_LINKS = [
  { href: '/partner', label: 'Dashboard' },
  { href: '/partner/guide', label: 'Referral guide' },
  { href: '/partner/resources', label: 'Resources' },
];

export default function PartnerPortalShell({
  partnerName,
  children,
}: {
  partnerName: string;
  children: React.ReactNode;
}) {
  return (
    <WorkspaceShell
      navLinks={NAV_LINKS}
      workspaceLabel="Partner portal"
      contextLabel={partnerName}
    >
      {children}
    </WorkspaceShell>
  );
}
