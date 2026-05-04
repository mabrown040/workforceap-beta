import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Admin – Invitations',
  description: 'Invite admins, partners, members, or counselors to the platform.',
  path: '/admin/invites',
});
}

export default function InvitesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
