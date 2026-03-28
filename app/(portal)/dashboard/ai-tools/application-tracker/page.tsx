import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import ApplicationTrackerTable from '@/components/portal/ApplicationTrackerTable';
import MemberJobPostingTransparency from '@/components/portal/MemberJobPostingTransparency';
import { ArrowLeft } from 'lucide-react';

export const metadata = buildPageMetadata({
  title: 'Application Tracker',
  description: 'Track your job applications and interview progress.',
  path: '/dashboard/ai-tools/application-tracker',
});

export default async function ApplicationTrackerPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/application-tracker');

  return (
    <div className="wa-space-y-8">
      {/* ── Header ── */}
      <header>
        <Link
          href="/dashboard/ai-tools"
          className="wa-inline-flex wa-items-center wa-gap-1.5 wa-text-sm wa-font-medium wa-text-m3-primary hover:wa-underline wa-mb-4"
        >
          <ArrowLeft size={14} aria-hidden />
          Back to AI Tools
        </Link>
        <p className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-widest wa-text-m3-primary wa-mb-1">
          AI Career Optimization
        </p>
        <h1 className="wa-text-3xl wa-font-extrabold wa-tracking-tight wa-text-m3-on-surface">
          Application Tracker
        </h1>
        <p className="wa-mt-1 wa-text-sm wa-text-m3-on-surface-variant wa-max-w-2xl">
          Track your job applications. Add applications, update status, and see your progress.
        </p>
      </header>

      {/* ── Content ── */}
      <div className="wa-space-y-6">
        <MemberJobPostingTransparency userId={user.id} />
        <div className="wa-rounded-2xl wa-border wa-border-m3-outline-variant/30 wa-bg-m3-surface-container-lowest wa-p-6">
          <ApplicationTrackerTable />
        </div>
      </div>
    </div>
  );
}
