/**
 * Workspace email provider abstraction.
 *
 * Real provisioning of @workforceap.org mailboxes happens through whatever
 * mail host is configured (Google Workspace, Microsoft 365, etc.). This file
 * defines the interface that surface code (admin UI + API) calls and ships a
 * Noop stub so we can exercise the flow locally without real credentials.
 *
 * Selection happens via the `WORKSPACE_EMAIL_PROVIDER` env var. Real provider
 * implementations are intentionally unimplemented — see docs/WORKSPACE_EMAIL.md
 * for what's required to wire them up. No secrets in the repo.
 */

export type WorkspaceEmailProviderId = 'google' | 'microsoft' | 'noop';

export const WORKSPACE_EMAIL_DOMAIN = 'workforceap.org';

export type WorkspaceEmailUserRef = {
  id: string;
  email: string;
  fullName: string | null;
  workspaceEmail: string | null;
};

export type ProvisionInput = {
  user: WorkspaceEmailUserRef;
  /** Optional override for the local-part. Defaults to a slug derived from fullName/email. */
  requestedLocalPart?: string;
};

export type ProvisionResult = {
  workspaceEmail: string;
  success: boolean;
  /** Provider-supplied error message when success is false. */
  error?: string;
};

export type RevokeInput = {
  user: WorkspaceEmailUserRef;
};

export type RevokeResult = {
  success: boolean;
  error?: string;
};

export interface WorkspaceEmailProvider {
  readonly id: WorkspaceEmailProviderId;
  provision(input: ProvisionInput): Promise<ProvisionResult>;
  revoke(input: RevokeInput): Promise<RevokeResult>;
}

/**
 * Build a safe local-part from a requested value or the user's name/email.
 * Lowercases, strips non-[a-z0-9.-], collapses repeats, and trims separators.
 */
export function deriveLocalPart(input: ProvisionInput): string {
  const raw =
    input.requestedLocalPart ??
    (input.user.fullName ? input.user.fullName.replace(/\s+/g, '.') : input.user.email.split('@')[0] ?? input.user.id);

  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '.')
    .replace(/\.{2,}/g, '.')
    .replace(/^[.\-]+|[.\-]+$/g, '');

  return cleaned || `user.${input.user.id.slice(0, 8)}`;
}

/**
 * Stub provider: doesn't talk to any mail host. Logs the intended action and
 * returns a placeholder address so local development and tests work.
 */
export class NoopWorkspaceEmailProvider implements WorkspaceEmailProvider {
  readonly id = 'noop' as const;

  async provision(input: ProvisionInput): Promise<ProvisionResult> {
    const localPart = deriveLocalPart(input);
    const workspaceEmail = `${localPart}@${WORKSPACE_EMAIL_DOMAIN}`;
    console.log(
      `[workspace-email:noop] provision requested user=${input.user.id} -> ${workspaceEmail} (no real mailbox created)`,
    );
    return { workspaceEmail, success: true };
  }

  async revoke(input: RevokeInput): Promise<RevokeResult> {
    console.log(
      `[workspace-email:noop] revoke requested user=${input.user.id} previousEmail=${input.user.workspaceEmail ?? '(none)'}`,
    );
    return { success: true };
  }
}

function readProviderId(): WorkspaceEmailProviderId {
  const configuredProvider = process.env.WORKSPACE_EMAIL_PROVIDER;
  if (configuredProvider === undefined) return 'noop';

  const raw = configuredProvider.toLowerCase();
  if (raw === 'google' || raw === 'microsoft' || raw === 'noop') return raw;
  throw new Error(`Invalid WORKSPACE_EMAIL_PROVIDER: ${configuredProvider}. Expected google, microsoft, or noop.`);
}

/**
 * Pick a provider implementation from env. Only `noop` is implemented today.
 * Throws a clear error for `google`/`microsoft` so future setup is obvious —
 * those require real credentials configured outside the repo (Vercel env).
 */
export function getWorkspaceEmailProvider(): WorkspaceEmailProvider {
  const id = readProviderId();
  switch (id) {
    case 'noop':
      return new NoopWorkspaceEmailProvider();
    case 'google':
      throw new Error(
        'WORKSPACE_EMAIL_PROVIDER=google is not implemented. Wire up the Google Workspace Admin SDK Directory API and supply credentials via env (see docs/WORKSPACE_EMAIL.md).',
      );
    case 'microsoft':
      throw new Error(
        'WORKSPACE_EMAIL_PROVIDER=microsoft is not implemented. Wire up Microsoft Graph user provisioning and supply credentials via env (see docs/WORKSPACE_EMAIL.md).',
      );
    default: {
      const _exhaustive: never = id;
      throw new Error(`Unknown WORKSPACE_EMAIL_PROVIDER: ${String(_exhaustive)}`);
    }
  }
}
