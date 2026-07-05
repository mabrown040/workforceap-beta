import { DesignSurface, SectionHeader } from '@/components/portal/kit';
import LinkedInAboutForm from '@/components/portal/tools/LinkedInAboutForm';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';

/**
 * Member Portal — LINKEDIN ABOUT tool page.
 * Command Center reskin of the page chrome around the existing
 * `LinkedInAboutForm` client component (resume prefill + generation logic
 * untouched).
 *
 * Target route: app/(portal)/dashboard/ai-tools/linkedin-about
 * Surface: warm (member-facing).
 */

export function LinkedInAboutKit({ userId }: { userId: string }) {
  return (
    <DesignSurface surface="warm">
      <div style={{ maxWidth: 760, margin: '0 auto', padding: 16 }} className="wa-space-y-5">
        <SectionHeader
          kicker="Career Toolkit"
          title="LinkedIn About"
          goal="Add your target role and highlights. If you have a resume on file, we prefill from it and use the full text when generating your 3-paragraph About section."
        />
        <div className="wa-kit-card">
          <LinkedInAboutForm />
        </div>
        <ToolHistoryPanel userId={userId} toolType="linkedin_about" />
      </div>
    </DesignSurface>
  );
}
