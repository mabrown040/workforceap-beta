import { DesignSurface, SectionHeader } from '@/components/portal/kit';
import InterviewPracticeForm from '@/components/portal/tools/InterviewPracticeForm';
import InterviewPracticeSaved from '@/components/portal/tools/InterviewPracticeSaved';

/**
 * Member Portal — INTERVIEW PRACTICE tool page.
 * Command Center reskin of the page chrome around the existing
 * `InterviewPracticeForm` / `InterviewPracticeSaved` client components
 * (question generation + STAR worksheet logic untouched).
 *
 * Target route: app/(portal)/dashboard/ai-tools/interview-practice
 * Surface: warm (member-facing).
 */

interface InitialData {
  role: string;
  experienceLevel: 'entry' | 'mid' | 'senior';
  resumeContext: string;
}

interface SavedResult {
  id: string;
  inputSummary: string | null;
  output: string | null;
  createdAt: Date;
}

export interface InterviewPracticeKitProps {
  memberId: string;
  initialData: InitialData | null;
  savedResults: SavedResult[];
}

export function InterviewPracticeKit({ memberId, initialData, savedResults }: InterviewPracticeKitProps) {
  return (
    <DesignSurface surface="warm">
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: 16 }} className="wa-space-y-5">
        <SectionHeader
          kicker="Career Toolkit"
          title="Interview Practice"
          goal="Role-specific questions with STAR-style answer frameworks."
        />
        <div className="wa-kit-card wa-kit-card--sm">
          <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--wa-muted)', margin: 0 }}>
            Generate tailored interview questions for any role. Choose behavioral, technical, or situational focus and
            get structured prompts you can practice out loud or in writing.
          </p>
        </div>
        <div className="wa-kit-card">
          <InterviewPracticeForm memberId={memberId} initialData={initialData} />
        </div>
        <InterviewPracticeSaved results={savedResults} />
      </div>
    </DesignSurface>
  );
}
