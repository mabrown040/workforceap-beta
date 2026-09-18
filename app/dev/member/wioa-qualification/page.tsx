import { notFound } from 'next/navigation';
import WioaQualificationClient from '@/components/portal/WioaQualificationClient';

/**
 * Credential-free WIOA screening proof — same client as
 * `/dashboard/learning/wioa-qualification`, so the site footer can be
 * checked against Save screening / Next steps without auth.
 */
export const dynamic = 'force-dynamic';

export default function DevMemberWioaQualificationPage() {
  if (process.env.VERCEL_ENV === 'production') notFound();
  return <WioaQualificationClient initialSnapshot={null} />;
}
