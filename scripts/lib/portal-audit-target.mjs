export const PORTAL_AUDIT_MODES = Object.freeze([
  'local',
  'isolated_preview',
  'production_canary',
]);

export const PRODUCTION_PORTAL_ORIGINS = Object.freeze([
  'https://workforceap.org',
  'https://www.workforceap.org',
]);

/** Return only schema-supported audit modes; all other input is represented as null. */
export function normalizePortalAuditMode(mode) {
  const normalizedMode = typeof mode === 'string' ? mode.trim().toLowerCase() : '';
  return PORTAL_AUDIT_MODES.includes(normalizedMode) ? normalizedMode : null;
}

function parseOriginOnly(value, label) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return { ok: false, error: `${label}_missing` };

  let url;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: `${label}_invalid_url` };
  }

  if (url.username || url.password) {
    return { ok: false, error: `${label}_embedded_credentials` };
  }
  if (url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) {
    return { ok: false, error: `${label}_must_be_origin_only` };
  }

  return { ok: true, url, origin: url.origin };
}

function isLoopbackHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

/**
 * Resolve and validate the browser target before any credential file is read,
 * credential pair is resolved, or Playwright browser is launched.
 */
export function validatePortalAuditTarget({
  baseURL,
  mode,
  trustedPreviewOrigin = '',
}) {
  const validatedMode = normalizePortalAuditMode(mode);
  const errors = [];

  if (!validatedMode) {
    errors.push('unsupported_audit_mode');
  }

  const target = parseOriginOnly(baseURL, 'target');
  if (!target.ok) errors.push(target.error);

  let targetClass = null;
  if (target.ok && validatedMode === 'local') {
    if (!isLoopbackHost(target.url.hostname)) errors.push('local_target_must_be_loopback');
    if (!['http:', 'https:'].includes(target.url.protocol)) {
      errors.push('local_target_protocol_not_allowed');
    }
    targetClass = 'local_loopback';
  }

  if (target.ok && validatedMode === 'isolated_preview') {
    const trusted = parseOriginOnly(trustedPreviewOrigin, 'trusted_preview');
    if (!trusted.ok) {
      errors.push(trusted.error);
    } else {
      if (trusted.url.protocol !== 'https:') errors.push('trusted_preview_must_use_https');
      if (target.origin !== trusted.origin) errors.push('target_does_not_match_trusted_preview');
    }
    if (target.url.protocol !== 'https:') errors.push('preview_target_must_use_https');
    if (PRODUCTION_PORTAL_ORIGINS.includes(target.origin)) {
      errors.push('preview_target_must_not_be_production');
    }
    targetClass = 'isolated_preview';
  }

  if (target.ok && validatedMode === 'production_canary') {
    if (!PRODUCTION_PORTAL_ORIGINS.includes(target.origin)) {
      errors.push('production_target_not_allowlisted');
    }
    targetClass = 'production';
  }

  return {
    ok: errors.length === 0,
    mode: validatedMode,
    origin: target.ok ? target.origin : null,
    targetClass,
    errors: [...new Set(errors)],
  };
}

export function formatPortalAuditTargetErrors(validation) {
  return `Portal audit target rejected: ${(validation?.errors ?? ['unknown_target_error']).join(', ')}`;
}
