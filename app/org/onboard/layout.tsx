import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';

export async function generateMetadata(): Promise<Metadata> {
  const base = await buildPageMetadataAsync({
    title: 'Launch Your Branded Career Portal',
    description:
      'WorkforceAP powers nonprofits, workforce boards, and community colleges with a white-labeled training and job-matching platform.',
    path: '/org/onboard',
  });
  return { ...base, robots: { index: false, follow: false } };
}

export default function OrgOnboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
