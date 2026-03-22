'use client';

import WorkspaceShell from './WorkspaceShell';

const NAV_LINKS = [
  { href: '/employer', label: 'Home' },
  { href: '/employer/jobs', label: 'Job Postings' },
  { href: '/employer/applications', label: 'Applicants' },
  { href: '/employer/jobs/new', label: 'Create Posting' },
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
