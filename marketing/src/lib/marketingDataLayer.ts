/**
 * GTM dataLayer helper for the static marketing site's React islands.
 * Pushes the same `funnel_event` shape as the portal's
 * lib/analytics/events.ts `trackFunnelEvent`, so GA4/ads triggers configured
 * in the GTM container work identically on both halves of the site.
 */
type DataLayerWindow = Window & { dataLayer?: Record<string, unknown>[] };

export function pushMarketingEvent(payload: { event: string } & Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  try {
    const w = window as DataLayerWindow;
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push(payload);
  } catch {
    /* analytics must never break the page */
  }
}

export function trackQuizFunnel(
  funnel: 'career_quiz' | 'interest_profiler' | 'find_your_path',
  step: 'started' | 'submitted' | 'completed' | 'apply_click' | 'errored',
  extra?: Record<string, unknown>,
): void {
  pushMarketingEvent({ event: 'funnel_event', funnel, funnel_step: step, surface: 'marketing', ...extra });
}
