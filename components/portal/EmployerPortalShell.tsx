'use client';

import WorkspaceShell from './WorkspaceShell';

const NAV_LINKS = [
  { href: '/employer', label: 'Home' },
  { href: '/employer/jobs', label: 'My Jobs' },
  { href: '/employer/jobs/import', label: 'Import' },
  { href: '/employer/jobs/new', label: 'Post job' },
  { href: '/employer/applications', label: 'Applicants' },
];

export default function EmployerPortalShell({
  companyName,
  superAdmin,
  children,
}: {
  companyName: string;
  superAdmin?: boolean;
  children: React.ReactNode;
}) {
  return (
    <WorkspaceShell
      navLinks={NAV_LINKS}
      workspaceLabel="Employer portal"
      contextLabel={companyName}
      superAdmin={superAdmin}
      superAdminBackHref="/admin/employers"
      superAdminBackLabel="Switch company"
    >
      {children}
    </WorkspaceShell>
  );
}
