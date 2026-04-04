/** Counselor roster / student header: enrolled in a program ⇒ on track; otherwise at risk. */
export function counselorEnrollmentStatusBadge(enrolledProgram: string | null): {
  label: string;
  style: { background: string; color: string };
} {
  const isEnrolled = !!enrolledProgram;
  return {
    label: isEnrolled ? 'On Track' : 'At Risk',
    style: isEnrolled
      ? { background: '#dcfce7', color: '#166534' }
      : { background: '#fee2e2', color: '#991b1b' },
  };
}
