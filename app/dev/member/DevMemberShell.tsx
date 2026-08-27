'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import WorkspaceShell from '@/components/portal/WorkspaceShell';
import { MEMBER_PORTAL_NAV_ITEMS } from '@/lib/nav/portalNav';
import { PRODUCT_COPY } from '@/lib/nav/workspaceCopy';

/**
 * Credential-free `/dev/member/*` chrome — same WorkspaceShell as live
 * `/dashboard`, with nav hrefs remapped onto the proof routes so the active
 * rail/tab matches the page being reviewed. Destinations without a proof
 * (AI Advisor, Learning Hub, Help, …) are omitted so the rail cannot jump
 * out of `/dev/member`. Profile proofs map from `/dashboard/profile` (not
 * Resume) so the active rail item matches the page. Superadmin view switcher
 * is only on missions proofs (that page is the switcher fixture); other member
 * surfaces stay member chrome so the suite reads as one product.
 */
const DEV_HREF: Record<string, string> = {
  '/dashboard': '/dev/member/home',
  '/dashboard/program': '/dev/member/program',
  '/dashboard/missions': '/dev/member/missions',
  '/dashboard/certifications': '/dev/member/certificates',
  '/dashboard/jobs': '/dev/member/jobs',
  '/dashboard/readiness': '/dev/member/progress',
  '/dashboard/ai-tools': '/dev/member/toolkit',
  '/dashboard/messages': '/dev/member/messages',
  '/dashboard/assessment': '/dev/member/assessment',
  '/dashboard/profile': '/dev/member/profile',
};

const DEV_ALIASES: Record<string, string[]> = {
  '/dev/member/jobs': ['/dev/member/jobs-empty'],
  '/dev/member/certificates': ['/dev/member/certificates-empty'],
  '/dev/member/toolkit': [
    '/dev/member/interview-prep',
    '/dev/member/interview-practice',
    '/dev/member/linkedin-headline',
    '/dev/member/linkedin-about',
    '/dev/member/job-match',
    '/dev/member/interview-coach',
    '/dev/member/cover-letter',
    '/dev/member/resume-rewriter',
    '/dev/member/resume-strength',
    '/dev/member/resume-studio',
    '/dev/member/salary-negotiation',
    '/dev/member/elevator-pitch',
  ],
};

export default function DevMemberShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const seenHref = new Set<string>();
  const navItems = MEMBER_PORTAL_NAV_ITEMS.filter((item) => item.href in DEV_HREF)
    .map((item) => {
      const href = DEV_HREF[item.href];
      const extra = DEV_ALIASES[href] ?? [];
      return extra.length
        ? { ...item, href, aliases: [...(item.aliases ?? []), ...extra] }
        : { ...item, href };
    })
    .filter((item) => {
      // Home and "My Account" both canonicalise to /dashboard → same proof.
      if (seenHref.has(item.href)) return false;
      seenHref.add(item.href);
      return true;
    });

  return (
    <WorkspaceShell
      portalRole="member"
      navItems={navItems}
      workspaceLabel={PRODUCT_COPY.memberWorkspace}
      contextLabel="Design preview"
      minimalMobileHeader
      superAdmin={pathname.startsWith('/dev/member/missions')}
      marketingSiteHref="/en"
      marketingSiteLabel="WorkforceAP.org"
      navHrefMap={DEV_HREF}
    >
      {children}
    </WorkspaceShell>
  );
}
