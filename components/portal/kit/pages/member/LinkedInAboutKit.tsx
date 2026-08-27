import { Briefcase } from 'lucide-react';
import LinkedInAboutForm from '@/components/portal/tools/LinkedInAboutForm';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';
import { ToolkitToolChrome } from './ToolkitToolChrome';

/**
 * Member Portal — LinkedIn About tool page.
 * PageOpener chrome around LinkedInAboutForm. History is omitted in preview.
 *
 * Target route: app/(portal)/dashboard/ai-tools/linkedin-about
 * Surface: warm (member-facing).
 */

export function LinkedInAboutKit({
  userId,
  preview = false,
  backHref,
  initialRole,
  initialBullets,
  previewOutput,
  resumeHref,
}: {
  userId?: string;
  preview?: boolean;
  backHref?: string;
  initialRole?: string;
  initialBullets?: string;
  previewOutput?: string;
  resumeHref?: string;
}) {
  return (
    <ToolkitToolChrome
      title="LinkedIn About"
      lede="Three paragraphs for your About. Prefills from a resume on file."
      icon={<Briefcase size={13} aria-hidden="true" />}
      backHref={backHref}
      maxWidth={760}
    >
      <div className="wa-kit-card">
        <LinkedInAboutForm
          preview={preview}
          initialRole={initialRole}
          initialBullets={initialBullets}
          previewOutput={previewOutput}
          resumeHref={resumeHref}
        />
      </div>
      {userId && !preview ? <ToolHistoryPanel userId={userId} toolType="linkedin_about" /> : null}
    </ToolkitToolChrome>
  );
}
