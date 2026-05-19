/**
 * Marketing attribution capture for the apply / signup / login funnels.
 *
 * What lands here: UTM parameters (`utm_source`, `utm_medium`,
 * `utm_campaign`, `utm_content`, `utm_term`) plus `document.referrer`.
 *
 * Storage: sessionStorage (one key per signal). Mirrors the existing
 * `apply_partner_ref` pattern in `lib/apply/applyReferralCapture.ts` —
 * intentionally session-scoped so multi-tab visitors don't cross-pollute.
 *
 * Read pattern: components that POST signup read these via
 * `readMarketingAttribution()` and forward to the server, which stores
 * the values on the `apply_signup_completed` MemberEvent metadata so
 * we can attribute conversions to a paid campaign or organic referrer.
 */

export const UTM_SESSION_KEYS = {
  source: 'wa_utm_source',
  medium: 'wa_utm_medium',
  campaign: 'wa_utm_campaign',
  content: 'wa_utm_content',
  term: 'wa_utm_term',
  referrer: 'wa_referrer',
} as const;

export type MarketingAttribution = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  referrer?: string;
};

/** Read all captured attribution from sessionStorage. SSR-safe. */
export function readMarketingAttribution(): MarketingAttribution {
  if (typeof window === 'undefined') return {};
  const get = (k: string): string | undefined => {
    try {
      const v = sessionStorage.getItem(k)?.trim();
      return v && v.length > 0 ? v : undefined;
    } catch {
      return undefined;
    }
  };
  return {
    utmSource: get(UTM_SESSION_KEYS.source),
    utmMedium: get(UTM_SESSION_KEYS.medium),
    utmCampaign: get(UTM_SESSION_KEYS.campaign),
    utmContent: get(UTM_SESSION_KEYS.content),
    utmTerm: get(UTM_SESSION_KEYS.term),
    referrer: get(UTM_SESSION_KEYS.referrer),
  };
}

/** Clear all attribution keys after a successful signup. */
export function clearMarketingAttribution(): void {
  if (typeof window === 'undefined') return;
  try {
    for (const k of Object.values(UTM_SESSION_KEYS)) {
      sessionStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }
}
