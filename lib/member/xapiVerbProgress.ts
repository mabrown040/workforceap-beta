import { CourseProgressStatus } from '@prisma/client';

import type { ParsedXapiStatement } from '@/lib/xapi/statementModel';
import { isXapiCompletionVerb, isXapiCourseProgressVerb } from '@/lib/xapi/statementModel';

/** Maps xAPI verb / result fields to the next `CourseProgressStatus` for upserts (pure). */
export function inferCourseProgressStatusFromXapiVerb(
  parsed: ParsedXapiStatement
): CourseProgressStatus | null {
  if (!isXapiCourseProgressVerb(parsed)) return null;
  if (isXapiCompletionVerb(parsed)) return CourseProgressStatus.COMPLETED;
  const verbId = (parsed.verbId ?? '').toLowerCase();
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
