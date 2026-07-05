import dynamic from 'next/dynamic';
import { Card } from '@astryxdesign/core/Card';
import { DesignSurface, SectionHeader } from '@/components/portal/kit';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';

/**
 * Member Portal — AI INTERVIEW COACH tool page.
 * Command Center reskin of the page chrome around the existing
 * `InterviewCoach` client component (form + voice/text session logic
 * untouched — this file only supplies the warm-surface layout).
 *
 * Target route: app/(portal)/dashboard/ai-tools/interview-coach
 * Surface: warm (member-facing).
 */

const InterviewCoach = dynamic(() => import('@/components/portal/tools/InterviewCoach'), {
  loading: () => (
    <Card role="status" aria-live="polite">
      <p style={{ margin: 0, color: 'var(--wa-muted)', fontWeight: 600, fontSize: 14 }}>
        Loading interview coach…
      </p>
    </Card>
  ),
});

export function InterviewCoachKit({ userId }: { userId: string }) {
  return (
    <DesignSurface surface="warm">
      <div style={{ maxWidth: 980, margin: '0 auto', padding: 16 }} className="wa-space-y-5">
        <SectionHeader
          kicker="Career Toolkit"
          title="AI Interview Coach"
          goal="Run a text-based mock interview and get instant AI feedback."
        />
        <Card>
          <InterviewCoach />
        </Card>
        <ToolHistoryPanel
          userId={userId}
          toolType="interview_coach"
          title="Recent coaching sessions"
          emptyMessage="No coaching sessions yet — run a mock interview above and it will show up here."
        />
      </div>
    </DesignSurface>
  );
}
