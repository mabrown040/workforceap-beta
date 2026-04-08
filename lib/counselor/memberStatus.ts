import type { BadgeVariant } from '@/components/portal/StatusBadge';
import { getStatusBadgeVariantStyle } from '@/components/portal/StatusBadge';

type StatusStyle = { background: string; color: string };

function counselorStudentBadgeLabelAndVariant(member: {
  enrolledProgram: string | null;
  assessmentScorePct: number | null;
}): { label: string; variant: BadgeVariant } {
  const enrolled = !!member.enrolledProgram;
  if (!enrolled) {
    return { label: 'At Risk', variant: 'error' };
  }
  const r = member.assessmentScorePct;
  if (r == null) {
    return { label: 'On Track', variant: 'success' };
  }
  if (r >= 55) {
    return { label: 'On Track', variant: 'success' };
  }
  return { label: 'Needs focus', variant: 'warning' };
}

/** Counselor roster / student header: enrolled in a program ⇒ on track; otherwise at risk. */
export function counselorEnrollmentStatusBadge(enrolledProgram: string | null): {
  label: string;
  style: StatusStyle;
} {
  return counselorStudentStatusBadge({
    enrolledProgram,
    assessmentScorePct: null,
  });
}

/**
 * Roster + detail: enrollment plus optional assessment score % (0–100) when present.
 */
export function counselorStudentStatusBadge(member: {
  enrolledProgram: string | null;
  assessmentScorePct: number | null;
}): { label: string; style: StatusStyle } {
  const { label, variant } = counselorStudentBadgeLabelAndVariant(member);
  return { label, style: getStatusBadgeVariantStyle(variant) };
}

/** Same rules as {@link counselorStudentStatusBadge}, for shared StatusBadge variants. */
export function counselorStudentStatusBadgeVariant(member: {
  enrolledProgram: string | null;
  assessmentScorePct: number | null;
}): BadgeVariant {
  return counselorStudentBadgeLabelAndVariant(member).variant;
}
