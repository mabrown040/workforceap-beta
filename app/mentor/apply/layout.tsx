import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Become a Mentor · Workforce Advancement Project',
  description:
    'Apply to mentor members of Workforce Advancement Project. Share your expertise in Technology, Healthcare, Finance, Manufacturing, and more.',
  path: '/mentor/apply',
});

export default function MentorApplyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
