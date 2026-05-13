import { CourseProgressStatus } from '@prisma/client';

import type { ParsedXapiStatement } from '@/lib/xapi/statementModel';

/** Maps xAPI verb / result fields to the next `CourseProgressStatus` for upserts (pure).
 *  Callers should already have validated the statement is a course-progress
 *  event (e.g. via `isXapiCourseProgressVerb`) — this function only maps
 *  the verb string to a status enum value. */
export function inferCourseProgressStatusFromXapiVerb(
  parsed: ParsedXapiStatement
): CourseProgressStatus | null {
  const verbId = (parsed.verbId ?? '').toLowerCase();
  if (verbId.includes('completed') || verbId.includes('passed')) {
    return CourseProgressStatus.COMPLETED;
  }
  if (
    verbId.includes('started')
    || verbId.includes('registered')
    || verbId.includes('initialized')
    || verbId.includes('progressed')
  ) {
    return CourseProgressStatus.IN_PROGRESS;
  }
  return null;
}
