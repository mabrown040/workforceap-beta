import { AsyncLocalStorage } from 'async_hooks';

/**
 * PostgreSQL RLS roles recognized by the GUC middleware and migration
 * `20260513040000_add_rls_policies`.
 *
 * The migration defines helper functions (e.g. `get_current_role()`,
 * `is_current_admin()`) that read these values from GUC variables.
 */
export type RlsRole =
  | 'member'
  | 'admin'
  | 'counselor'
  | 'partner'
  | 'employer'
  | 'super_admin'
  | 'anonymous'
  | 'system';

/**
 * Context stored in AsyncLocalStorage and translated to PostgreSQL GUCs
 * via Prisma middleware.
 *
 * Prerequisites (migration):
 *   SET LOCAL app.current_user_id = '<uuid>';
 *   SET LOCAL app.current_org_id  = '<uuid>';
 *   SET LOCAL app.current_role    = 'member|admin|...';
 *   SET LOCAL app.current_employer_id = '<uuid>'; -- if applicable
 *   SET LOCAL app.current_partner_id  = '<uuid>'; -- if applicable
 */
export interface GucContext {
  userId: string | null;
  orgId: string | null;
  role: RlsRole;
  employerId?: string | null;
  partnerId?: string | null;
}

const gucContextStorage = new AsyncLocalStorage<GucContext>();

/** Read the active GUC context for the current async call stack. */
export function getGucContext(): GucContext | undefined {
  return gucContextStorage.getStore();
}

/**
 * Run `fn` with the given GUC context. Every Prisma query executed inside
 * `fn` (on the same async call stack) will have the corresponding
 * PostgreSQL GUCs set via `SET LOCAL`.
 */
export function runWithGucContext<T>(context: GucContext, fn: () => Promise<T>): Promise<T> {
  return gucContextStorage.run(context, fn);
}

/** Map WAP profile roles to RLS policy roles. */
export function mapProfileRoleToRlsRole(profileRole: string | null | undefined): RlsRole {
  switch (profileRole) {
    case 'member':
      return 'member';
    case 'admin':
      return 'admin';
    case 'counselor':
      return 'counselor';
    case 'partner':
      return 'partner';
    case 'employer':
      return 'employer';
    case 'super_admin':
      return 'super_admin';
    default:
      return 'anonymous';
  }
}

/**
 * Build a GucContext from resolved auth data.
 * For unauthenticated requests pass `null` for userId — this yields the
 * 'anonymous' role with empty userId/orgId.
 */
export function buildGucContext(options: {
  userId: string | null;
  orgId: string | null;
  profileRole?: string | null;
  employerId?: string | null;
  partnerId?: string | null;
}): GucContext {
  return {
    userId: options.userId ?? null,
    orgId: options.orgId ?? null,
    role: mapProfileRoleToRlsRole(options.profileRole),
    employerId: options.employerId ?? null,
    partnerId: options.partnerId ?? null,
  };
}

/** Anonymous context for public/unauthenticated routes. */
export const ANONYMOUS_GUC_CONTEXT: GucContext = {
  userId: null,
  orgId: null,
  role: 'anonymous',
};

/** System context for cron jobs, webhooks, and service accounts. */
export const SYSTEM_GUC_CONTEXT: GucContext = {
  userId: null,
  orgId: null,
  role: 'system',
};

/**
 * Internal AsyncLocalStorage used by the Prisma client to skip redundant
 * GUC-setting when a query is already running inside an explicit
 * `$transaction` (array or callback) where GUCs were injected at the
 * transaction boundary.
 */
export const inTransactionStorage = new AsyncLocalStorage<boolean>();
