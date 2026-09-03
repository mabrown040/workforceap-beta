/**
 * Community Ambassador referral matching (pure helpers, no DB).
 *
 * Applicants name the ambassador who sent them under "How did you hear about
 * WorkforceAP?" ("Community Ambassador (write in)" + a name) or in the optional
 * "Partner or community ambassador referral" field. These helpers turn that
 * free text into a unique match against the active Community Ambassador
 * counselors so the student can be assigned automatically (9/3/26 follow-up to
 * the 9/2 change list, issue 10).
 */

import {
  APPLY_HEAR_ABOUT_AMBASSADOR,
  hearAboutSuggestsAmbassador,
} from '@/lib/apply/eligibilityExtendedFields';
import { REFERRAL_SOURCE_COMMUNITY_AMBASSADOR } from '@/lib/referralSources';

export type AmbassadorCandidate = {
  counselorId: string;
  userId: string;
  fullName: string | null;
  email: string | null;
};

export type AmbassadorMatch =
  | { ok: true; candidate: AmbassadorCandidate; matchedOn: 'email' | 'name' }
  | { ok: false; reason: 'no_referral_text' | 'no_match' | 'ambiguous'; text?: string };

/**
 * The text an applicant used to name their ambassador, or null when the
 * answers do not point at an ambassador at all.
 */
export function pickAmbassadorReferralText(input: {
  hearAbout?: string | null;
  hearAboutOther?: string | null;
  partnerAmbassadorReferral?: string | null;
}): string | null {
  const explicit = input.partnerAmbassadorReferral?.trim();
  if (explicit) return explicit;

  const hearAbout = input.hearAbout?.trim() ?? '';
  const other = input.hearAboutOther?.trim() ?? '';
  const pointsAtAmbassador =
    hearAbout === REFERRAL_SOURCE_COMMUNITY_AMBASSADOR ||
    hearAbout === APPLY_HEAR_ABOUT_AMBASSADOR ||
    hearAboutSuggestsAmbassador(hearAbout);
  if (pointsAtAmbassador && other) return other;
  return null;
}

export function normalizePersonName(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9@.\s]/g, ' ')
    // Keep dots only inside email-like tokens; a trailing "Garcia." is a name.
    .replace(/(^|\s)[.@]+|[.@]+(?=\s|$)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolve free text to exactly one ambassador. An email in the text wins;
 * otherwise the full name must match case/accent-insensitively. Anything that
 * matches zero or several ambassadors is left for staff — never guess.
 */
export function matchAmbassador(
  text: string | null | undefined,
  candidates: readonly AmbassadorCandidate[],
): AmbassadorMatch {
  const normalized = normalizePersonName(text);
  if (!normalized) return { ok: false, reason: 'no_referral_text' };

  const emailInText = normalized.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/)?.[0];
  if (emailInText) {
    const byEmail = candidates.filter((c) => (c.email ?? '').toLowerCase() === emailInText);
    if (byEmail.length === 1) return { ok: true, candidate: byEmail[0], matchedOn: 'email' };
  }

  const byName = candidates.filter((c) => {
    const name = normalizePersonName(c.fullName);
    return name.length > 0 && name === normalized;
  });
  if (byName.length === 1) return { ok: true, candidate: byName[0], matchedOn: 'name' };
  if (byName.length > 1) return { ok: false, reason: 'ambiguous', text: normalized };
  return { ok: false, reason: 'no_match', text: normalized };
}
