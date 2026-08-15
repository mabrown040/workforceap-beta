/**
 * The `apply_eligibility` hand-off between apply step 1 and steps 2/3.
 *
 * Step 1 (`app/apply/ApplyEligibilityClient.tsx`) writes it; the results page
 * and the create-account form read it and post it to `/api/apply/signup`.
 * It was three ad-hoc `sessionStorage.getItem(...) ?? localStorage.getItem(...)`
 * call sites with no expiry and no owner check, which on the funnel's normal
 * device — a shared school lab machine — is a cross-student PII leak: student A
 * abandons at step 2, student B finishes on the same computer and inherits A's
 * age band, county, school and (Phase B4) A's PARENT's name, email and phone,
 * written onto B's profile with `isMinor: true` and returned in B's own GDPR
 * export.
 *
 * Two rules, both enforced here so no call site can forget one:
 *
 *  1. TTL. The localStorage mirror carries a `savedAt` stamp and expires after
 *     7 days — the same window `readDraft` already applies to the step-1 draft.
 *     A stale payload is deleted from BOTH stores on read, not just ignored.
 *  2. OWNERSHIP. `eligibilityPayloadMatchesEmail` compares the stored email to
 *     the address the person at the keyboard actually typed. Callers must run
 *     it before using anything out of the payload.
 *
 * WHY THE MIRROR STILL CARRIES THE GUARDIAN FIELDS. Dropping them from
 * localStorage (sessionStorage only) would close the leak by construction, but
 * it also breaks the documented finish-later-in-a-new-tab path: sessionStorage
 * is per-tab, so a minor who resumes in a new tab would arrive at step 3 with
 * no guardian, and — now that the server requires one (Phase B4 hardening) —
 * get a 400 they cannot fix without redoing step 1, with the guardian inputs
 * three screens behind them. Keeping the fields under a TTL plus an ownership
 * check preserves the resume path and still gives student B nothing: their
 * typed email will not match student A's stored one.
 *
 * Browser-only, dependency-free, and deliberately not a React hook so it is
 * unit-testable on its own.
 */

/** localStorage/sessionStorage key. Unchanged so in-flight payloads still resolve. */
export const APPLY_ELIGIBILITY_KEY = 'apply_eligibility';

/** Same 7 days `readDraft` applies to `apply_flow_draft_v1`. */
export const APPLY_ELIGIBILITY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type ApplyEligibilityPayload = {
  /** ISO timestamp written by step 1; drives the TTL below. */
  savedAt?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  ageGroup?: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
  /** @deprecated single-select legacy; kept so old payloads still deserialize. */
  primaryBarrier?: string;
  primaryBarriers?: string[];
  q1?: 'yes' | 'no';
  q2?: 'yes' | 'no';
  q3?: 'yes' | 'no';
  qualifies?: boolean;
  yesCount?: number;
  /** School-partner variant (Phase B4). Absent for organic/paid. */
  variant?: 'school';
  /** Partner slug, so a new-tab resume can still attribute the application. */
  schoolSlug?: string;
  gradeLevel?: string;
  /**
   * The enrollment affirmation, as made in the submitting session. It is
   * deliberately absent from the step-1 DRAFT (`ApplyFlowDraftV1`): an
   * affirmation must never be restored from storage and re-submitted by
   * somebody who did not make it.
   */
  schoolAttestation?: boolean;
  studentId?: string;
  guardianName?: string;
  guardianEmail?: string;
  guardianPhone?: string;
};

function normalizeEmail(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

/**
 * True when the stored payload was written by the person now typing.
 *
 * A payload with NO email cannot be shown to belong to anybody, so it fails —
 * step 1 has always stored the email, so the only payloads without one are
 * corrupt or hand-crafted.
 */
export function eligibilityPayloadMatchesEmail(
  payload: ApplyEligibilityPayload | null | undefined,
  typedEmail: string | null | undefined
): boolean {
  const stored = normalizeEmail(payload?.email);
  const typed = normalizeEmail(typedEmail);
  if (!stored || !typed) return false;
  return stored === typed;
}

function isExpired(payload: ApplyEligibilityPayload): boolean {
  // Lenient about a MISSING stamp, exactly like `readDraft`: payloads written
  // by the build before this one have none, and expiring them would drop a
  // mid-funnel applicant back to "start over" during the deploy window. Every
  // payload written from here on carries one.
  if (typeof payload.savedAt !== 'string') return false;
  const saved = Date.parse(payload.savedAt);
  if (!Number.isFinite(saved)) return false;
  return Date.now() - saved > APPLY_ELIGIBILITY_TTL_MS;
}

/** Removes the payload from both stores. Safe to call when neither has it. */
export function clearApplyEligibility(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(APPLY_ELIGIBILITY_KEY);
  } catch {
    /* storage disabled */
  }
  try {
    localStorage.removeItem(APPLY_ELIGIBILITY_KEY);
  } catch {
    /* storage disabled */
  }
}

/**
 * Writes the payload to sessionStorage (the tab that is mid-funnel) and
 * mirrors it to localStorage (a finish-later resume in a new tab), stamping
 * `savedAt` so the mirror can expire.
 */
export function writeApplyEligibility(payload: ApplyEligibilityPayload): void {
  if (typeof window === 'undefined') return;
  const json = JSON.stringify({ ...payload, savedAt: new Date().toISOString() });
  try {
    sessionStorage.setItem(APPLY_ELIGIBILITY_KEY, json);
  } catch {
    /* storage full / disabled */
  }
  try {
    localStorage.setItem(APPLY_ELIGIBILITY_KEY, json);
  } catch {
    /* storage full / disabled */
  }
}

/**
 * Reads the payload: sessionStorage first (this tab's own funnel), then the
 * localStorage mirror. An expired or unparseable payload is DELETED from both
 * stores rather than merely skipped — leaving another student's guardian
 * details sitting on a shared machine is the failure this module exists for.
 */
export function readApplyEligibility(): ApplyEligibilityPayload | null {
  if (typeof window === 'undefined') return null;
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(APPLY_ELIGIBILITY_KEY);
  } catch {
    raw = null;
  }
  if (!raw) {
    try {
      raw = localStorage.getItem(APPLY_ELIGIBILITY_KEY);
    } catch {
      raw = null;
    }
  }
  if (!raw) return null;

  let parsed: ApplyEligibilityPayload;
  try {
    parsed = JSON.parse(raw) as ApplyEligibilityPayload;
  } catch {
    clearApplyEligibility();
    return null;
  }
  if (!parsed || typeof parsed !== 'object') {
    clearApplyEligibility();
    return null;
  }
  if (isExpired(parsed)) {
    clearApplyEligibility();
    return null;
  }
  return parsed;
}

/**
 * Reads the payload ONLY when it belongs to the person now typing.
 *
 * A payload that belongs to somebody else is cleared, not just ignored: the
 * next reader on this machine must not find it either.
 */
export function readApplyEligibilityForEmail(
  typedEmail: string | null | undefined
): ApplyEligibilityPayload | null {
  const payload = readApplyEligibility();
  if (!payload) return null;
  if (!eligibilityPayloadMatchesEmail(payload, typedEmail)) {
    clearApplyEligibility();
    return null;
  }
  return payload;
}
