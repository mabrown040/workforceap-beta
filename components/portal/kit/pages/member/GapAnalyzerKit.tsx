import { Compass } from 'lucide-react';
import GapAnalyzerForm from '@/components/portal/tools/GapAnalyzerForm';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';
import { ToolkitToolChrome } from './ToolkitToolChrome';

/**
 * Member Portal — resume gap analyzer.
 * PageOpener chrome around GapAnalyzerForm. History is omitted in preview.
 *
 * Target route: app/(portal)/dashboard/ai-tools/gap-analyzer
 * Proof: /dev/member/gap-analyzer
 * Surface: warm (member-facing).
 */

export function GapAnalyzerKit({
  userId,
  preview = false,
  backHref,
  initialResume,
  previewOutput,
}: {
  userId?: string;
  preview?: boolean;
  backHref?: string;
  initialResume?: string;
  previewOutput?: string;
}) {
  return (
    <ToolkitToolChrome
      title="Gap analyzer"
      lede="Flag employment gaps and draft how to talk about them."
      icon={<Compass size={13} aria-hidden="true" />}
      backHref={backHref}
      maxWidth={760}
    >
      <div className="wa-kit-card">
        <GapAnalyzerForm
          preview={preview}
          initialResume={initialResume}
          previewOutput={previewOutput}
        />
      </div>
      {userId && !preview ? <ToolHistoryPanel userId={userId} toolType="gap_analyzer" /> : null}
    </ToolkitToolChrome>
  );
}
