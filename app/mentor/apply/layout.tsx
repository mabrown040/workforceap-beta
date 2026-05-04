import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Mentor Application',
  description: 'Apply to mentor WorkforceAP members — share your expertise and help someone advance their career.',
  path: '/mentor/apply',
});
}

export default function MentorApplyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
