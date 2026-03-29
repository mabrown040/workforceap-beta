import type { Metadata } from 'next';
import { buildPageMetadata } from '@/app/seo';
import SignupForm from './SignupForm';

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: 'Member signup',
    description: 'Create your WorkforceAP member account to apply for programs and track your progress.',
    path: '/signup',
  }),
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return <SignupForm />;
}
