/**
 * Fail-open / fail-closed decisions when an Upstash limiter instance is null.
 *
 * Split from `lib/rate-limit.ts` so unit tests can pin the matrix without
 * importing that module (it throws on production boot when Upstash is missing
 * and `RATE_LIMIT_ALLOW_MISSING_UPSTASH` is unset).
 *
 * Modes:
 * - `security` — auth/contact/forgot-password. Production fail-closed unless
 *   `RATE_LIMIT_ALLOW_MISSING_UPSTASH=1` (preview/staging opt-out).
 * - `spend` — ElevenLabs voice + LLM tools. Production always fail-closed
 *   when the limiter is missing, even if the allow-missing flag is set.
 *   Unauthenticated voice must not be free/unlimited.
 * - `apply` — apply/member signup conversion. Fail-closed in production when
 *   the allow-missing flag is unset (Phase 5). Also fail-closed when
 *   `WAP_APPLY_RATE_LIMIT_FAIL_CLOSED=1` so operators can close apply without
 *   removing the preview opt-out that keeps other failClosedLimit callers open.
 */

export const ALLOW_MISSING_UPSTASH_ENV = 'RATE_LIMIT_ALLOW_MISSING_UPSTASH';
export const APPLY_FAIL_CLOSED_ENV = 'WAP_APPLY_RATE_LIMIT_FAIL_CLOSED';

export type MissingLimiterMode = 'security' | 'spend' | 'apply';

export type MissingLimiterReason =
  | 'dev-fail-open'
  | 'allow-missing-upstash'
  | 'prod-fail-closed'
  | 'spend-fail-closed'
  | 'apply-env-fail-closed';

export type MissingLimiterDecision = {
  success: boolean;
  remaining?: number;
  reason: MissingLimiterReason;
};

export function isAllowMissingUpstashEnabled(
  raw: string | undefined = process.env[ALLOW_MISSING_UPSTASH_ENV]
): boolean {
  return raw?.trim() === '1';
}

export function isApplyFailClosedEnvEnabled(
  raw: string | undefined = process.env[APPLY_FAIL_CLOSED_ENV]
): boolean {
  return raw?.trim() === '1';
}

export function decideMissingLimiter(args: {
  isProduction: boolean;
  allowMissingUpstash: boolean;
  mode: MissingLimiterMode;
  applyFailClosedEnv: boolean;
}): MissingLimiterDecision {
  if (!args.isProduction) {
    return { success: true, reason: 'dev-fail-open' };
  }

  switch (args.mode) {
    case 'spend':
      return { success: false, remaining: 0, reason: 'spend-fail-closed' };
    case 'apply':
      if (args.applyFailClosedEnv) {
        return { success: false, remaining: 0, reason: 'apply-env-fail-closed' };
      }
      if (args.allowMissingUpstash) {
        return { success: true, reason: 'allow-missing-upstash' };
      }
      return { success: false, remaining: 0, reason: 'prod-fail-closed' };
    case 'security':
      if (args.allowMissingUpstash) {
        return { success: true, reason: 'allow-missing-upstash' };
      }
      return { success: false, remaining: 0, reason: 'prod-fail-closed' };
    default: {
      const _exhaustive: never = args.mode;
      return _exhaustive;
    }
  }
}
