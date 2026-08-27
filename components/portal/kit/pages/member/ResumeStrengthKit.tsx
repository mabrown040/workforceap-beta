import { Gauge } from 'lucide-react';
import ResumeStrengthForm from '@/components/portal/tools/ResumeStrengthForm';
import type { ResumeScorePayload } from '@/components/portal/tools/ResumeScoreBreakdown';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';
import { ToolkitToolChrome } from './ToolkitToolChrome';

/**
 * Member Portal — resume strength / analysis tool page.
 * PageOpener chrome around ResumeStrengthForm. History is omitted in preview.
 *
 * Target route: app/(portal)/dashboard/ai-tools/resume-analysis
 * Proof: /dev/member/resume-strength
 * Surface: warm (member-facing).
 */

export function ResumeStrengthKit({
  userId,
  preview = false,
  backHref,
  initialResume,
  previewOutput,
  previewPayload,
}: {
  userId?: string;
  preview?: boolean;
  backHref?: string;
  initialResume?: string;
  previewOutput?: string;
  previewPayload?: ResumeScorePayload | null;
}) {
  return (
    <ToolkitToolChrome
      title="Resume strength"
      lede="Score structure, keywords, and the gaps to close."
      icon={<Gauge size={13} aria-hidden="true" />}
      backHref={backHref}
      maxWidth={960}
    >
      <div className="wa-kit-card">
        <ResumeStrengthForm
          preview={preview}
          initialResume={initialResume}
          previewOutput={previewOutput}
          previewPayload={previewPayload}
        />
      </div>
      {userId && !preview ? <ToolHistoryPanel userId={userId} toolType="resume_analysis" /> : null}
    </ToolkitToolChrome>
  );
}
