/**
 * Intentionally no `server-only` import: `b4bSync.ts` loads this module and
 * that file's pure helpers must stay importable under `node --test`.
 */
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { mergeCourseraEmailResolutions } from '@/lib/coursera/mergeCourseraEmailResolutions';

export { mergeCourseraEmailResolutions } from '@/lib/coursera/mergeCourseraEmailResolutions';

/**
 * Resolve a portal user id from a Coursera learner email.
 *
 * Order (matches xAPI `resolveXapiUser` email paths, without actor lookup):
 *   1. Direct `users.email` match (case-insensitive, non-deleted)
 *   2. `coursera_identity_mappings.coursera_email` → `user_id`
 *
 * Used by CSV import and B4B org sync so alt-email learners mapped in admin
 * are not left as unresolved / orphan progress rows.
 */
export async function resolveUserIdByCourseraEmail(
  email: string,
  options: { organizationId?: string } = {},
): Promise<string | null> {
  const lower = email.trim().toLowerCase();
  if (!lower) return null;

  const map = await resolveUserIdsByCourseraEmails([lower], options);
  return map.get(lower) ?? null;
}

/**
 * Batch variant for cron/import windows. Returns lowercased email → userId.
 * Direct portal email wins over identity mapping when both exist.
 */
export async function resolveUserIdsByCourseraEmails(
  emails: string[],
  options: { organizationId?: string } = {},
): Promise<Map<string, string>> {
  const normalized = [
    ...new Set(
      emails
        .map((e) => e.trim().toLowerCase())
        .filter((e): e is string => Boolean(e)),
    ),
  ];
  if (normalized.length === 0) return new Map();

  const directHits: Array<{ email: string; userId: string }> = [];
  const CHUNK = 200;
  for (let i = 0; i < normalized.length; i += CHUNK) {
    const chunk = normalized.slice(i, i + CHUNK);
    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        email: { in: chunk, mode: 'insensitive' },
        ...(options.organizationId ? { organizationId: options.organizationId } : {}),
      },
      select: { id: true, email: true },
      take: CHUNK,
    });
    for (const u of users) {
      directHits.push({ email: u.email, userId: u.id });
    }
  }

  const directMap = mergeCourseraEmailResolutions({
    directHits,
    mappingHits: [],
  });
  const unresolved = normalized.filter((e) => !directMap.has(e));
  if (unresolved.length === 0) return directMap;

  const mappingHits: Array<{ email: string; userId: string }> = [];
  const organizationFilter = options.organizationId
    ? Prisma.sql`
        AND cim.organization_id = ${options.organizationId}
        AND u.organization_id = ${options.organizationId}
      `
    : Prisma.empty;
  for (let i = 0; i < unresolved.length; i += CHUNK) {
    const chunk = unresolved.slice(i, i + CHUNK);
    const rows = await prisma.$queryRaw<Array<{ email: string; userId: string }>>`
      SELECT LOWER(cim.coursera_email) AS email, cim.user_id AS "userId"
      FROM coursera_identity_mappings cim
      INNER JOIN users u
        ON u.id = cim.user_id
       AND u.deleted_at IS NULL
       AND u.organization_id = cim.organization_id
      WHERE cim.coursera_email IS NOT NULL
        AND LOWER(cim.coursera_email) IN (${Prisma.join(chunk)})
        ${organizationFilter}
    `;
    for (const row of rows) {
      if (row.email && row.userId) {
        mappingHits.push({ email: row.email, userId: row.userId });
      }
    }
  }

  return mergeCourseraEmailResolutions({ directHits, mappingHits });
}
