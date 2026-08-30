export type CourseDeliveryLike = {
  slug: string;
  kind?: 'coursera' | 'workforceap';
};

export function isWorkforceApCourse(course: CourseDeliveryLike): boolean {
  return course.kind === 'workforceap';
}

export function workforceApCourseHref(courseSlug: string, programSlug: string): string {
  return `/dashboard/learning/modules/${encodeURIComponent(courseSlug)}?program=${encodeURIComponent(programSlug)}`;
}
