import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Create Your Employer Account',
    description:
      'Sign up for a free WorkforceAP employer account. Post jobs, review applicants, and connect with trained candidates — no cost to employers.',
    path: '/employers/signup',
  });
}

export default function EmployerSignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
