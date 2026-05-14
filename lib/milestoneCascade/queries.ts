import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { isSuperAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';

import { ActionDraftSchema, type ActionDraft } from './types';

/**
 * Server-side query helpers for the milestone-cascade pipeline.
 *
 * Centralizing reads here means UI surfaces (admin inbox, counselor dashboard,
 * member-facing celebration feed eventually) all share the same shape and
 * the same validation. Drafts come back from Prisma as untyped `Json` — these
 * helpers re-validate them against the zod schema so callers can rely on the
 * typed shape and we surface stale rows (drafts written by a previous
 * schema) as discardable rather than runtime-crashing the page.
 */

export interface CascadeCardData {
  id: string;
  userId: string;
  userFullName: string | null;
  userEmail: string;
  milestoneType: string;
  milestoneRef: string;
  programSlug: string | null;
  counselorBrief: string | null;
  drafts: ActionDraft[];
  /** Drafts that failed schema validation (e.g. older prompt versions). The
   *  inbox UI can show a "1 draft skipped" hint instead of hiding the whole
   *  cascade. */
  invalidDraftCount: number;
  draftModel: string | null;
  draftPromptVersion: string | null;
  draftedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
}

/** Validate the `drafts` JSON column against the zod schema. Per-element
 *  parsing so one bad draft doesn't take the whole cascade off the inbox. */
function parseDrafts(raw: unknown): { drafts: ActionDraft[]; invalid: number } {
  if (!Array.isArray(raw)) return { drafts: [], invalid: 0 };
  const drafts: ActionDraft[] = [];
  let invalid = 0;
  for (const item of raw) {
    const parsed = ActionDraftSchema.safeParse(item);
    if (parsed.success) drafts.push(parsed.data);
    else invalid += 1;
  }
  return { drafts, invalid };
}

/**
 * Tenant scope filter for `MilestoneCascade.user`. Returns:
 *   - `undefined` for super-admins (whole platform)
 *   - `{ organizationId }` for tenant admins
 *   - `null` to deny (org lookup failed)
 *
 * Pulled out of the inbox helpers because the approve/dismiss routes
 * need the same predicate to refuse cross-tenant id-probes.
 */
export type CascadeScopeFilter =
  | { kind: 'all' } // super-admin
  | { kind: 'org'; organizationId: string } // tenant admin
  | { kind: 'deny' }; // lookup failed / no scope

/**
 * Resolve the cascade-scope filter for a staff user. Super-admin → see all;
 * any other admin → restricted to their organization. Defensive against
 * `getActorOrganizationId` throwing (returns 'deny' so callers render
 * "no cascades" rather than 500ing).
 */
export async function resolveCascadeScope(
  staffUserId: string,
): Promise<CascadeScopeFilter> {
  if (await isSuperAdmin(staffUserId)) return { kind: 'all' };
  try {
    const organizationId = await getActorOrganizationId(staffUserId);
    return { kind: 'org', organizationId };
  } catch {
    return { kind: 'deny' };
  }
}

/**
 * List cascades currently awaiting counselor approval, oldest first. Drives
 * `/admin/agent-inbox`.
 *
 * Tenant scope: super-admins see everything; tenant admins see only their
 * own organization's cascades. Without this filter a non-super tenant admin
 * could see every tenant's pending cascades plus AI-drafted message
 * bodies and learner emails. `isAdmin()` itself is not tenant-aware so
 * the page MUST pass the actor scope.
 *
 * Excludes cascades whose 72h TTL has already elapsed (`expiresAt <= now`).
 * The expire cron runs daily so there's a window of up to 24h where a
 * cascade's status is still 'awaiting_approval' but the approve endpoint
 * will refuse to send it. Showing those cards in the inbox would let an
 * admin click Approve and get a 409 — actionable-looking but not
 * actionable. Filtering at the query layer keeps both surfaces honest.
 */
export async function listAwaitingApprovalCascades(opts?: {
  limit?: number;
  scope?: CascadeScopeFilter;
}): Promise<CascadeCardData[]> {
  if (opts?.scope?.kind === 'deny') return [];
  const userFilter =
    opts?.scope?.kind === 'org'
      ? { user: { organizationId: opts.scope.organizationId } }
      : {};
  const rows = await prisma.milestoneCascade.findMany({
    where: {
      status: 'awaiting_approval',
      expiresAt: { gt: new Date() },
      ...userFilter,
    },
    orderBy: { createdAt: 'asc' },
    take: opts?.limit ?? 100,
    include: {
      user: { select: { fullName: true, email: true } },
    },
  });

  return rows.map((row) => {
    const { drafts, invalid } = parseDrafts(row.drafts);
    return {
      id: row.id,
      userId: row.userId,
      userFullName: row.user?.fullName ?? null,
      userEmail: row.user?.email ?? '(unknown)',
      milestoneType: row.milestoneType,
      milestoneRef: row.milestoneRef,
      programSlug: row.programSlug,
      counselorBrief: row.counselorBrief,
      drafts,
      invalidDraftCount: invalid,
      draftModel: row.draftModel,
      draftPromptVersion: row.draftPromptVersion,
      draftedAt: row.draftedAt,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
    };
  });
}

/**
 * Fast count for nav badges. Cheaper than the full list when we just need a
 * number ("Agent Inbox · 3"). Mirrors the list filter — past-TTL cascades
 * are not actionable, so they're not counted in the badge either. Also
 * tenant-scoped per the actor's CascadeScopeFilter.
 */
export async function countAwaitingApprovalCascades(opts?: {
  scope?: CascadeScopeFilter;
}): Promise<number> {
  if (opts?.scope?.kind === 'deny') return 0;
  const userFilter =
    opts?.scope?.kind === 'org'
      ? { user: { organizationId: opts.scope.organizationId } }
      : {};
  return prisma.milestoneCascade.count({
    where: {
      status: 'awaiting_approval',
      expiresAt: { gt: new Date() },
      ...userFilter,
    },
  });
}

/**
 * Single-cascade fetch for the future detail / approve view. Returns null
 * (not throws) when missing — caller decides how to surface "gone".
 */
export async function getCascadeForReview(
  cascadeId: string,
): Promise<CascadeCardData | null> {
  const row = await prisma.milestoneCascade.findUnique({
    where: { id: cascadeId },
    include: {
      user: { select: { fullName: true, email: true } },
    },
  });
  if (!row) return null;
  const { drafts, invalid } = parseDrafts(row.drafts);
  return {
    id: row.id,
    userId: row.userId,
    userFullName: row.user?.fullName ?? null,
    userEmail: row.user?.email ?? '(unknown)',
    milestoneType: row.milestoneType,
    milestoneRef: row.milestoneRef,
    programSlug: row.programSlug,
    counselorBrief: row.counselorBrief,
    drafts,
    invalidDraftCount: invalid,
    draftModel: row.draftModel,
    draftPromptVersion: row.draftPromptVersion,
    draftedAt: row.draftedAt,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  };
}
