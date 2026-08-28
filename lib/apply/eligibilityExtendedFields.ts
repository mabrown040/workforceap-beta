/**
 * Extended apply-flow eligibility fields (WS4).
 *
 * Kept separate from primaryBarrierOptions so barrier multi-select stays stable
 * while ops can collect discrete unemployment / benefits / attribution answers.
 * School / CHS paths skip these (see ApplyEligibilityClient + signup route).
 */

import { PUBLIC_REFERRAL_SOURCE_OPTIONS } from '@/lib/referralSources';

export const YES_NO = ['yes', 'no'] as const;
export type YesNo = (typeof YES_NO)[number];

/** Hear-about options for the public apply screener (adult / paid paths). */
export const APPLY_HEAR_ABOUT_OPTIONS = [
  ...PUBLIC_REFERRAL_SOURCE_OPTIONS,
  'Partner or community ambassador',
] as const;

export type ApplyHearAboutOption = (typeof APPLY_HEAR_ABOUT_OPTIONS)[number];

export const APPLY_HEAR_ABOUT_OTHER = 'Other / write in';
export const APPLY_HEAR_ABOUT_AMBASSADOR = 'Partner or community ambassador';

export const APPLY_PARTNER_OTHER = 'Other Partner (write in)';
export const APPLY_PARTNER_AMBASSADOR_WRITE_IN = 'Community Ambassador (write in)';

/** Dedicated partner / ambassador choices requested for the public application. */
export const APPLY_PARTNER_REFERRAL_OPTIONS = [
  'Launch Pad Job Club',
  'Purpose Works / Job Seekers Network',
  'Workforce Solutions Capital Area',
  'Workforce Solutions Rural Capital Area',
  APPLY_PARTNER_OTHER,
  APPLY_PARTNER_AMBASSADOR_WRITE_IN,
] as const;

export type ApplyPartnerReferralOption = (typeof APPLY_PARTNER_REFERRAL_OPTIONS)[number];

export function isYesNo(value: unknown): value is YesNo {
  return value === 'yes' || value === 'no';
}

export function normalizeYesNo(value: unknown): YesNo | null {
  if (isYesNo(value)) return value;
  return null;
}

export function normalizeHearAbout(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 200);
}

export function hearAboutNeedsOther(hearAbout: string | null | undefined): boolean {
  return (hearAbout ?? '') === APPLY_HEAR_ABOUT_OTHER || (hearAbout ?? '').toLowerCase() === 'other';
}

export function hearAboutSuggestsAmbassador(hearAbout: string | null | undefined): boolean {
  const v = (hearAbout ?? '').toLowerCase();
  return v.includes('ambassador') || v.includes('partner');
}

export function partnerReferralNeedsWriteIn(selected: string | null | undefined): boolean {
  return selected === APPLY_PARTNER_OTHER || selected === APPLY_PARTNER_AMBASSADOR_WRITE_IN;
}

/**
 * Convert the existing single stored field into dropdown state.
 *
 * Older drafts may contain unrestricted text. Keep that text available by
 * restoring it through the generic partner write-in instead of dropping it.
 */
export function parsePartnerAmbassadorReferral(stored: string | null | undefined): {
  selected: string;
  writeIn: string;
} {
  const raw = (stored ?? '').trim();
  if (!raw) return { selected: '', writeIn: '' };

  const options = APPLY_PARTNER_REFERRAL_OPTIONS as readonly string[];
  if (options.includes(raw) && !partnerReferralNeedsWriteIn(raw)) {
    return { selected: raw, writeIn: '' };
  }

  for (const prefix of [APPLY_PARTNER_OTHER, APPLY_PARTNER_AMBASSADOR_WRITE_IN] as const) {
    if (raw === prefix) return { selected: prefix, writeIn: '' };
    const taggedPrefix = `${prefix}:`;
    if (raw.startsWith(taggedPrefix)) {
      return { selected: prefix, writeIn: raw.slice(taggedPrefix.length).trim() };
    }
  }

  return { selected: APPLY_PARTNER_OTHER, writeIn: raw };
}

/** Preserve the API's existing single-string storage contract (maximum 200 characters). */
export function formatPartnerAmbassadorReferral(selected: string, writeIn: string): string {
  const normalizedSelection = selected.trim();
  if (!normalizedSelection) return '';
  if (!partnerReferralNeedsWriteIn(normalizedSelection)) {
    return normalizedSelection.slice(0, 200);
  }

  const normalizedWriteIn = writeIn.trim();
  if (normalizedSelection === APPLY_PARTNER_OTHER && normalizedWriteIn) {
    return normalizedWriteIn.slice(0, 200);
  }
  const value = normalizedWriteIn
    ? `${normalizedSelection}: ${normalizedWriteIn}`
    : normalizedSelection;
  return value.slice(0, 200);
}

export function partnerReferralWriteInMaxLength(selected: string): number {
  return selected === APPLY_PARTNER_AMBASSADOR_WRITE_IN
    ? 200 - selected.length - 2
    : 200;
}

/**
 * Layoff / last-employer company field visibility.
 *
 * Always shown in the adult eligibility block (apply, member dashboard, /q
 * token forms). Ops (Mike) expects this question alongside unemployment /
 * SNAP / hear-about — not gated behind a prior "yes", which hid it on first
 * load and made the form look incomplete.
 *
 * Input is retained for call-site compatibility; unemployment answers no
 * longer gate visibility.
 */
export function layoffCompanyApplicable(_input: {
  unemployedOrUnderemployed: YesNo | null;
  receivingUnemployment: YesNo | null;
  exhaustedUnemployment: YesNo | null;
}): boolean {
  return true;
}
