function clean(value) {
  return typeof value === 'string' ? value.replace(/\r$/, '').trim() : '';
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