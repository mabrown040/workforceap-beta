/**
 * `users.courses_completed` is Prisma Json — tolerate legacy or malformed shapes
 * so dashboard never throws on `.filter` / `.includes`.
 */
export function parseCourseSlugList(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === 'string' && x.length > 0);
  }
  return [];
}
