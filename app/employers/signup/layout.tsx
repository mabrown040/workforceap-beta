import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Employer Sign Up',
    description:
      'Create your WorkforceAP employer account to post jobs, review certified candidates, and hire from our no-cost training pipeline.',
    path: '/employers/signup',
  });
}

export default function EmployerSignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
