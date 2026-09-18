/**
 * Canonical member training destination.
 *
 * `/dashboard/training` is a redirect stub. It used to forward back to
 * `/dashboard`, which made the kit "Resume module" / "Continue training" CTAs
 * a do-loop. Callers should send members to My Program instead.
 */
export const MEMBER_PROGRAM_HREF = '/dashboard/program';
export const LEGACY_TRAINING_STUB_HREF = '/dashboard/training';

/**
 * Rewrite the dead training stub onto My Program, preserving query params
 * (e.g. `?program=` tab selection). Any other href is returned unchanged.
 */
export function resolveMemberProgramHref(href: string | null | undefined): string {
  if (!href) return MEMBER_PROGRAM_HREF;
  const qIndex = href.indexOf('?');
  const path = qIndex === -1 ? href : href.slice(0, qIndex);
  if (path !== LEGACY_TRAINING_STUB_HREF) return href;
  const query = qIndex === -1 ? '' : href.slice(qIndex);
  return `${MEMBER_PROGRAM_HREF}${query}`;
}
