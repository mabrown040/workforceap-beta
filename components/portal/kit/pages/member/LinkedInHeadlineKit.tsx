import { Briefcase } from 'lucide-react';
import LinkedInHeadlineForm from '@/components/portal/tools/LinkedInHeadlineForm';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';
import { ToolkitToolChrome } from './ToolkitToolChrome';

/**
 * Member Portal — LinkedIn headline tool page.
 * PageOpener chrome around LinkedInHeadlineForm. History is omitted in preview.
 *
 * Target route: app/(portal)/dashboard/ai-tools/linkedin-headline
 * Surface: warm (member-facing).
 */

export function LinkedInHeadlineKit({
  userId,
  preview = false,
  backHref,
  initialRole,
  initialSkills,
  initialYears,
  previewHeadlines,
}: {
  userId?: string;
  preview?: boolean;
  backHref?: string;
  initialRole?: string;
  initialSkills?: string;
  initialYears?: string;
  previewHeadlines?: string[];
}) {
  return (
    <ToolkitToolChrome
      title="LinkedIn headline"
      lede="Write a headline recruiters can scan."
      icon={<Briefcase size={13} aria-hidden="true" />}
      backHref={backHref}
      maxWidth={760}
    >
      <div className="wa-kit-card">
        <LinkedInHeadlineForm
          preview={preview}
          initialRole={initialRole}
          initialSkills={initialSkills}
          initialYears={initialYears}
          previewHeadlines={previewHeadlines}
        />
      </div>
      {userId && !preview ? <ToolHistoryPanel userId={userId} toolType="linkedin_headline" /> : null}
    </ToolkitToolChrome>
  );
}
