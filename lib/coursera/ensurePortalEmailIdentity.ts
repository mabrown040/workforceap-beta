/**
 * Pure Coursera portal-email identity link (injectable deps).
 * Production wiring lives in `ensurePortalEmailIdentity.server.ts`.
 */

export type EnsurePortalEmailIdentityResult = {
  mappingCreatedOrUpdated: boolean;
  backfill: { courseRowsUpdated: number; badgeRowsUpdated: number };
  xapiReplayed: number;
  reason: string;
};

export type EnsurePortalEmailIdentityDeps = {
  listMappings: (userId: string) => Promise<Array<{ courseraEmail: string | null }>>;
  upsertMapping: (args: {
    userId: string;
    courseraEmail: string;
    source: string;
    notes: string;
    expectedOrganizationId: string | null;
  }) => Promise<unknown>;
  backfill: (
    email: string,
    userId: string,
  ) => Promise<{ courseRowsUpdated: number; badgeRowsUpdated: number }>;
  replayXapi: (args: {
    courseraEmail: string;
  }) => Promise<{ replayed: number }>;
};

export async function ensurePortalEmailIdentityLink(
  args: {
    userId: string;
    email: string | null | undefined;
    orgId?: string | null;
  },
  deps: EnsurePortalEmailIdentityDeps,
): Promise<EnsurePortalEmailIdentityResult> {
  const email = typeof args.email === 'string' ? args.email.trim().toLowerCase() : '';
  if (!email || !email.includes('@')) {
    return {
      mappingCreatedOrUpdated: false,
      backfill: { courseRowsUpdated: 0, badgeRowsUpdated: 0 },
      xapiReplayed: 0,
      reason: 'no valid email',
    };
  }

  const existing = await deps.listMappings(args.userId).catch((err) => {
    console.warn('[ensurePortalEmailIdentity] mapping list failed:', err);
    return [] as Array<{ courseraEmail: string | null }>;
  });

  const hasEmailMapping = existing.some(
    (m) => (m.courseraEmail ?? '').trim().toLowerCase() === email,
  );

  let mappingCreatedOrUpdated = false;
  if (!hasEmailMapping) {
    await deps.upsertMapping({
      userId: args.userId,
      courseraEmail: email,
      source: 'portal-email-auto',
      notes: 'Auto-linked from portal email on dashboard visit',
      expectedOrganizationId: args.orgId ?? null,
    });
    mappingCreatedOrUpdated = true;
  }

  const backfill = await deps.backfill(email, args.userId).catch((err) => {
    console.warn('[ensurePortalEmailIdentity] orphan backfill failed:', err);
    return { courseRowsUpdated: 0, badgeRowsUpdated: 0 };
  });

  const xapiReplay = await deps.replayXapi({ courseraEmail: email }).catch((err) => {
    console.warn('[ensurePortalEmailIdentity] xAPI replay failed:', err);
    return { replayed: 0 };
  });

  return {
    mappingCreatedOrUpdated,
    backfill,
    xapiReplayed: xapiReplay.replayed,
    reason: hasEmailMapping
      ? 'existing mapping; backfill + replay attempted'
      : 'mapping upserted; backfill + replay attempted',
  };
}
