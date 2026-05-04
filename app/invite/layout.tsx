import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';

export async function generateMetadata(): Promise<Metadata> {
  const base = await buildPageMetadataAsync({
    title: 'Accept Your Invitation',
    description: 'Accept your invitation to join Workforce Advancement Project.',
    path: '/invite',
  });
  return { ...base, robots: { index: false, follow: false } };
}

export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
