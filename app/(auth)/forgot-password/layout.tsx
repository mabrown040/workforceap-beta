import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';

export async function generateMetadata(): Promise<Metadata> {
  const base = await buildPageMetadataAsync({
    title: 'Reset password',
    description: 'Forgot your password? Enter your email and we\'ll send a secure reset link to your inbox.',
    path: '/forgot-password',
  });
  return { ...base, robots: { index: false, follow: false } };
}

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
