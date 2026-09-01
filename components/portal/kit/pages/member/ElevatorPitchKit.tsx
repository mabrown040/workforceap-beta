import { Speech } from 'lucide-react';
import ElevatorPitchClient from '@/components/portal/tools/ElevatorPitchClient';
import ToolHistoryPanel from '@/components/portal/ToolHistoryPanel';
import { ToolkitToolChrome } from './ToolkitToolChrome';

/**
 * Member Portal — elevator pitch tool page.
 * PageOpener chrome around ElevatorPitchClient. History is omitted in preview.
 *
 * Target route: app/(portal)/dashboard/ai-tools/elevator-pitch
 * Proof: /dev/member/elevator-pitch
 * Surface: warm (member-facing).
 */

export function ElevatorPitchKit({
  userId,
  preview = false,
  backHref,
  initialData,
  previewStep,
  previewPitch,
}: {
  userId?: string;
  preview?: boolean;
  backHref?: string;
  initialData?: { name: string; targetRole: string; strengths: string; certifications: string; industry: string } | null;
  previewStep?: 'form' | 'pitch' | 'rehearse';
  previewPitch?: string;
}) {
  return (
    <ToolkitToolChrome
      title="Elevator pitch"
      lede="Write a 10–20 second intro, then rehearse it."
      icon={<Speech size={13} aria-hidden="true" />}
      backHref={backHref}
      maxWidth={760}
    >
      <div className="wa-kit-card">
        <ElevatorPitchClient
          userId={userId}
          initialData={initialData}
          preview={preview}
          previewStep={previewStep}
          previewPitch={previewPitch}
        />
      </div>
      {userId && !preview ? (
        <ToolHistoryPanel
          userId={userId}
          toolTypes={['career_counselor']}
          inputSummaryStartsWith="AI elevator speech for"
          title="Previous pitches"
          emptyMessage="No pitches yet."
        />
      ) : null}
    </ToolkitToolChrome>
  );
}
