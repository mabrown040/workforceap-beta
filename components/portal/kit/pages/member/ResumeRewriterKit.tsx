import { FilePen } from 'lucide-react';
import ResumeRewriterForm from '@/components/portal/tools/ResumeRewriterForm';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';
import { ToolkitToolChrome } from './ToolkitToolChrome';

/**
 * Member Portal — resume rewriter tool page.
 * PageOpener chrome around ResumeRewriterForm. History is omitted in preview.
 *
 * Target route: app/(portal)/dashboard/ai-tools/resume-rewriter
 * Proof: /dev/member/resume-rewriter
 * Surface: warm (member-facing).
 */

export function ResumeRewriterKit({
  userId,
  preview = false,
  backHref,
  initialResume,
  initialJobTarget,
  initialTargetSalary,
  initialTargetLocation,
  previewOutput,
}: {
  userId?: string;
  preview?: boolean;
  backHref?: string;
  initialResume?: string;
  initialJobTarget?: string;
  initialTargetSalary?: string;
  initialTargetLocation?: string;
  previewOutput?: string;
}) {
  return (
    <ToolkitToolChrome
      title="Resume rewriter"
      lede="Reposition bullets toward a job title. Nothing invented."
      icon={<FilePen size={13} aria-hidden="true" />}
      backHref={backHref}
      maxWidth={760}
    >
      <div className="wa-kit-card">
        <ResumeRewriterForm
          preview={preview}
          initialResume={initialResume}
          initialJobTarget={initialJobTarget}
          initialTargetSalary={initialTargetSalary}
          initialTargetLocation={initialTargetLocation}
          previewOutput={previewOutput}
        />
      </div>
      {userId && !preview ? <ToolHistoryPanel userId={userId} toolType="resume_rewriter" /> : null}
    </ToolkitToolChrome>
  );
}
