import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';

export async function generateMetadata(): Promise<Metadata> {
  const base = await buildPageMetadataAsync({
    title: 'Partner Signup',
    description: 'Redirecting to the WorkforceAP partner signup form.',
    path: '/partner-signup',
  });
  return { ...base, robots: { index: false, follow: false } };
}

export default function PartnerSignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
