const HIGH_SCHOOL_SUFFIX = '-high-school';

/** Public URL segment for a partner: `concordia-high-school` → `concordia`. */
export function enrollmentPathSegment(slug: string): string {
  return slug.endsWith(HIGH_SCHOOL_SUFFIX) ? slug.slice(0, -HIGH_SCHOOL_SUFFIX.length) : slug;
}

export function enrollmentPathForSlug(slug: string): string {
  return `/enroll/${enrollmentPathSegment(slug)}`;
}
