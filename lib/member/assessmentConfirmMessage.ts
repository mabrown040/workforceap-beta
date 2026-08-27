/** Quiet post-submit copy for the training preassessment score billboard. */
export function assessmentConfirmMessage(pct: number): string {
  if (pct >= 75) return 'Ready for training. Your counselor will follow up.';
  if (pct >= 50) return 'Counselor may add foundational resources alongside training.';
  return 'Counselor will follow up from your answers.';
}
