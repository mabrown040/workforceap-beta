import { MailOpen } from 'lucide-react';
import CoverLetterForm from '@/components/portal/tools/CoverLetterForm';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';
import { ToolkitToolChrome } from './ToolkitToolChrome';

/**
 * Member Portal — cover letter tool page.
 * PageOpener chrome around CoverLetterForm. History is omitted in preview.
 *
 * Target route: app/(portal)/dashboard/ai-tools/cover-letter
 * Proof: /dev/member/cover-letter
 * Surface: warm (member-facing).
 */

export function CoverLetterKit({
  userId,
  preview = false,
  backHref,
  initialCompany,
  initialJobDescription,
  initialResume,
  previewOutput,
}: {
  userId?: string;
  preview?: boolean;
  backHref?: string;
  initialCompany?: string;
  initialJobDescription?: string;
  initialResume?: string;
  previewOutput?: string;
}) {
  return (
    <ToolkitToolChrome
      title="Cover letter"
      lede="Write a letter for a posting."
      icon={<MailOpen size={13} aria-hidden="true" />}
      backHref={backHref}
      maxWidth={760}
    >
      <div className="wa-kit-card">
        <CoverLetterForm
          preview={preview}
          initialCompany={initialCompany}
          initialJobDescription={initialJobDescription}
          initialResume={initialResume}
          previewOutput={previewOutput}
        />
      </div>
      {userId && !preview ? <ToolHistoryPanel userId={userId} toolType="cover_letter" /> : null}
    </ToolkitToolChrome>
  );
}
