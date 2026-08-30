const UNAUTHENTICATED_BROWSER_NAVIGATION_GET_PATHS = new Set([
  '/api/member/coursera/launch',
]);

/**
 * Some GET endpoints under the tenant API prefixes are real browser
 * navigation targets. Their route handlers own the signed-out redirect so
 * they can preserve the original destination in `redirectTo`.
 *
 * Every other tenant API request keeps the middleware JSON 401 backstop.
 */
export function isUnauthenticatedBrowserNavigationApiPath(
  method: string,
  pathname: string,
): boolean {
  return method.toUpperCase() === 'GET'
    && UNAUTHENTICATED_BROWSER_NAVIGATION_GET_PATHS.has(pathname);
}
