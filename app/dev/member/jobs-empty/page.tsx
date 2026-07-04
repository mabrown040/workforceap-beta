import { notFound } from 'next/navigation';
import { MemberJobsKit } from '@/components/portal/kit/pages/member/MemberJobsKit';

/**
 * Storybook-lite showcase — MemberJobsKit EMPTY state (no applications, no
 * recommendations yet). Preview-only, no auth/DB.
 */
export const dynamic = 'force-dynamic';

export default function DevMemberJobsEmptyPage() {
  if (process.env.VERCEL_ENV === 'production') notFound();

  return (
    <MemberJobsKit
      saved={0}
      applied={0}
      interviewing={0}
      offers={0}
      syncedLabel="Not synced yet"
      browseHref="#"
      applications={[]}
      recommended={[]}
    />
  );
}
