import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Partner Signup',
};

export default function PartnerSignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
