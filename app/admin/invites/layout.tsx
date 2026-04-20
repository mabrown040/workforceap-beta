import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin – Invitations',
  description: 'Invite admins, partners, members, or counselors to the platform.',
  path: '/admin/invites',
});

export default function InvitesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
