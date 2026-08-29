/**
 * Pure merge for Coursera email → portal user resolution.
 * Kept Prisma-free so unit tests can import it under `node --test`.
 */
export function mergeCourseraEmailResolutions(args: {
  directHits: Array<{ email: string; userId: string }>;
  mappingHits: Array<{ email: string; userId: string }>;
}): Map<string, string> {
  const out = new Map<string, string>();
  const conflicts = new Set<string>();

  for (const hit of [...args.directHits, ...args.mappingHits]) {
    const email = hit.email.trim().toLowerCase();
    const userId = hit.userId.trim();
    if (!email || !userId || conflicts.has(email)) continue;

    const existing = out.get(email);
    if (existing && existing !== userId) {
      out.delete(email);
      conflicts.add(email);
      continue;
    }
    out.set(email, userId);
  }
  return out;
}
