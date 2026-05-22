import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Employer Sign Up',
    description:
      'Create your WorkforceAP employer account to post jobs, review training-aligned candidates, and build a hiring pipeline without an upfront recruiting retainer.',
    path: '/employers/signup',
  });
}

export default function EmployerSignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
