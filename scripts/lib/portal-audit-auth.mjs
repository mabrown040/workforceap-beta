import { existsSync, readFileSync } from 'node:fs';

function clean(value) {
  return typeof value === 'string' ? value.replace(/\r$/, '').trim() : '';
}

export const PORTAL_AUDIT_ROLES = Object.freeze([
  'member',
  'admin',
  'employer',
  'partner',
  'counselor',
]);

function credentialKeys(role) {
  const prefix = `E2E_${role.toUpperCase()}`;
  return {
    email: `${prefix}_EMAIL`,
    password: `${prefix}_PASSWORD`,
  };
}

function stripOptionalQuotes(value) {
  const cleaned = clean(value);
  if (
    cleaned.length >= 2 &&
    ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'")))
  ) {
    return cleaned.slice(1, -1);
  }
  return cleaned;
}

/** Load gitignored local E2E variables without overwriting the caller's shell. */
export function loadPortalAuditEnvFile(filePath, env = process.env) {
  if (!existsSync(filePath)) return { loaded: false, keys: [] };
  const loadedKeys = [];
  for (const line of readFileSync(filePath, 'utf8').split(/\n/)) {
    const trimmed = line.replace(/^\uFEFF/, '').trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    if (!key || env[key]) continue;
    env[key] = stripOptionalQuotes(trimmed.slice(separator + 1));
    loadedKeys.push(key);
  }
  return { loaded: true, keys: loadedKeys };
}

/**
 * Canonical contract: E2E_MEMBER_EMAIL / E2E_MEMBER_PASSWORD.
 * Backward-compatible aliases remain supported so old operator shells and docs
 * do not break immediately.
 */
/** @param {Record<string, string | undefined>} env */
export function resolveMemberPortalCredentials(env = process.env) {
  const canonicalEmail = clean(env.E2E_MEMBER_EMAIL);
  const canonicalPassword = clean(env.E2E_MEMBER_PASSWORD);

  if (canonicalEmail && canonicalPassword) {
    return {
      email: canonicalEmail,
      password: canonicalPassword,
      source: 'canonical',
    };
  }

  const legacyEmail = clean(env.PLAYWRIGHT_MEMBER_EMAIL);
  const legacyPassword = clean(env.PLAYWRIGHT_PORTAL_PASSWORD);

  if (legacyEmail && legacyPassword) {
    return {
      email: legacyEmail,
      password: legacyPassword,
      source: 'legacy',
    };
  }

  return {
    email: '',
    password: '',
    source: 'missing',
  };
}

/** @param {Record<string, string | undefined>} env */
export function hasMemberPortalCredentials(env = process.env) {
  const { email, password } = resolveMemberPortalCredentials(env);
  return Boolean(email && password);
}

/**
 * Resolve one role's dedicated credential pair. Only the member role accepts
 * the historical PLAYWRIGHT_* aliases; no role may inherit another role's pair.
 */
export function resolvePortalRoleCredentials(role, env = process.env) {
  if (!PORTAL_AUDIT_ROLES.includes(role)) {
    throw new TypeError(`Unknown portal audit role: ${role}`);
  }

  if (role === 'member') return resolveMemberPortalCredentials(env);

  const keys = credentialKeys(role);
  const email = clean(env[keys.email]);
  const password = clean(env[keys.password]);
  return {
    email,
    password,
    source: email && password ? 'canonical' : 'missing',
  };
}

/** Validate completeness and ensure the same identity is never reused across roles. */
export function validateDedicatedPortalCredentials(roles, env = process.env) {
  const requestedRoles = [...new Set(roles)];
  const credentials = {};
  const errors = [];
  const emailOwners = new Map();

  for (const role of requestedRoles) {
    const keys = credentialKeys(role);
    const credential = resolvePortalRoleCredentials(role, env);
    const hasEmail = Boolean(credential.email);
    const hasPassword = Boolean(credential.password);
    credentials[role] = credential;

    if (!hasEmail || !hasPassword) {
      errors.push({
        role,
        code: hasEmail || hasPassword ? 'partial_credentials' : 'missing_credentials',
        required: [keys.email, keys.password],
      });
      continue;
    }

    const identity = credential.email.toLowerCase();
    const previousRole = emailOwners.get(identity);
    if (previousRole) {
      errors.push({
        role,
        code: 'reused_identity',
        conflictsWith: previousRole,
        required: [keys.email, keys.password],
      });
    } else {
      emailOwners.set(identity, role);
    }
  }

  return {
    ok: errors.length === 0,
    credentials,
    errors,
  };
}
