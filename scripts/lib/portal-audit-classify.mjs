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

function canonicalPathname(urlOrPath) {
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

  const stuckLogin = row.finalUrl.includes('/login');
  const unexpectedRedirect = canonicalPathname(row.finalUrl) !== canonicalPathname(row.path);
  const routeErrorFallback =
    hasMarker(normalizedBody, ROUTE_ERROR_MARKERS) || hasMarker(normalizedTitle, ROUTE_ERROR_MARKERS);
  const notFoundFallback =
    hasMarker(normalizedBody, NOT_FOUND_MARKERS) || hasMarker(normalizedTitle, NOT_FOUND_MARKERS);
  const consoleErrorCount = row.consoleErrors.length;
  const pageErrorCount = row.pageErrors.length;
  const hasDocumentErrorStatus = documentStatus !== null && documentStatus >= 400;

  if (stuckLogin) failureReasons.push('login_redirect');
  if (unexpectedRedirect) failureReasons.push('unexpected_redirect');
  if (hasDocumentErrorStatus) failureReasons.push('document_error_status');
  if (routeErrorFallback) failureReasons.push('route_error_fallback');
  if (notFoundFallback) failureReasons.push('not_found_fallback');
  if (consoleErrorCount > 0) failureReasons.push('console_errors');
  if (pageErrorCount > 0) failureReasons.push('page_errors');

  return {
    ...row,
    documentStatus,
    stuckLogin,
    unexpectedRedirect,
    routeErrorFallback,
    notFoundFallback,
    consoleErrorCount,
    pageErrorCount,
    ok: failureReasons.length === 0,
    failureReasons,
  };
}