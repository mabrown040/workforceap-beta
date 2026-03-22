'use client';

import WorkspaceShell from './WorkspaceShell';

const NAV_LINKS = [
  { href: '/partner', label: 'Dashboard' },
  { href: '/partner/guide', label: 'Referral guide' },
  { href: '/partner/resources', label: 'Resources' },
];

/**
 * Same light tool-portal chrome as the employer portal (white header, gray page bg),
 * not the dark marketing-style `portal-nav` strip used for legacy member routes.
 */
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
