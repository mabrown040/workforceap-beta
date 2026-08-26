/**
 * Pure merge for Coursera email → portal user resolution.
 * Kept Prisma-free so unit tests can import it under `node --test`.
 */
export function mergeCourseraEmailResolutions(args: {
  directHits: Array<{ email: string; userId: string }>;
  mappingHits: Array<{ email: string; userId: string }>;
}): Map<string, string> {
  const out = new Map<string, string>();
  for (const hit of args.directHits) {
    const email = hit.email.trim().toLowerCase();
    if (email && hit.userId) out.set(email, hit.userId);
  }
  for (const hit of args.mappingHits) {
    const email = hit.email.trim().toLowerCase();
    if (email && hit.userId && !out.has(email)) out.set(email, hit.userId);
  }
  return out;
}
