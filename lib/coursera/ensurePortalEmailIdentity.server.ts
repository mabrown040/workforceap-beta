import 'server-only';

import {
  upsertCourseraIdentityMapping,
  listCourseraIdentityMappingsForUser,
} from '@/lib/xapi/mappings';
import { backfillUserIdForCourseraEmail } from '@/lib/coursera/csvImport.server';
import { replayUnresolvedXapiStatementsForIdentity } from '@/lib/coursera/replayPendingXapi';
import {
  ensurePortalEmailIdentityLink as runEnsurePortalEmailIdentityLink,
  type EnsurePortalEmailIdentityResult,
} from './ensurePortalEmailIdentity';

export type { EnsurePortalEmailIdentityResult };

/**
 * Production entry: bind portal email → Coursera identity, backfill orphans,
 * replay unresolved xAPI. See `ensurePortalEmailIdentity.ts` for the pure core.
 */
export async function ensurePortalEmailIdentityLink(args: {
  userId: string;
  email: string | null | undefined;
  orgId?: string | null;
}): Promise<EnsurePortalEmailIdentityResult> {
  return runEnsurePortalEmailIdentityLink(args, {
    listMappings: listCourseraIdentityMappingsForUser,
    upsertMapping: upsertCourseraIdentityMapping,
    backfill: backfillUserIdForCourseraEmail,
    replayXapi: replayUnresolvedXapiStatementsForIdentity,
  });
}
