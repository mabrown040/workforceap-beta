import type { TrainingWorkspace } from './trainingWorkspace';

/** Build a reviewable request only from the member's loaded, pinned assignment. */
export function buildTrainingFeedbackDraft(
  workspace: TrainingWorkspace | null,
  courseSlug: string,
  curriculumVersion: string,
): { key: string; text: string } | undefined {
  if (!workspace || workspace.curriculumVersion !== curriculumVersion) return undefined;
  const course = workspace.courses.find((row) => row.slug === courseSlug);
  if (!course) return undefined;
  let artifactUrl: string | null = null;
  if (course.artifactUrl) {
    try {
      const url = new URL(course.artifactUrl);
      if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) artifactUrl = url.href;
    } catch { /* A malformed historical link is never copied into a request. */ }
  }
  return {
    key: `${workspace.programSlug}:${workspace.curriculumVersion}:${course.slug}`,
    text: [
      "I'd like feedback on my course work.",
      '',
      `Program: ${workspace.programTitle}`,
      `Course: ${course.name}`,
      ...(artifactUrl ? [`Project link: ${artifactUrl}`] : []),
      '',
      'My question: ',
    ].join('\n'),
  };
}
