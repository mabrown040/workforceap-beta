import type { BadgeVariant } from '@/components/portal/StatusBadge';

type StatusStyle = { background: string; color: string };

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
  const enrolled = !!member.enrolledProgram;
  if (!enrolled) {
    return { label: 'At Risk', style: { background: '#fee2e2', color: '#991b1b' } };
  }
  const r = member.assessmentScorePct;
  if (r == null) {
    return { label: 'On Track', style: { background: '#dcfce7', color: '#166534' } };
  }
  if (r >= 55) {
    return { label: 'On Track', style: { background: '#dcfce7', color: '#166534' } };
  }
  return { label: 'Needs focus', style: { background: '#fef3c7', color: '#92400e' } };
}

/** Same rules as {@link counselorStudentStatusBadge}, for shared StatusBadge variants. */
export function counselorStudentStatusBadgeVariant(member: {
  enrolledProgram: string | null;
  assessmentScorePct: number | null;
}): BadgeVariant {
  const enrolled = !!member.enrolledProgram;
  if (!enrolled) return 'error';
  const r = member.assessmentScorePct;
  if (r == null) return 'success';
  if (r >= 55) return 'success';
  return 'warning';
}
