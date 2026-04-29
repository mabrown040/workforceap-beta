/**
 * Rate limiting monitoring and abuse detection
 * Tracks patterns that might indicate coordinated attacks or abuse
 */

import { logRateLimitExceeded, logSuspiciousRequest } from './securityLogger';

interface RateLimitEvent {
  ip: string;
  endpoint: string;
  timestamp: number;
  userId?: string;
}

// In-memory storage for abuse pattern detection (in production, use Redis)
const rateLimitEvents: RateLimitEvent[] = [];
const MAX_EVENTS_STORED = 10000;
const ABUSE_DETECTION_WINDOW = 5 * 60 * 1000; // 5 minutes

/**
 * Monitor rate limit events for abuse patterns
 */
export function monitorRateLimit(event: RateLimitEvent): void {
  // Store event
  rateLimitEvents.push(event);
  
  // Clean old events
  const cutoff = Date.now() - ABUSE_DETECTION_WINDOW;
  while (rateLimitEvents.length > 0 && rateLimitEvents[0].timestamp < cutoff) {
    rateLimitEvents.shift();
  }
  
  // Keep only recent events to prevent memory issues
  if (rateLimitEvents.length > MAX_EVENTS_STORED) {
    rateLimitEvents.splice(0, rateLimitEvents.length - MAX_EVENTS_STORED);
  }
  
  // Check for abuse patterns
  checkAbusePatterns(event);
}

/**
 * Check for coordinated attack patterns
 */
function checkAbusePatterns(currentEvent: RateLimitEvent): void {
  const recentEvents = rateLimitEvents.filter(
    e => e.timestamp > Date.now() - ABUSE_DETECTION_WINDOW
  );
  
  // Pattern 1: Multiple IPs hitting same endpoint (distributed attack)
  const uniqueIps = new Set(recentEvents.map(e => e.ip));
  const endpointEvents = recentEvents.filter(e => e.endpoint === currentEvent.endpoint);
  
  if (uniqueIps.size > 10 && endpointEvents.length > 50) {
    logSuspiciousRequest(currentEvent.endpoint, currentEvent.ip, {
      pattern: 'distributed_rate_limit_attack',
      uniqueIps: uniqueIps.size,
      totalEvents: endpointEvents.length,
      endpoint: currentEvent.endpoint,
    });
  }
  
  // Pattern 2: Single IP cycling through endpoints (enumeration attack)
  const ipEndpoints = recentEvents
    .filter(e => e.ip === currentEvent.ip)
    .map(e => e.endpoint);
  const uniqueEndpoints = new Set(ipEndpoints);
  
  if (uniqueEndpoints.size > 5 && ipEndpoints.length > 20) {
    logSuspiciousRequest(currentEvent.endpoint, currentEvent.ip, {
      pattern: 'endpoint_enumeration_attack',
      endpointsAccessed: Array.from(uniqueEndpoints),
      totalRequests: ipEndpoints.length,
    });
  }
  
  // Pattern 3: Rapid successive hits from same IP
  const ipRecentEvents = recentEvents.filter(e => e.ip === currentEvent.ip);
  if (ipRecentEvents.length > 10) {
    const timeRange = ipRecentEvents[ipRecentEvents.length - 1].timestamp - ipRecentEvents[0].timestamp;
    const rate = ipRecentEvents.length / (timeRange / 1000); // requests per second
    
    if (rate > 5) { // More than 5 requests per second
      logSuspiciousRequest(currentEvent.endpoint, currentEvent.ip, {
        pattern: 'rapid_fire_attack',
        rate: Math.round(rate * 100) / 100,
        requests: ipRecentEvents.length,
        timeWindow: Math.round(timeRange / 1000),
      });
    }
  }
}

/**
 * Get abuse statistics for monitoring dashboards
 */
export function getAbuseStatistics(timeWindow: number = 3600000): { // 1 hour default
  totalRateLimits: number;
  uniqueIps: number;
  topEndpoints: Array<{ endpoint: string; count: number }>;
  suspiciousPatterns: number;
} {
  const cutoff = Date.now() - timeWindow;
  const recentEvents = rateLimitEvents.filter(e => e.timestamp > cutoff);
  
  const endpointCounts = new Map<string, number>();
  const ipSet = new Set<string>();
  
  for (const event of recentEvents) {
    endpointCounts.set(event.endpoint, (endpointCounts.get(event.endpoint) || 0) + 1);
    ipSet.add(event.ip);
  }
  
  const topEndpoints = Array.from(endpointCounts.entries())
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([endpoint, count]) => ({ endpoint, count }));
  
  // Count suspicious patterns (rough estimate based on recent analysis)
  let suspiciousPatterns = 0;
  const uniqueIps = new Set(recentEvents.map(e => e.ip));
  
  for (const ip of uniqueIps) {
    const ipEvents = recentEvents.filter(e => e.ip === ip);
    const uniqueEndpoints = new Set(ipEvents.map(e => e.endpoint));
    
    if (uniqueEndpoints.size > 3 || ipEvents.length > 15) {
      suspiciousPatterns++;
    }
  }
  
  return {
    totalRateLimits: recentEvents.length,
    uniqueIps: ipSet.size,
    topEndpoints,
    suspiciousPatterns,
  };
}
