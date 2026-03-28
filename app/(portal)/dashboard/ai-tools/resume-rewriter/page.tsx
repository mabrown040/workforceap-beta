import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import ResumeRewriterForm from '@/components/portal/tools/ResumeRewriterForm';
import { ArrowLeft, FileText } from 'lucide-react';

export const metadata: Metadata = buildPageMetadata({
  title: 'Resume Rewriter',
  description: 'AI-powered resume improvement tailored to your target job.',
  path: '/dashboard/ai-tools/resume-rewriter',
});

export default async function ResumeRewriterPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/ai-tools/resume-rewriter');

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
          AI Resume Rewriter
        </h1>
        <p className="wa-mt-1 wa-text-sm wa-text-m3-on-surface-variant wa-max-w-2xl">
          Paste your resume and target job. Get AI-improved bullets and phrasing to pass ATS and impress recruiters.
        </p>
      </header>

      {/* ── Two-column grid ── */}
      <div className="wa-grid wa-grid-cols-1 lg:wa-grid-cols-[1.2fr_1.8fr] wa-gap-6">
        {/* Left: Form card */}
        <div className="wa-rounded-2xl wa-border wa-border-m3-outline-variant/30 wa-bg-m3-surface-container-lowest wa-p-6">
          <ResumeRewriterForm />
        </div>

        {/* Right: Preview card */}
        <div className="wa-rounded-2xl wa-border wa-border-dashed wa-border-m3-outline-variant/50 wa-bg-m3-surface-container-lowest wa-p-6 wa-flex wa-flex-col wa-items-center wa-justify-center wa-min-h-[400px]">
          <FileText size={40} className="wa-text-m3-on-surface-variant/40 wa-mb-4" aria-hidden />
          <h2 className="wa-text-base wa-font-semibold wa-text-m3-on-surface wa-mb-1">
            Resume Preview
          </h2>
          <p className="wa-text-sm wa-text-m3-on-surface-variant wa-text-center wa-max-w-xs">
            Your AI-enhanced resume will appear here after processing.
          </p>
        </div>
      </div>
    </div>
  );
}
