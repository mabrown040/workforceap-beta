/**
 * Security headers utility for enhanced protection
 * Provides additional security headers beyond the basic set
 */

export type SecurityHeaders = Record<string, string>;

/**
 * Get enhanced security headers for API responses
 */
export function getSecurityHeaders(rateLimitInfo?: {
  limit: number;
  remaining: number;
  reset: number;
}): SecurityHeaders {
  const headers: SecurityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Download-Options': 'noopen',
    'X-DNS-Prefetch-Control': 'off',
    'X-Permitted-Cross-Domain-Policies': 'none',
  };

  // Add rate limit headers if provided
  if (rateLimitInfo) {
    headers['X-RateLimit-Limit'] = rateLimitInfo.limit.toString();
    headers['X-RateLimit-Remaining'] = rateLimitInfo.remaining.toString();
    headers['X-RateLimit-Reset'] = new Date(rateLimitInfo.reset).toISOString();
  }

  return headers;
}

/**
 * Get security headers for file downloads
 */
export function getDownloadSecurityHeaders(): SecurityHeaders {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-Download-Options': 'noopen',
    'Content-Disposition': 'attachment',
  };
}

/**
 * Get security headers for static assets
 */
export function getStaticAssetSecurityHeaders(): SecurityHeaders {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cache-Control': 'public, max-age=31536000, immutable',
  };
}

/**
 * Security headers for error responses
 */
export function getErrorSecurityHeaders(): SecurityHeaders {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'no-referrer',
  };
}
