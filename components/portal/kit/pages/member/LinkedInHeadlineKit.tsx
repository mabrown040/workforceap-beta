import { DesignSurface, SectionHeader } from '@/components/portal/kit';
import LinkedInHeadlineForm from '@/components/portal/tools/LinkedInHeadlineForm';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';

/**
 * Member Portal — LINKEDIN HEADLINE tool page.
 * Command Center reskin of the page chrome around the existing
 * `LinkedInHeadlineForm` client component (generation logic untouched).
 *
 * Target route: app/(portal)/dashboard/ai-tools/linkedin-headline
 * Surface: warm (member-facing).
 */

export function LinkedInHeadlineKit({ userId }: { userId: string }) {
  return (
    <DesignSurface surface="warm">
      <div style={{ maxWidth: 760, margin: '0 auto', padding: 16 }} className="wa-space-y-5">
        <SectionHeader
          kicker="Career Toolkit"
          title="LinkedIn Headline"
          goal="Craft a compelling LinkedIn headline that gets you noticed by recruiters."
        />
        <div className="wa-kit-card">
          <LinkedInHeadlineForm />
        </div>
        <ToolHistoryPanel userId={userId} toolType="linkedin_headline" />
      </div>
    </DesignSurface>
  );
}
