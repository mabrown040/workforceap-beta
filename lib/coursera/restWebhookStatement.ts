import type { ParsedXapiStatement } from '@/lib/xapi/statements';

export type CourseraRestWebhookCourseFact = {
  email?: string;
  actorIdentifier?: string;
  actorHomePage?: string;
  courseraCourseId?: string;
  contentId?: string;
  courseSlug?: string;
  courseName?: string;
  completed?: boolean;
  progressPercent?: number;
};

/** Convert the REST payload to the same fact model used by xAPI ingestion. */
export function buildCourseraRestSyntheticStatement(
  data: CourseraRestWebhookCourseFact,
  resolvedEmail: string | undefined,
  rawForAudit: Record<string, unknown>,
): ParsedXapiStatement {
  // A 100% provider percentage is still only a progress fact. The locked
  // completion contract requires Coursera's explicit completed flag (or a
  // course-level xAPI completion verb), so 93% and 100% both remain in
  // progress when `completed` is absent/false.
  const shouldComplete = data.completed === true;
  return {
    email: resolvedEmail || data.email?.trim().toLowerCase(),
    actorIdentifier: data.actorIdentifier?.trim(),
    actorHomePage: data.actorHomePage?.trim(),
    courseName: data.courseName?.trim(),
    courseSlug: data.courseSlug?.trim(),
    courseraCourseId: (data.courseraCourseId ?? data.contentId)?.trim(),
    verbId: shouldComplete
      ? 'http://adlnet.gov/expapi/verbs/completed'
      : 'http://adlnet.gov/expapi/verbs/progressed',
    courseObjectId: null,
    resultCompletion: shouldComplete ? true : null,
    resultSuccess: null,
    resultProgressPercent: data.progressPercent ?? null,
    rawStatement: rawForAudit,
  };
}
