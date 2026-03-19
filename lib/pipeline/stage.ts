/**
 * Derives a student's current pipeline stage from their existing data.
 * No new DB column needed — computed from what's already tracked.
 */

export type PipelineStage =
  | 'applied'
  | 'enrolled'
  | 'in_training'
  | 'certified'
  | 'job_searching'
  | 'placed'
  | 'closed';

export interface PipelineStudent {
  id: string;
  fullName: string;
  email: string;
  enrolledProgram: string | null;
  enrolledAt: Date | null;
  assessmentCompleted: boolean;
  coursesCompleted: unknown; // JSON array of course slugs
  deletedAt: Date | null;
  placementRecord?: { employerName: string; jobTitle: string; salaryOffered: number | null; placedAt: Date } | null;
  userCertifications?: { certName: string; earnedAt: Date }[];
  applications?: { status: string; submittedAt: Date | null }[];
}

export function getPipelineStage(student: PipelineStudent): PipelineStage {
  // Closed/deleted
  if (student.deletedAt) return 'closed';

  // Placed
  if (student.placementRecord) return 'placed';

  // Certified (has at least one certification on record)
  if (student.userCertifications && student.userCertifications.length > 0) return 'certified';

  // In training (enrolled + has completed at least one course)
  const courses = Array.isArray(student.coursesCompleted) ? student.coursesCompleted : [];
  if (student.enrolledAt && courses.length > 0) return 'in_training';

  // Enrolled (approved application + enrolled in a program)
  if (student.enrolledAt && student.enrolledProgram) return 'enrolled';

  // Applied (has a submitted application)
  const hasApp = student.applications?.some((a) => a.submittedAt) ?? false;
  if (hasApp) return 'applied';

  // Default (account created but no application yet)
  return 'applied';
}

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  applied: 'Applied',
  enrolled: 'Enrolled',
  in_training: 'In Training',
  certified: 'Certified',
  job_searching: 'Job Searching',
  placed: 'Placed',
  closed: 'Closed',
};

export const PIPELINE_STAGE_COLORS: Record<PipelineStage, string> = {
  applied: '#6b7280',
  enrolled: '#2563eb',
  in_training: '#7c3aed',
  certified: '#059669',
  job_searching: '#d97706',
  placed: '#16a34a',
  closed: '#9ca3af',
};

export const PIPELINE_STAGES_ORDERED: PipelineStage[] = [
  'applied',
  'enrolled',
  'in_training',
  'certified',
  'job_searching',
  'placed',
];