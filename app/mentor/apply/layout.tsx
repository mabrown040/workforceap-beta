import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Mentor Application',
  description: 'Apply to mentor WorkforceAP members — share your expertise and help someone advance their career.',
  path: '/mentor/apply',
});

export default function MentorApplyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
