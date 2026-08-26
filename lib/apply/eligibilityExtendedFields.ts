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

export const APPLY_HEAR_ABOUT_OTHER = 'Other / write in';
export const APPLY_HEAR_ABOUT_AMBASSADOR = 'Partner or community ambassador';

/**
 * Grouped hear-about list for the public apply screener.
 * Partners Dad named for the 8/24/2026 adjustments sit first so the opened
 * menu is visibly populated (native <select> closed state only shows the placeholder).
 */
export const APPLY_HEAR_ABOUT_GROUPS = [
  {
    label: 'Partners & workforce centers',
    options: [
      'Launch Pad Job Club',
      'Purpose Works / Job Seekers Network',
      'Workforce Solutions Capital Area',
      'Workforce Solutions Rural Capital Area',
      'Texas Workforce Commission (TWC)',
    ],
  },
  {
    label: 'Community organizations',
    options: [
      'Austin Area Urban League',
      'African American Youth Harvest Foundation',
      '211 Texas',
      'Community organization',
      'Church or faith community',
    ],
  },
  {
    label: 'Other sources',
    options: [
      'Flyer or brochure',
      'Friend or family',
      'Google / web search',
      'Social media',
      'WorkforceAP counselor or team member',
      APPLY_HEAR_ABOUT_AMBASSADOR,
      APPLY_HEAR_ABOUT_OTHER,
    ],
  },
] as const;

/** Hear-about options for the public apply screener (adult / paid paths). */
export const APPLY_HEAR_ABOUT_OPTIONS = APPLY_HEAR_ABOUT_GROUPS.flatMap(
  (group) => group.options,
);

export type ApplyHearAboutOption = (typeof APPLY_HEAR_ABOUT_OPTIONS)[number];

export const APPLY_PARTNER_OTHER = 'Other Partner (write in)';
export const APPLY_PARTNER_AMBASSADOR_WRITEIN = 'Community Ambassador (write in)';

/** Partner / ambassador dropdown from the 8/24/2026 website-adjustments doc. */
export const APPLY_PARTNER_REFERRAL_OPTIONS = [
  'Launch Pad Job Club',
  'Purpose Works / Job Seekers Network',
  'Workforce Solutions Capital Area',
  'Workforce Solutions Rural Capital Area',
  APPLY_PARTNER_OTHER,
  APPLY_PARTNER_AMBASSADOR_WRITEIN,
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
  return v.includes('ambassador') || v.includes('partner') || v.includes('launch pad') || v.includes('purpose works');
}

export function partnerReferralNeedsWriteIn(selected: string | null | undefined): boolean {
  return selected === APPLY_PARTNER_OTHER || selected === APPLY_PARTNER_AMBASSADOR_WRITEIN;
}

export function parsePartnerAmbassadorReferral(stored: string | null | undefined): {
  selected: string;
  writeIn: string;
} {
  const raw = (stored ?? '').trim();
  if (!raw) return { selected: '', writeIn: '' };
  const named = APPLY_PARTNER_REFERRAL_OPTIONS as readonly string[];
  if (named.includes(raw) && !partnerReferralNeedsWriteIn(raw)) {
    return { selected: raw, writeIn: '' };
  }
  for (const prefix of [APPLY_PARTNER_OTHER, APPLY_PARTNER_AMBASSADOR_WRITEIN] as const) {
    if (raw === prefix) return { selected: prefix, writeIn: '' };
    const withColon = `${prefix}:`;
    if (raw.startsWith(withColon)) {
      return { selected: prefix, writeIn: raw.slice(withColon.length).trim() };
    }
  }
  return { selected: APPLY_PARTNER_OTHER, writeIn: raw };
}

export function formatPartnerAmbassadorReferral(selected: string, writeIn: string): string {
  const sel = selected.trim();
  if (!sel) return '';
  if (partnerReferralNeedsWriteIn(sel)) {
    const extra = writeIn.trim();
    return extra ? `${sel}: ${extra}` : sel;
  }
  return sel;
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

/** Every public referral source still appears in the apply hear-about menu. */
export function applyHearAboutCoversPublicSources(): boolean {
  const apply = new Set<string>(APPLY_HEAR_ABOUT_OPTIONS);
  return PUBLIC_REFERRAL_SOURCE_OPTIONS.every((source) => apply.has(source));
}
