export type InboundProgramEnrollment = {
  programSlug: string;
  isPrimary: boolean;
};

/**
 * Resolve the program that may receive an inbound learning event.
 *
 * A CourseEnrollment row is durable history, so recency alone cannot make it
 * active. Prefer the explicit primary marker. For pre-primary legacy records,
 * accept User.enrolledProgram only when an enrollment row mirrors that value.
 * Clearing both signals therefore prevents later events from reviving an old
 * program and crediting progress to it.
 */
export function resolveInboundProgramSlug(args: {
  enrollments: InboundProgramEnrollment[];
  legacyEnrolledProgram: string | null;
}): string | null {
  const primary = args.enrollments.find((enrollment) => enrollment.isPrimary);
  if (primary) return primary.programSlug;

  const legacy = args.legacyEnrolledProgram?.trim() ?? '';
  if (!legacy) return null;

  return args.enrollments.some((enrollment) => enrollment.programSlug === legacy)
    ? legacy
    : null;
}
