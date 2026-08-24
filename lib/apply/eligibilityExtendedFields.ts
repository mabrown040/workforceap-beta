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

export const APPLY_HEAR_ABOUT_OTHER = 'Other / call in';
export const APPLY_HEAR_ABOUT_AMBASSADOR = 'Partner or community ambassador';

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

/** Show layoff company when employment / UI questions indicate it may apply. */
export function layoffCompanyApplicable(input: {
  unemployedOrUnderemployed: YesNo | null;
  receivingUnemployment: YesNo | null;
  exhaustedUnemployment: YesNo | null;
}): boolean {
  return (
    input.unemployedOrUnderemployed === 'yes' ||
    input.receivingUnemployment === 'yes' ||
    input.exhaustedUnemployment === 'yes'
  );
}
