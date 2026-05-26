import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';

export async function generateMetadata(): Promise<Metadata> {
  const base = await buildPageMetadataAsync({
    title: 'Request WorkforceAP Partner Access',
    description:
      'WorkforceAP partner onboarding is currently invite-only. Request access to explore a fit review for your organization.',
    path: '/org/onboard',
  });
  return { ...base, robots: { index: false, follow: false } };
}

export default function OrgOnboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
