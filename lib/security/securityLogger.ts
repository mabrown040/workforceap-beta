/**
 * Security event logging for monitoring and incident response
 * Logs security-relevant events without exposing sensitive data
 */

export type SecurityEventType = 
  | 'rate_limit_exceeded'
  | 'authentication_failed' 
  | 'authorization_denied'
  | 'suspicious_request'
  | 'file_upload_blocked'
  | 'token_validation_failed'
  | 'mfa_enrollment_failed'
  | 'mfa_verification_failed';

export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: string;
  ip?: string;
  userId?: string;
  endpoint: string;
  details?: Record<string, unknown>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Log security events for monitoring and alerting
 * Sanitizes data to prevent logging sensitive information
 */
export function logSecurityEvent(event: SecurityEvent): void {
  const sanitizedEvent = {
    ...event,
    // Sanitize IP (log first 3 octets only)
    ip: event.ip ? event.ip.split('.').slice(0, 3).join('.') + '.xxx' : undefined,
    // Sanitize user agent if present in details
    details: event.details ? sanitizeSecurityDetails(event.details) : undefined,
  };

  // Log to console for now - in production, send to security monitoring service
  console.log(`[SECURITY] ${event.type}:`, JSON.stringify(sanitizedEvent));

  // TODO: In production, send to:
  // - Security monitoring service (Datadog, Sentry, etc.)
  // - SIEM system for analysis
  // - Alerting system for high-severity events
}

/**
 * Sanitize security event details to prevent logging sensitive data
 */
function sanitizeSecurityDetails(details: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...details };
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  // Sanitize email addresses (domain only)
  if (typeof sanitized.email === 'string') {
    const email = sanitized.email as string;
    const domain = email.split('@')[1];
    sanitized.email = `[REDACTED]@${domain}`;
  }
  
  return sanitized;
}

/**
 * Helper functions for common security events
 */
export function logRateLimitExceeded(
  endpoint: string,
  ip?: string,
  userId?: string,
  details?: Record<string, unknown>
): void {
  logSecurityEvent({
    type: 'rate_limit_exceeded',
    timestamp: new Date().toISOString(),
    ip,
    userId,
    endpoint,
    details,
    severity: 'medium',
  });
}

export function logAuthenticationFailed(
  endpoint: string,
  ip?: string,
  details?: Record<string, unknown>
): void {
  logSecurityEvent({
    type: 'authentication_failed',
    timestamp: new Date().toISOString(),
    ip,
    endpoint,
    details,
    severity: 'medium',
  });
}

export function logAuthorizationDenied(
  endpoint: string,
  userId?: string,
  details?: Record<string, unknown>
): void {
  logSecurityEvent({
    type: 'authorization_denied',
    timestamp: new Date().toISOString(),
    userId,
    endpoint,
    details,
    severity: 'high',
  });
}

export function logSuspiciousRequest(
  endpoint: string,
  ip?: string,
  details?: Record<string, unknown>
): void {
  logSecurityEvent({
    type: 'suspicious_request',
    timestamp: new Date().toISOString(),
    ip,
    endpoint,
    details,
    severity: 'high',
  });
}

export function logFileUploadBlocked(
  endpoint: string,
  ip?: string,
  userId?: string,
  details?: Record<string, unknown>
): void {
  logSecurityEvent({
    type: 'file_upload_blocked',
    timestamp: new Date().toISOString(),
    ip,
    userId,
    endpoint,
    details,
    severity: 'medium',
  });
}
