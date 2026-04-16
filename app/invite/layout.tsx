import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: 'Accept Your Invitation',
    description: 'Accept your invitation to join Workforce Advancement Project.',
    path: '/invite',
  }),
  robots: { index: false, follow: false },
};

export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
