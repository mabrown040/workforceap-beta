import { isSuperAdmin } from '@/lib/auth/roles';

/**
 * Where to send a logged-in user who reached an Employer portal page without
 * an Employer record. Super admins go back to the employer selector so they
 * choose an explicit preview context; everyone else gets the public marketing
 * page where they can request access.
 *
 * Use at every redirect site in app/(portal)/employer/**:
 *   if (!ctx) redirect(await unlinkedEmployerHref(user.id));
 *
 * Replaces the pattern `redirect('/employers')` from before #735's P-003
 * fix, which sent super admins doing role-switcher dogfooding to a public
 * marketing page (confusing dead-end). The fix landed on the page.tsx but
 * missed the layout.tsx and 11 sibling routes — this helper keeps the rule
 * a single source of truth.
 */
export async function unlinkedEmployerHref(userId: string): Promise<string> {
  return (await isSuperAdmin(userId)) ? '/admin/employers' : '/employers';
}

/** Same as above for the Partner portal. */
export async function unlinkedPartnerHref(userId: string): Promise<string> {
  return (await isSuperAdmin(userId)) ? '/admin/partners' : '/partners';
}
