/**
 * Minimal CORS headers for public JSON APIs (health probes, unauthenticated forms).
 * Does not use credentials — Access-Control-Allow-Origin is *.
 */
export function publicApiCorsHeaders(allowMethods: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': allowMethods,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}
