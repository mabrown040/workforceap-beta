import { createHash } from 'node:crypto';

/**
 * Opaque revision for the two resume pointers that define an editor/generation
 * source. The paths themselves stay server-side; clients echo this token when
 * saving so a stale tab cannot overwrite a newer upload or enhanced draft.
 */
export function getResumeProfileRevision(
  originalPath: string | null | undefined,
  enhancedPath: string | null | undefined,
): string {
  return createHash('sha256')
    .update(originalPath ?? '<no-original>')
    .update('\0')
    .update(enhancedPath ?? '<no-enhanced>')
    .digest('hex')
    .slice(0, 24);
}

/** Stable opaque browser-storage scope so empty profiles cannot share drafts. */
export function getResumeDraftOwnerToken(userId: string): string {
  return createHash('sha256')
    .update('resume-draft-owner\0')
    .update(userId)
    .digest('hex')
    .slice(0, 24);
}
