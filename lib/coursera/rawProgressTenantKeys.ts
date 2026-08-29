import { prisma } from '@/lib/db/prisma';

let ensureCourseProgressTenantKeysPromise: Promise<void> | null = null;
let ensureBadgeProgressTenantKeysPromise: Promise<void> | null = null;

/**
 * Verify that the controlled migration installed the tenant-local raw
 * Coursera idempotency key before a writer uses it.
 *
 * `organization_id IS NULL` rows are historical, unresolved evidence. They are
 * deliberately excluded from the new unique key: assigning those rows to a
 * tenant requires an explicit, reviewed migration rather than an import-time
 * guess. Every current writer requires a non-empty organization id. This
 * runtime guard is deliberately read-only: serverless requests must never
 * create/drop indexes or apply a partial migration behind Prisma's back.
 */
export async function ensureCourseProgressTenantKeys(): Promise<void> {
  if (!ensureCourseProgressTenantKeysPromise) {
    ensureCourseProgressTenantKeysPromise = (async () => {
      const rows = await prisma.$queryRaw<Array<{ installed: boolean }>>`
        SELECT to_regclass(
          'public.coursera_course_progress_org_email_course_key'
        ) IS NOT NULL AS installed
      `;
      if (rows[0]?.installed !== true) {
        throw new Error(
          'Coursera tenant progress key is not installed; run the controlled Prisma migration before ingest',
        );
      }
    })().catch((error) => {
      ensureCourseProgressTenantKeysPromise = null;
      throw error;
    });
  }
  await ensureCourseProgressTenantKeysPromise;
}

/** Read-only migration guard for raw Coursera badge/specialization rows. */
export async function ensureBadgeProgressTenantKeys(): Promise<void> {
  if (!ensureBadgeProgressTenantKeysPromise) {
    ensureBadgeProgressTenantKeysPromise = (async () => {
      const rows = await prisma.$queryRaw<Array<{ installed: boolean }>>`
        SELECT to_regclass(
          'public.coursera_badge_progress_org_email_badge_key'
        ) IS NOT NULL AS installed
      `;
      if (rows[0]?.installed !== true) {
        throw new Error(
          'Coursera tenant badge key is not installed; run the controlled Prisma migration before ingest',
        );
      }
    })().catch((error) => {
      ensureBadgeProgressTenantKeysPromise = null;
      throw error;
    });
  }
  await ensureBadgeProgressTenantKeysPromise;
}
