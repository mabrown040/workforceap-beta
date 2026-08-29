const ROUTE_ERROR_MARKERS = [
  'the portal hit an unexpected error',
  'the member dashboard hit an unexpected error',
  'the counselor portal hit an unexpected error',
  'the employer portal hit an unexpected error',
  'the partner portal hit an unexpected error',
  'the admin panel hit an unexpected error',
  'we couldn\'t load the application',
  'something went wrong',
  'please try again. if it keeps happening, contact',
];

const NOT_FOUND_MARKERS = [
  'page not found',
  'the page you’re looking for doesn’t exist or may have been moved.',
  'the page you\'re looking for doesn\'t exist or may have been moved.',
];

function normalize(value) {
  return typeof value === 'string' ? value.toLowerCase().replace(/\s+/g, ' ').trim() : '';
}

function hasMarker(bodyText, markers) {
  return markers.some((marker) => bodyText.includes(marker));
}

export function canonicalPathname(urlOrPath) {
  const candidate = typeof urlOrPath === 'string' ? urlOrPath : '';
  let pathname = candidate;

  try {
    pathname = new URL(candidate).pathname;
  } catch {
    pathname = candidate.split('?')[0] || '';
  }

  const parts = pathname.split('/').filter(Boolean);
  if (parts.length > 0 && /^[a-z]{2}$/i.test(parts[0])) {
    const withoutLocale = `/${parts.slice(1).join('/')}`;
    return withoutLocale === '' ? '/' : withoutLocale;
  }

  return pathname || '/';
}

export function classifyPortalAuditRow(row) {
  const normalizedBody = normalize(row.bodyText);
  const normalizedTitle = normalize(row.title);
  const documentStatus = Number.isFinite(row.documentStatus) ? row.documentStatus : null;
  const failureReasons = [];

  const finalPathname = canonicalPathname(row.finalUrl);
  const requestedPathname = canonicalPathname(row.path);
  const sectionRoot = canonicalPathname(row.sectionRoot ?? '/');
  const stuckLogin = finalPathname === '/login' || finalPathname.startsWith('/login/');
  const wrongRoleRedirect =
    sectionRoot !== '/' &&
    finalPathname !== sectionRoot &&
    !finalPathname.startsWith(`${sectionRoot}/`);
  const unexpectedRedirect = finalPathname !== requestedPathname;
  const requestedQueryVariant = typeof row.path === 'string' && row.path.includes('?');
  const queryVariantMismatch = requestedQueryVariant && row.queryVariantMatched !== true;
  const routeErrorFallback =
    hasMarker(normalizedBody, ROUTE_ERROR_MARKERS) || hasMarker(normalizedTitle, ROUTE_ERROR_MARKERS);
  const notFoundFallback =
    hasMarker(normalizedBody, NOT_FOUND_MARKERS) || hasMarker(normalizedTitle, NOT_FOUND_MARKERS);
  const consoleErrorCount = row.consoleErrors?.length ?? 0;
  const pageErrorCount = row.pageErrors?.length ?? 0;
  const hasDocumentErrorStatus = documentStatus !== null && documentStatus >= 400;
  const h1Count = Number.isFinite(row.h1Count) ? row.h1Count : 0;
  const appReady = row.appReady === true;
  const horizontalOverflowPx = Number.isFinite(row.horizontalOverflowPx)
    ? Math.max(0, row.horizontalOverflowPx)
    : 0;
  const unnamedInteractiveControls = Array.isArray(row.unnamedInteractiveControls)
    ? row.unnamedInteractiveControls
    : [];

  if (stuckLogin) failureReasons.push('login_redirect');
  if (wrongRoleRedirect) failureReasons.push('wrong_role_redirect');
  if (unexpectedRedirect) failureReasons.push('unexpected_redirect');
  if (queryVariantMismatch) failureReasons.push('query_variant_mismatch');
  if (hasDocumentErrorStatus) failureReasons.push('document_error_status');
  if (routeErrorFallback) failureReasons.push('route_error_fallback');
  if (notFoundFallback) failureReasons.push('not_found_fallback');
  if (consoleErrorCount > 0) failureReasons.push('console_errors');
  if (pageErrorCount > 0) failureReasons.push('page_errors');
  if (horizontalOverflowPx > 1) failureReasons.push('horizontal_overflow');
  if (!appReady) failureReasons.push('app_not_ready');
  if (h1Count === 0) failureReasons.push('missing_h1');
  if (h1Count > 1) failureReasons.push('multiple_h1');
  if (unnamedInteractiveControls.length > 0) {
    failureReasons.push('unnamed_interactive_controls');
  }

  const { bodyText: _bodyText, ...safeRow } = row;

  return {
    ...safeRow,
    documentStatus,
    finalPathname,
    requestedPathname,
    stuckLogin,
    wrongRoleRedirect,
    unexpectedRedirect,
    queryVariantMatched: row.queryVariantMatched === true,
    queryVariantMismatch,
    routeErrorFallback,
    notFoundFallback,
    consoleErrorCount,
    pageErrorCount,
    appReady,
    h1Count,
    horizontalOverflowPx,
    unnamedInteractiveControls,
    ok: failureReasons.length === 0,
    failureReasons,
  };
}
